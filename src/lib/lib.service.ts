import { Injectable } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';

@Injectable()
export class LibService {
  getTokens(payload: any) {
    return {
      accessToken: sign(payload, process.env.ACCESS_TOKEN, {
        expiresIn: '30d',
      }),
      refreshToken: sign(payload, process.env.REFRESH_TOKEN, {
        expiresIn: '30d',
      }),
    };
  }

  verifyToken(token: string, secret: string) {
    return verify(token, secret);
  }
}
