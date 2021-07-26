import { TokenPayload } from '@cl/types';
import { UserModel } from 'cl-models';
import * as config from 'config';
import * as jwt from 'jsonwebtoken';

const tokenSecret = config.get('jwt.key') as string;
const tokenOpts = config.get('jwt.opts');

export function createToken(user: UserModel): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    teacherId: user.teacherId || null,
    isAdmin: user.isAdmin,
    isOps: user.isOps
  };

  return jwt.sign(payload, tokenSecret, tokenOpts);
}

export function decodeToken(token: string): TokenPayload {
  return jwt.verify(token, tokenSecret) as TokenPayload;
}
