import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, HttpCode, HttpStatus, Injectable, Logger, Module, Post, Req, Res, UnauthorizedException, CanActivate, ExecutionContext, UseGuards, ServiceUnavailableException } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { randomBytes, createHash, timingSafeEqual, createCipheriv, createDecipheriv } from 'node:crypto';
import * as argon2 from 'argon2';
import { generateSecret, generateURI, verify } from 'otplib';
import { PrismaService } from '../../database/prisma.module.js';
import { isAllowedWebOrigin } from '../../config/web-origin.js';
import { MailService } from './mail.service.js';

class RegisterDto { @IsEmail() @MaxLength(254) email!: string; @IsString() @MinLength(14) @MaxLength(128) password!: string; }
class ResendVerificationDto { @IsEmail() @MaxLength(254) email!: string; }
class LoginDto { @IsEmail() @MaxLength(254) email!: string; @IsString() @MinLength(14) @MaxLength(128) password!: string; @IsOptional() @IsString() @Length(6, 32) code?: string; }
class MfaSetupDto { @IsString() @MinLength(14) @MaxLength(128) password!: string; }
class MfaEnableDto extends MfaSetupDto { @IsString() @Length(6, 8) code!: string; }
class VerificationDto { @IsString() @Length(20, 100) token!: string; }

