import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller()
export class DashboardController {
  @Get('/')
  redirectToDashboard(@Res() res: Response) {
    return res.redirect('/dashboard');
  }

  @Get('dashboard')
  getDashboard(@Res() res: Response) {
    return res.sendFile(join(__dirname, '..', '..', 'public', 'index.html'));
  }
}