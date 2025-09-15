import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { vimeoService } from '@/lib/vimeo';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = parseInt(searchParams.get('per_page') || '25');

    const videos = await vimeoService.getUserVideos(undefined, page, per_page);

    return NextResponse.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    console.error('Vimeo get videos error:', error);
    return NextResponse.json(
      { error: 'Failed to get videos from Vimeo' },
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

    if (action === 'createAlbum') {
      const { name, description } = data;
      const result = await vimeoService.createAlbum(name, description);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'addToAlbum') {
      const { albumId, videoId } = data;
      const result = await vimeoService.addVideoToAlbum(albumId, videoId);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    if (action === 'getEmbed') {
      const { videoId, width, height } = data;
      const result = await vimeoService.getEmbedCode(videoId, width, height);
      
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Vimeo action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform Vimeo action' },
      { status: 500 }
    );
  }
}