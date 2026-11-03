import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { type PasswordHasher } from '../../domain/ports';
import { PasswordHash, type PlainPassword } from '../../domain/value-objects';

// OWASP-recommended minimum for argon2id: 19 MiB memory, 2 iterations, 1 lane.
const OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} satisfies argon2.HashOptions;

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  /** Hash of a random secret, verified against when the user is unknown (timing equalization). */
  private readonly dummyHash: Promise<string> = argon2.hash(
    randomBytes(32).toString('hex'),
    OPTIONS,
  );

  async hash(password: PlainPassword): Promise<PasswordHash> {
    return PasswordHash.fromString(await argon2.hash(password.reveal(), OPTIONS));
  }

  async verify(hash: PasswordHash | null, candidate: string): Promise<boolean> {
    const target = hash?.value ?? (await this.dummyHash);
    try {
      const matches = await argon2.verify(target, candidate);
      return hash !== null && matches;
    } catch {
      return false;
    }
  }
}
