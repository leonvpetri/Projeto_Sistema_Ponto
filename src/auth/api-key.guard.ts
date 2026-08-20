import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey: string | undefined = request.headers['x-api-key'];
    const expected = process.env.N8N_WEBHOOK_SECRET;

    if (!expected) {
      throw new UnauthorizedException('N8N_WEBHOOK_SECRET não configurado no servidor');
    }
    if (!apiKey || !safeEqual(apiKey, expected)) {
      throw new UnauthorizedException('API key inválida');
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
