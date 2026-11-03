import { type EventBus } from '@nestjs/cqrs';
import { FakePasswordHasher } from '../../../../../test/fakes/fake-password-hasher';
import { FakeTokenIssuer } from '../../../../../test/fakes/fake-token-issuer';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository';
import { EmailAlreadyInUseError, ValidationError } from '../../domain/errors';
import { UserRegisteredEvent } from '../../domain/events/user-registered.event';
import { SignUpCommand } from './sign-up.command';
import { SignUpHandler } from './sign-up.handler';

function setup() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenIssuer();
  const published: unknown[] = [];
  const eventBus = {
    publishAll: (events: unknown[]) => published.push(...events),
  } as unknown as EventBus;
  const handler = new SignUpHandler(users, hasher, tokens, eventBus);
  return { users, hasher, tokens, published, handler };
}

describe('SignUpHandler', () => {
  it('creates the user, starts a session, returns tokens and publishes UserRegistered', async () => {
    const { handler, users, published } = setup();

    const result = await handler.execute(
      new SignUpCommand(' Jane@Example.com ', 'Jane', 'Secret1!x'),
    );

    expect(result.user).toMatchObject({ email: 'jane@example.com', name: 'Jane' });
    expect(result.accessToken).toBe(`access:${result.user.id}:jane@example.com`);
    expect(result.refreshToken.token).toContain(result.user.id);
    expect(users.size).toBe(1);
    const stored = await users.findById(result.user.id);
    expect(stored?.currentSession?.refreshTokenHash).toBe(result.refreshToken.hash);
    expect(published).toHaveLength(1);
    expect(published[0]).toBeInstanceOf(UserRegisteredEvent);
  });

  it('never exposes the password hash in the result', async () => {
    const { handler } = setup();
    const result = await handler.execute(new SignUpCommand('a@b.co', 'Jane', 'Secret1!x'));
    expect(JSON.stringify(result)).not.toContain('hashed:');
  });

  it('rejects a duplicate email with EmailAlreadyInUseError and publishes nothing', async () => {
    const { handler, published } = setup();
    await handler.execute(new SignUpCommand('a@b.co', 'Jane', 'Secret1!x'));
    published.length = 0;

    await expect(
      handler.execute(new SignUpCommand('A@B.CO', 'John', 'Other2!y')),
    ).rejects.toBeInstanceOf(EmailAlreadyInUseError);
    expect(published).toHaveLength(0);
  });

  it('enforces the field rules in the domain even if request validation were bypassed', async () => {
    const { handler, users } = setup();
    await expect(
      handler.execute(new SignUpCommand('a@b.co', 'Jo', 'Secret1!x')),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      handler.execute(new SignUpCommand('a@b.co', 'Jane', 'short1!')),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(users.size).toBe(0);
  });
});
