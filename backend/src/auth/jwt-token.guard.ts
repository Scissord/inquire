import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtTokenGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers?: Record<string, string>; accessToken?: string }>();
    const authHeader = request.headers?.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, '');
    if (!accessToken) {
      throw new UnauthorizedException('Invalid authorization header');
    }

    await this.jwtService.verifyAsync(accessToken);
    request.accessToken = accessToken;
    return true;
  }
}
