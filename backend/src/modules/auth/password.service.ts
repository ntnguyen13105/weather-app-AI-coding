import { Injectable } from '@nestjs/common';
import { hash, verify, argon2id } from 'argon2';

@Injectable()
export class PasswordService {
  hash(password: string) {
    return hash(password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }
  verify(encoded: string, password: string) {
    return verify(encoded, password);
  }
}
