import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly transporter: Transporter | null;
  private readonly sender: string | null;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST')?.trim();
    const rawPort = config.get<string>('SMTP_PORT')?.trim();
    const sender = config.get<string>('MAIL_FROM')?.trim();
    const username = config.get<string>('SMTP_USER')?.trim();
    const password = config.get<string>('SMTP_PASS');
    const anySetting = [host, rawPort, sender, username, password].some(Boolean);

    if (!anySetting) {
      this.transporter = null;
      this.sender = null;
      return;
    }

    const port = Number(rawPort);
    if (!host || !Number.isInteger(port) || port < 1 || port > 65_535 || !sender || Boolean(username) !== Boolean(password)) {
      throw new Error('SMTP configuration is incomplete or invalid');
    }

    const secureValue = config.get<string>('SMTP_SECURE')?.trim().toLowerCase();
    if (secureValue && secureValue !== 'true' && secureValue !== 'false') {
      throw new Error('SMTP_SECURE must be true or false');
    }

    const secure = secureValue ? secureValue === 'true' : port === 465;
    const production = config.get<string>('NODE_ENV') === 'production';
    if (production && !secureValue) {
      throw new Error('SMTP_SECURE must be set explicitly in production');
    }
    if (production && !secure && secureValue !== 'false') {
      throw new Error('SMTP_SECURE must enable TLS in production');
    }

    this.sender = sender;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(username && password ? { auth: { user: username, pass: password } } : {}),
      requireTLS: !secure && (production || Boolean(username || password)),
      tls: { rejectUnauthorized: true },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  get isConfigured() {
    return this.transporter !== null && this.sender !== null;
  }

  async sendVerificationEmail(recipient: string, verificationUrl: string) {
    if (!this.transporter || !this.sender) {
      throw new ServiceUnavailableException('La livraison des e-mails n’est pas configurée.');
    }

    const safeUrl = verificationUrl.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[character]!);

    await this.transporter.sendMail({
      from: this.sender,
      to: recipient,
      subject: 'Confirmez votre adresse e-mail — MOTIF',
      text: `Confirmez votre adresse e-mail en ouvrant ce lien : ${verificationUrl}\n\nCe lien expire dans 30 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,
      html: `<main style="font-family:Arial,sans-serif;line-height:1.6;color:#17191b"><h1>Bienvenue chez MOTIF</h1><p>Confirmez votre adresse e-mail pour activer votre compte.</p><p><a href="${safeUrl}" style="display:inline-block;background:#d6f35b;color:#17191b;padding:12px 18px;text-decoration:none;font-weight:bold">Confirmer mon adresse</a></p><p>Ce lien expire dans 30 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p></main>`,
    });
  }

  onModuleDestroy() {
    this.transporter?.close();
  }
}
