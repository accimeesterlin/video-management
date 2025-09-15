import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dropboxService } from '@/lib/dropbox';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';

    const files = await dropboxService.listFiles(path);

    return NextResponse.json({
      success: true,
      data: files,
    });
  } catch (error) {
    console.error('Dropbox list files error:', error);
    return NextResponse.json(
      { error: 'Failed to list files from Dropbox' },
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
      const { folderName, path } = data;
      const result = await dropboxService.createFolder(folderName, path);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'shareFile') {
      const { path } = data;
      const result = await dropboxService.shareFile(path);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'moveFile') {
      const { fromPath, toPath } = data;
      const result = await dropboxService.moveFile(fromPath, toPath);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'copyFile') {
      const { fromPath, toPath } = data;
      const result = await dropboxService.copyFile(fromPath, toPath);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Dropbox action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform Dropbox action' },
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
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    await dropboxService.deleteFile(path);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Dropbox delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete file from Dropbox' },
      { status: 500 }
    );
  }
}