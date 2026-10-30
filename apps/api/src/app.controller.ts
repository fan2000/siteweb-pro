import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getApiInfo() {
    return {
      service: 'MOTIF API',
      endpoints: [
        { method: 'GET', path: '/api/offers' },
        { method: 'POST', path: '/api/auth/register' },
        { method: 'POST', path: '/api/auth/resend-verification' },
        { method: 'POST', path: '/api/auth/verify-email' },
        { method: 'POST', path: '/api/auth/login' },
        { method: 'POST', path: '/api/auth/session' },
        { method: 'POST', path: '/api/auth/logout' },
        { method: 'POST', path: '/api/auth/mfa/setup' },
        { method: 'POST', path: '/api/auth/mfa/enable' },
      ],
    };
  }
}
