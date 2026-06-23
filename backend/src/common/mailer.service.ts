import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendMail(options: { to: string; subject: string; text: string }): Promise<void> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from =
      this.configService.get<string>('SMTP_FROM') ?? 'Smart Parking <noreply@smartparking.com>';

    if (!host || !user || !pass) {
      this.logger.warn(
        `SMTP not configured — email to ${options.to} skipped. Subject: ${options.subject}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
  }
}