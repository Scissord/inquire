import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from './jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);

export const CurrentAccessToken = createParamDecorator<
  unknown,
  string | undefined
>((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx
    .switchToHttp()
    .getRequest<{ headers?: Record<string, string>; accessToken?: string }>();
  return request.accessToken;
});
