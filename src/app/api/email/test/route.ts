import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { emailService } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, testEmail } = await request.json();

    if (!testEmail) {
      return NextResponse.json({ error: "Test email is required" }, { status: 400 });
    }

    // Send a test email
    await emailService.sendEmail({
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
      sentTo: testEmail
    });
  } catch (error) {
    console.error("Email test error:", error);
    return NextResponse.json(
      { error: "Failed to send test email" }, 
      { status: 500 }
    );
  }
}