@Injectable()
class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(private readonly db: PrismaService, private readonly mail: MailService) {}
  private readonly dummyPasswordHash = argon2.hash('motif-invalid-credential-sentinel', { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private get sessionCookie() { return process.env.NODE_ENV === 'production' ? '__Host-motif_session' : 'motif_session'; }
  private verificationOrigin() {
    const configured = process.env.WEB_ORIGIN;
    if (!configured) throw new ServiceUnavailableException('WEB_ORIGIN must be set');
    let origin: URL;
    try {
      origin = new URL(configured);
    } catch {
      throw new ServiceUnavailableException('WEB_ORIGIN must be a valid site origin');
    }
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash || !['http:', 'https:'].includes(origin.protocol) || (process.env.NODE_ENV === 'production' && origin.protocol !== 'https:')) {
      throw new ServiceUnavailableException('WEB_ORIGIN must be an HTTPS origin in production');
    }
    return origin;
  }
  private verificationUrl(token: string) {
    const url = new URL('/verification', this.verificationOrigin());
    url.hash = new URLSearchParams({ token }).toString();
    return url.toString();
  }
  private mfaKey() {
    const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY ?? '', 'base64');
    if (key.length !== 32) throw new ServiceUnavailableException('MFA_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
    return key;
  }
  private encryptMfaSecret(secret: string) {
    const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', this.mfaKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
  }
  private decryptMfaSecret(value: string) {
    const [version, iv, tag, ciphertext] = value.split('.');
    if (version !== 'v1' || !iv || !tag || !ciphertext) throw new ServiceUnavailableException('MFA secret format is invalid');
    const decipher = createDecipheriv('aes-256-gcm', this.mfaKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  }
  async register(email: string, password: string) {
    if (!this.mail.isConfigured) throw new ServiceUnavailableException('La livraison des e-mails n’est pas configurée.');
    const normalized = email.trim().toLowerCase();
    if (await this.db.user.findUnique({ where: { email: normalized } })) throw new ConflictException('Inscription impossible. Connectez-vous ou demandez un nouveau lien de confirmation.');
    const rawToken = randomBytes(32).toString('base64url');
    const user = await this.db.user.create({ data: { email: normalized, passwordHash: await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }), verificationTokens: { create: { tokenHash: this.hash(rawToken), expiresAt: new Date(Date.now() + 30 * 60_000) } } } });
    try {
      await this.mail.sendVerificationEmail(normalized, this.verificationUrl(rawToken));
    } catch {
      try {
        await this.db.user.deleteMany({
          where: {
            id: user.id,
            emailVerifiedAt: null,
            verificationTokens: { some: { tokenHash: this.hash(rawToken), consumedAt: null } },
          },
        });
      } catch {
        this.logger.error('Unable to clean up an unverified account after email delivery failed');
      }
      throw new ServiceUnavailableException('Impossible d’envoyer l’e-mail de vérification. Réessayez plus tard.');
    }
    return { id: user.id, email: user.email, verification: 'pending' };
  }
  async resendVerification(email: string) {
    if (!this.mail.isConfigured) throw new ServiceUnavailableException('La livraison des e-mails n’est pas configurée.');
    const normalized = email.trim().toLowerCase();
    const user = await this.db.user.findUnique({ where: { email: normalized }, select: { id: true, email: true, emailVerifiedAt: true } });
    if (user && !user.emailVerifiedAt) {
      const rawToken = randomBytes(32).toString('base64url');
      const now = new Date();
      await this.db.$transaction(async (tx) => {
        await tx.verificationToken.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: now } });
        await tx.verificationToken.create({ data: { userId: user.id, tokenHash: this.hash(rawToken), expiresAt: new Date(now.getTime() + 30 * 60_000) } });
      });
      try {
        await this.mail.sendVerificationEmail(user.email, this.verificationUrl(rawToken));
      } catch {
        this.logger.warn('Verification email could not be resent');
      }
    }
    return { message: 'Si un compte en attente correspond à cette adresse, un nouveau lien a été envoyé. Sinon, essayez de vous connecter.' };
  }
  async login(email: string, password: string, code: string | undefined, req: Request, res: Response) {
    const user = await this.db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    const passwordHash = user?.passwordHash ?? await this.dummyPasswordHash;
    const validPassword = await argon2.verify(passwordHash, password).catch(() => false);
    if (!user || !validPassword || !user.emailVerifiedAt) throw new UnauthorizedException('Identifiants invalides');
    if (user.mfaEnabledAt) {
      if (!code) throw new UnauthorizedException('Identifiants invalides');
      const totpValid = await verify({ token: code, secret: this.decryptMfaSecret(user.mfaSecret!) }).then((result) => result.valid).catch(() => false);
      if (!totpValid) {
        const recovery = await this.db.recoveryCode.findMany({ where: { userId: user.id, usedAt: null } });
        let match: (typeof recovery)[number] | undefined;
        for (const item of recovery) {
          if (await argon2.verify(item.codeHash, code.replaceAll('-', '').toUpperCase()).catch(() => false)) { match = item; break; }
        }
        if (!match) throw new UnauthorizedException('Identifiants invalides');
        const consumed = await this.db.recoveryCode.updateMany({ where: { id: match.id, usedAt: null }, data: { usedAt: new Date() } });
        if (consumed.count !== 1) throw new UnauthorizedException('Identifiants invalides');
      }
    }
    const raw = randomBytes(32).toString('base64url');
    const csrf = randomBytes(24).toString('base64url');
    await this.db.session.create({ data: { tokenHash: this.hash(raw), csrfHash: this.hash(csrf), userId: user.id, expiresAt: new Date(Date.now() + 8 * 60 * 60_000) } });
    res.cookie(this.sessionCookie, raw, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60_000 });
    return { authenticated: true, email: user.email, mfaEnabled: Boolean(user.mfaEnabledAt), csrf };
  }
  async current(req: Request) {
    const raw = req.cookies?.[this.sessionCookie]; if (!raw) return { authenticated: false };
    const session = await this.db.session.findUnique({ where: { tokenHash: this.hash(raw) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date()) return { authenticated: false };
    return { authenticated: true, email: session.user.email, mfaEnabled: Boolean(session.user.mfaEnabledAt) };
  }
  async logout(req: Request, res: Response) {
    const raw = req.cookies?.[this.sessionCookie]; if (raw) await this.db.session.deleteMany({ where: { tokenHash: this.hash(raw) } });
    res.clearCookie(this.sessionCookie, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
    return { authenticated: false };
  }
  private async userFor(req: Request) {
    const raw = req.cookies?.[this.sessionCookie]; if (!raw) throw new UnauthorizedException();
    const session = await this.db.session.findUnique({ where: { tokenHash: this.hash(raw) }, include: { user: true } });
    if (!session || session.expiresAt <= new Date()) throw new UnauthorizedException();
    return session.user;
  }
  async beginMfa(req: Request, password: string) {
    const user = await this.userFor(req);
    if (!await argon2.verify(user.passwordHash, password).catch(() => false)) throw new UnauthorizedException('Mot de passe incorrect');
    if (user.mfaEnabledAt) throw new ConflictException('L’authentification MFA est déjà activée');
    const secret = generateSecret();
    const encryptedSecret = this.encryptMfaSecret(secret);
    await this.db.user.update({ where: { id: user.id }, data: { mfaSecret: encryptedSecret, mfaEnabledAt: null } });
    return { secret, uri: generateURI({ issuer: 'MOTIF', label: user.email, secret }) };
  }
  async enableMfa(req: Request, password: string, code: string) {
    const user = await this.userFor(req);
    if (!await argon2.verify(user.passwordHash, password).catch(() => false)) throw new UnauthorizedException('Mot de passe incorrect');
    if (!user.mfaSecret || !(await verify({ token: code, secret: this.decryptMfaSecret(user.mfaSecret) })).valid) throw new BadRequestException('Code TOTP invalide');
    const plain = Array.from({ length: 10 }, () => randomBytes(5).toString('hex').toUpperCase());
    await this.db.$transaction(async (tx) => {
      await tx.recoveryCode.deleteMany({ where: { userId: user.id, usedAt: null } });
      await tx.recoveryCode.createMany({ data: await Promise.all(plain.map(async (code) => ({ userId: user.id, codeHash: await argon2.hash(code) }))) });
      await tx.user.update({ where: { id: user.id }, data: { mfaEnabledAt: new Date() } });
    });
    return { enabled: true, recoveryCodes: plain };
  }
  async verifyEmail(token: string) {
    if (!token || token.length > 100) throw new BadRequestException();
    const now = new Date();
    const result = await this.db.$transaction(async (tx) => {
      const consumed = await tx.verificationToken.updateMany({ where: { tokenHash: this.hash(token), consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (consumed.count !== 1) {
        const existing = await tx.verificationToken.findUnique({ where: { tokenHash: this.hash(token) }, select: { user: { select: { emailVerifiedAt: true } } } });
        if (existing?.user.emailVerifiedAt) return { alreadyVerified: true };
        throw new BadRequestException('Lien invalide ou expiré');
      }
      const tokenRecord = await tx.verificationToken.findUniqueOrThrow({ where: { tokenHash: this.hash(token) } });
      await tx.user.update({ where: { id: tokenRecord.userId }, data: { emailVerifiedAt: now } });
      return { alreadyVerified: false };
    });
    return { verified: true, alreadyVerified: result.alreadyVerified };
  }
}

@Injectable()
class AuthCsrfGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const expectedOrigin = process.env.WEB_ORIGIN;
    const sessionToken = req.cookies?.[process.env.NODE_ENV === 'production' ? '__Host-motif_session' : 'motif_session'];
    const token = req.headers['x-csrf-token'];
    if (!expectedOrigin || !isAllowedWebOrigin(req.headers.origin) || typeof sessionToken !== 'string' || typeof token !== 'string') throw new ForbiddenException('Requête refusée');
    const session = await this.db.session.findUnique({ where: { tokenHash: createHash('sha256').update(sessionToken).digest('hex') } });
    const actualHash = createHash('sha256').update(token).digest();
    const expectedHash = session ? Buffer.from(session.csrfHash, 'hex') : Buffer.alloc(actualHash.length);
    if (!session || session.expiresAt <= new Date() || !timingSafeEqual(actualHash, expectedHash)) throw new ForbiddenException('Requête refusée');
    return true;
  }
}

class SameOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!isAllowedWebOrigin(req.headers.origin) || !req.is('application/json')) throw new ForbiddenException('Requête refusée');
    return true;
  }
}

