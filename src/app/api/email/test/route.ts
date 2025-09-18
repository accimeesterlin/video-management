import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, testEmail, credentials } = await request.json();

    if (!testEmail) {
      return NextResponse.json({ error: "Test email is required" }, { status: 400 });
    }

    if (!provider) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }

    // Create transporter based on provider and credentials
    let transporter: nodemailer.Transporter;
    let fromEmail: string;

    try {
      switch (provider) {
        case 'zeptomail':
          if (!credentials?.['API Key'] || !credentials?.['From Email']) {
            return NextResponse.json({ error: "ZeptoMail API Key and From Email are required" }, { status: 400 });
          }
          
          const zeptoRegion = credentials['Region']?.toLowerCase().trim() === 'in' ? 'in' : 'com';
          const zeptoHost = zeptoRegion === 'in' ? 'smtp.zeptomail.in' : 'smtp.zeptomail.com';
          transporter = nodemailer.createTransport({
            host: zeptoHost,
            port: 587,
            secure: false,
            auth: {
              user: 'emailapikey',
              pass: credentials['API Key']
            }
          });
          fromEmail = credentials['From Email'];
          break;

        case 'sendgrid':
          if (!credentials?.['API Key'] || !credentials?.['From Email']) {
            return NextResponse.json({ error: "SendGrid API Key and From Email are required" }, { status: 400 });
          }
          
          transporter = nodemailer.createTransport({
            host: 'smtp.sendgrid.net',
            port: 587,
            secure: false,
            auth: {
              user: 'apikey',
              pass: credentials['API Key']
            }
          });
          fromEmail = credentials['From Email'];
          break;

        case 'mailgun':
          if (!credentials?.['API Key'] || !credentials?.['Domain']) {
            return NextResponse.json({ error: "Mailgun API Key and Domain are required" }, { status: 400 });
          }
          
          const region = credentials['Region']?.toLowerCase() === 'eu' ? 'eu' : 'us';
          const mailgunHost = region === 'eu' ? 'smtp.eu.mailgun.org' : 'smtp.mailgun.org';
          
          transporter = nodemailer.createTransport({
            host: mailgunHost,
            port: 587,
            secure: false,
            auth: {
              user: `postmaster@${credentials['Domain']}`,
              pass: credentials['API Key']
            }
          });
          fromEmail = `noreply@${credentials['Domain']}`;
          break;

        default:
          return NextResponse.json({ error: `Provider ${provider} not supported` }, { status: 400 });
      }

      // Send test email
      const info = await transporter.sendMail({
        from: fromEmail,
        to: testEmail,
        subject: `Test Email from ${provider} Integration`,
        text: `This is a test email to verify your ${provider} integration is working correctly.`,
        html: `
          <h2>Email Integration Test</h2>
          <p>This is a test email to verify your <strong>${provider}</strong> integration is working correctly.</p>
          <p>If you received this email, your integration is set up properly!</p>
          <p>Best regards,<br>Video Management Platform</p>
        `,
      });

      return NextResponse.json({ 
        message: "Test email sent successfully",
        provider,
        sentTo: testEmail,
        messageId: info.messageId
      });

    } catch (providerError: any) {
      console.error(`${provider} test error:`, providerError);
      return NextResponse.json(
        { error: `Failed to send test email via ${provider}: ${providerError.message}` }, 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Email test error:", error);
    return NextResponse.json(
      { error: "Failed to send test email" }, 
      { status: 500 }
    );
  }
}
