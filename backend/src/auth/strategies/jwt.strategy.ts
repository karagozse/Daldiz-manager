import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request & { tenant?: { tenantId: string } }, payload: any) {
    if (!req.tenant) {
      throw new UnauthorizedException();
    }
    if (payload.tenantId !== req.tenant.tenantId) {
      throw new ForbiddenException('Tenant mismatch');
    }
    const user = await this.authService.validateUserByIdAndTenant(
      payload.sub,
      req.tenant.tenantId,
    );
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