@Controller('auth')
class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') @UseGuards(SameOriginGuard) @Throttle({ default: { limit: 3, ttl: 60000 } }) register(@Body() dto: RegisterDto) { return this.auth.register(dto.email, dto.password); }
  @Post('resend-verification') @UseGuards(SameOriginGuard) @Throttle({ default: { limit: 3, ttl: 60000 } }) resendVerification(@Body() dto: ResendVerificationDto) { return this.auth.resendVerification(dto.email); }
  @Post('verify-email') @UseGuards(SameOriginGuard) @Throttle({ default: { limit: 5, ttl: 60000 } }) verify(@Body() dto: VerificationDto) { return this.auth.verifyEmail(dto.token); }
  @Post('login') @UseGuards(SameOriginGuard) @Throttle({ default: { limit: 5, ttl: 60000 } }) @HttpCode(HttpStatus.OK) login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.login(dto.email, dto.password, dto.code, req, res); }
  @Post('session') @HttpCode(HttpStatus.OK) session(@Req() req: Request) { return this.auth.current(req); }
  @Post('logout') @UseGuards(AuthCsrfGuard) @HttpCode(HttpStatus.OK) logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.logout(req, res); }
  @Post('mfa/setup') @UseGuards(AuthCsrfGuard) setup(@Req() req: Request, @Body() dto: MfaSetupDto) { return this.auth.beginMfa(req, dto.password); }
  @Post('mfa/enable') @UseGuards(AuthCsrfGuard) enable(@Req() req: Request, @Body() dto: MfaEnableDto) { return this.auth.enableMfa(req, dto.password, dto.code); }
}

@Module({ controllers: [AuthController], providers: [AuthService, AuthCsrfGuard, MailService] })
export class AuthModule {}
