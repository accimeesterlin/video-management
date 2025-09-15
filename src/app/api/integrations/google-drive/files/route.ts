import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { googleDriveService } from '@/lib/google-drive';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    const files = await googleDriveService.listFiles(folderId || undefined);

    return NextResponse.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error('Google Drive list files error:', error);
    return NextResponse.json(
      { error: 'Failed to list files from Google Drive' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...data } = await request.json();

    if (action === 'createFolder') {
      const { folderName, parentFolderId } = data;
      const result = await googleDriveService.createFolder(folderName, parentFolderId);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'shareFile') {
      const { fileId, email, role } = data;
      const result = await googleDriveService.shareFile(fileId, email, role);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Google Drive action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform Google Drive action' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }

    await googleDriveService.deleteFile(fileId);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Google Drive delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file from Google Drive' },
      { status: 500 }
    );
  }
}