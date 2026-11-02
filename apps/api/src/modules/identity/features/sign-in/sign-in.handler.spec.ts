import { type EventBus } from '@nestjs/cqrs';
import { FakePasswordHasher } from '../../../../../test/fakes/fake-password-hasher';
import { FakeTokenIssuer } from '../../../../../test/fakes/fake-token-issuer';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository';
import { InvalidCredentialsError } from '../../domain/errors';
import { SignUpCommand } from '../sign-up/sign-up.command';
import { SignUpHandler } from '../sign-up/sign-up.handler';
import { SignInCommand } from './sign-in.command';
import { SignInHandler } from './sign-in.handler';

async function setup() {
  const users = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const tokens = new FakeTokenIssuer();
  const eventBus = { publishAll: () => undefined } as unknown as EventBus;
  const signedUp = await new SignUpHandler(users, hasher, tokens, eventBus).execute(
    new SignUpCommand('jane@example.com', 'Jane', 'Secret1!x'),
  );
  hasher.verifyCalls.length = 0;
  return { users, hasher, tokens, signedUp, handler: new SignInHandler(users, hasher, tokens) };
}

describe('SignInHandler', () => {
  it('signs in with correct credentials and replaces the previous session', async () => {
    const { handler, users, signedUp } = await setup();

    const result = await handler.execute(new SignInCommand('JANE@example.com', 'Secret1!x'));

    expect(result.user.id).toBe(signedUp.user.id);
    expect(result.refreshToken.hash).not.toBe(signedUp.refreshToken.hash);
    const stored = await users.findById(result.user.id);
    expect(stored?.currentSession?.refreshTokenHash).toBe(result.refreshToken.hash);
  });

  it('fails with the same error for a wrong password and for an unknown email', async () => {
    const { handler } = await setup();
    const wrongPassword = handler.execute(new SignInCommand('jane@example.com', 'Wrong1!xx'));
    const unknownEmail = handler.execute(new SignInCommand('nobody@example.com', 'Secret1!x'));

    await expect(wrongPassword).rejects.toBeInstanceOf(InvalidCredentialsError);
    await expect(unknownEmail).rejects.toBeInstanceOf(InvalidCredentialsError);
    const [a, b] = await Promise.all([
      wrongPassword.catch((e: Error) => e.message),
      unknownEmail.catch((e: Error) => e.message),
    ]);
    expect(a).toBe(b);
  });

  it('still runs password verification when the email is unknown (timing equalization)', async () => {
    const { handler, hasher } = await setup();
    await handler
      .execute(new SignInCommand('nobody@example.com', 'Secret1!x'))
      .catch(() => undefined);
    expect(hasher.verifyCalls).toEqual([{ hadHash: false }]);
  });
});
