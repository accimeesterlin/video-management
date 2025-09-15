import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, ...data } = await request.json();

    if (type === 'projectInvitation') {
      const { email, projectName, inviterName, inviteUrl } = data;
      
      if (!email || !projectName || !inviterName || !inviteUrl) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      await emailService.sendProjectInvitation(email, projectName, inviterName, inviteUrl);
      
      return NextResponse.json({
        success: true,
        message: 'Project invitation sent successfully',
      });
    }

    if (type === 'projectStatusUpdate') {
      const { email, projectName, status, message } = data;
      
      if (!email || !projectName || !status || !message) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      await emailService.sendProjectStatusUpdate(email, projectName, status, message);
      
      return NextResponse.json({
        success: true,
        message: 'Status update sent successfully',
      });
    }

    if (type === 'videoProcessingComplete') {
      const { email, videoName, downloadUrl } = data;
      
      if (!email || !videoName) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      await emailService.sendVideoProcessingComplete(email, videoName, downloadUrl);
      
      return NextResponse.json({
        success: true,
        message: 'Processing notification sent successfully',
      });
    }

    if (type === 'custom') {
      const { to, subject, text, html, attachments } = data;
      
      if (!to || !subject || (!text && !html)) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      await emailService.sendEmail({
        to,
        subject,
        text,
        html,
        attachments,
      });
      
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
      });
    }

    return NextResponse.json({ error: 'Invalid email type' }, { status: 400 });
  } catch (error) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}