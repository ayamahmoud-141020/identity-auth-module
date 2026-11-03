import { type PasswordHasher } from '../../src/modules/identity/domain/ports';
import { PasswordHash, type PlainPassword } from '../../src/modules/identity/domain/value-objects';

/** Reversible "hash" for tests; records verify calls so timing-equalization can be asserted. */
export class FakePasswordHasher implements PasswordHasher {
  readonly verifyCalls: { hadHash: boolean }[] = [];

  hash(password: PlainPassword): Promise<PasswordHash> {
    return Promise.resolve(PasswordHash.fromString(`hashed:${password.reveal()}`));
  }

  verify(hash: PasswordHash | null, candidate: string): Promise<boolean> {
    this.verifyCalls.push({ hadHash: hash !== null });
    return Promise.resolve(hash !== null && hash.value === `hashed:${candidate}`);
  }
}
