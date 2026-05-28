import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { requiredEnv } from '../env';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization || '';
    const [, token] = header.match(/^Bearer (.+)$/) || [];
    if (!token) throw new UnauthorizedException('Missing bearer token');
    try {
      request.user = await this.jwt.verifyAsync(token, {
        secret: requiredEnv('JWT_SECRET')
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid bearer token');
    }
  }
}
