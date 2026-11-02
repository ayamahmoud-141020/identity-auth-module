import { type EventBus } from '@nestjs/cqrs';
import { FakePasswordHasher } from '../../../../../test/fakes/fake-password-hasher';
import { FakeTokenIssuer } from '../../../../../test/fakes/fake-token-issuer';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository';
import { SignUpCommand } from '../sign-up/sign-up.command';
import { SignUpHandler } from '../sign-up/sign-up.handler';
import { SignOutCommand } from './sign-out.command';
import { SignOutHandler } from './sign-out.handler';

describe('SignOutHandler', () => {
  it('revokes the current session and tolerates missing or bogus tokens', async () => {
    const users = new InMemoryUserRepository();
    const tokens = new FakeTokenIssuer();
    const eventBus = { publishAll: () => undefined } as unknown as EventBus;
    const signedUp = await new SignUpHandler(
      users,
      new FakePasswordHasher(),
      tokens,
      eventBus,
    ).execute(new SignUpCommand('jane@example.com', 'Jane', 'Secret1!x'));
    const handler = new SignOutHandler(users, tokens);

    await expect(handler.execute(new SignOutCommand(undefined))).resolves.toBeUndefined();
    await expect(handler.execute(new SignOutCommand('garbage'))).resolves.toBeUndefined();
    expect((await users.findById(signedUp.user.id))?.currentSession).not.toBeNull();

    await handler.execute(new SignOutCommand(signedUp.refreshToken.token));
    expect((await users.findById(signedUp.user.id))?.currentSession).toBeNull();
  });
});
