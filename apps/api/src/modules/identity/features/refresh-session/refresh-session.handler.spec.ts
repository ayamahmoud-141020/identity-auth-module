import { type EventBus } from '@nestjs/cqrs';
import { FakePasswordHasher } from '../../../../../test/fakes/fake-password-hasher';
import { FakeTokenIssuer } from '../../../../../test/fakes/fake-token-issuer';
import { InMemoryUserRepository } from '../../../../../test/fakes/in-memory-user.repository';
import { InvalidRefreshTokenError, RefreshTokenReusedError } from '../../domain/errors';
import { SignUpCommand } from '../sign-up/sign-up.command';
import { SignUpHandler } from '../sign-up/sign-up.handler';
import { RefreshSessionCommand } from './refresh-session.command';
import { RefreshSessionHandler } from './refresh-session.handler';

async function setup() {
  const users = new InMemoryUserRepository();
  const tokens = new FakeTokenIssuer();
  const eventBus = { publishAll: () => undefined } as unknown as EventBus;
  const signedUp = await new SignUpHandler(
    users,
    new FakePasswordHasher(),
    tokens,
    eventBus,
  ).execute(new SignUpCommand('jane@example.com', 'Jane', 'Secret1!x'));
  return { users, tokens, signedUp, handler: new RefreshSessionHandler(users, tokens) };
}

describe('RefreshSessionHandler', () => {
  it('rotates: returns a new refresh token and invalidates the previous one', async () => {
    const { handler, signedUp, users } = await setup();
    const first = await handler.execute(new RefreshSessionCommand(signedUp.refreshToken.token));
    expect(first.refreshToken.token).not.toBe(signedUp.refreshToken.token);
    const stored = await users.findById(signedUp.user.id);
    expect(stored?.currentSession?.refreshTokenHash).toBe(first.refreshToken.hash);
  });

  it('detects reuse of a rotated token, revokes the session, and the newest token stops working too', async () => {
    const { handler, signedUp, users } = await setup();
    const rotated = await handler.execute(new RefreshSessionCommand(signedUp.refreshToken.token));

    await expect(
      handler.execute(new RefreshSessionCommand(signedUp.refreshToken.token)),
    ).rejects.toBeInstanceOf(RefreshTokenReusedError);
    expect((await users.findById(signedUp.user.id))?.currentSession).toBeNull();
    await expect(
      handler.execute(new RefreshSessionCommand(rotated.refreshToken.token)),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);
  });

  it.each([undefined, '', 'garbage', JSON.stringify({ userId: 'ghost', sessionId: 's' })])(
    'rejects %p',
    async (token) => {
      const { handler } = await setup();
      await expect(handler.execute(new RefreshSessionCommand(token))).rejects.toBeInstanceOf(
        InvalidRefreshTokenError,
      );
    },
  );
});
