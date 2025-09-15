import nodemailer from "nodemailer";
import { Resend } from "resend";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private resend: Resend | null = null;

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } else {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "localhost",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
    }
  }

  async sendEmail(options: EmailOptions) {
    try {
      if (this.resend) {
        return await this.sendWithResend(options);
      } else {
        return await this.sendWithNodemailer(options);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  private async sendWithResend(options: EmailOptions) {
    const emailData: any = {
      from: process.env.FROM_EMAIL || "noreply@example.com",
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
    };

    // Ensure at least one of text, html, or react is provided
    if (options.text) {
      emailData.text = options.text;
    }
    if (options.html) {
      emailData.html = options.html;
    }

    const { data, error } = await this.resend!.emails.send(emailData);

    if (error) {
      throw error;
    }

    return data;
  }

  private async sendWithNodemailer(options: EmailOptions) {
    if (!this.transporter) {
      throw new Error("SMTP transporter not configured");
    }
    const info = await this.transporter.sendMail({
      from: process.env.FROM_EMAIL || "noreply@example.com",
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    });

    return info;
  }

  async sendProjectInvitation(
    email: string,
    projectName: string,
    inviterName: string,
    inviteUrl: string
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">You're Invited!</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">Join "${projectName}" project</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hi there! 👋
            </p>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              <strong>${inviterName}</strong> has invited you to collaborate on the video editing project "<strong>${projectName}</strong>".
            </p>
            
            <p style="font-size: 16px; margin-bottom: 30px;">
              Click the button below to join the project and start collaborating:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; transition: transform 0.2s;">
                Join Project
              </a>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              If you can't click the button, copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
              Best regards,<br>
              The Video Editor Pro Team
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `You've been invited to join "${projectName}"`,
      html,
      text: `Hi! ${inviterName} has invited you to collaborate on the video editing project "${projectName}". Join the project: ${inviteUrl}`,
    });
  }

  async sendProjectStatusUpdate(
    email: string,
    projectName: string,
    status: string,
    message: string
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Project Update</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Project Update</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">"${projectName}" Status: ${status}</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              ${message}
            </p>
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              Best regards,<br>
              The Video Editor Pro Team
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Project Update: ${projectName} - ${status}`,
      html,
      text: `Project "${projectName}" status: ${status}. ${message}`,
    });
  }

  async sendVideoProcessingComplete(
    email: string,
    videoName: string,
    downloadUrl?: string
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Video Processing Complete</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); padding: 40px 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎬 Video Ready!</h1>
          </div>
          
          <div style="background: white; padding: 40px 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin-top: 0;">Your video is ready</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Great news! Your video "<strong>${videoName}</strong>" has finished processing and is ready for download.
            </p>
            
            ${
              downloadUrl
                ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${downloadUrl}" style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block; transition: transform 0.2s;">
                  Download Video
                </a>
              </div>
            `
                : ""
            }
            
            <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              Best regards,<br>
              The Video Editor Pro Team
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: `Video processing complete: ${videoName}`,
      html,
      text: `Your video "${videoName}" has finished processing and is ready.${
        downloadUrl ? ` Download: ${downloadUrl}` : ""
      }`,
    });
  }
}

export const emailService = new EmailService();
