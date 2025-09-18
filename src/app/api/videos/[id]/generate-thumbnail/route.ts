import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generatePresignedUrl, getS3VideoUrl } from "@/lib/s3";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id } = await params;

    // Get user
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify video exists and user has access
    const video = await db.collection("videos").findOne({
      _id: new ObjectId(id),
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const hasAccess =
      video.uploadedBy.toString() === user._id.toString() ||
      (user.companyId &&
        video.companyId &&
        video.companyId.toString() === user.companyId.toString());

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let thumbnailUrl = null;

    // Generate thumbnail based on video type
    if (video.isExternalLink && video.url) {
      // Generate thumbnail from external video platforms
      thumbnailUrl = await generateExternalThumbnail(video.url, video.platform);
    } else if (video.s3Key || video.url) {
      // For uploaded videos, we'll create a placeholder for now
      // In a real implementation, you'd use a service like AWS MediaConvert or FFmpeg
      thumbnailUrl = await generateVideoThumbnail(video.s3Key || video.url);
    }

    if (thumbnailUrl) {
      // Update video with generated thumbnail
      await db.collection("videos").updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            thumbnail: thumbnailUrl,
            updatedAt: new Date(),
          },
        }
      );

      return NextResponse.json({
        message: "Thumbnail generated successfully",
        thumbnail: thumbnailUrl,
      });
    }

    return NextResponse.json(
      { error: "Unable to generate thumbnail for this video" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function generateExternalThumbnail(url: string, platform?: string | null): Promise<string | null> {
  try {
    const normalizedPlatform = (platform || "").toLowerCase();
    let inferredPlatform = normalizedPlatform;
    
    // Auto-detect platform if not provided
    if (!inferredPlatform) {
      if (url.includes("youtu.be") || url.includes("youtube.com")) {
        inferredPlatform = "youtube";
      } else if (url.includes("vimeo.com")) {
        inferredPlatform = "vimeo";
      } else if (url.includes("dailymotion.com") || url.includes("dai.ly")) {
        inferredPlatform = "dailymotion";
      }
    }

    switch (inferredPlatform) {
      case "youtube": {
        const id = extractYouTubeId(url);
        if (id) {
          // YouTube provides multiple thumbnail resolutions
          return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        }
        break;
      }
      case "vimeo": {
        const id = extractVimeoId(url);
        if (id) {
          // For Vimeo, we'd need to call their API to get thumbnail
          // For now, return a placeholder
          try {
            const response = await fetch(`https://vimeo.com/api/v2/video/${id}.json`);
            if (response.ok) {
              const data = await response.json();
              return data[0]?.thumbnail_large || null;
            }
          } catch (error) {
            console.error("Error fetching Vimeo thumbnail:", error);
          }
        }
        break;
      }
      case "dailymotion": {
        const id = extractDailymotionId(url);
        if (id) {
          // Dailymotion thumbnail URL pattern
          return `https://www.dailymotion.com/thumbnail/video/${id}`;
        }
        break;
      }
    }

    return null;
  } catch (error) {
    console.error("Error generating external thumbnail:", error);
    return null;
  }
}

async function generateVideoThumbnail(videoSource: string): Promise<string | null> {
  try {
    // For uploaded videos, we would typically use:
    // 1. AWS MediaConvert to extract frames
    // 2. FFmpeg to generate thumbnails
    // 3. A video processing service
    
    // For now, we'll attempt different strategies based on video source
    
    if (videoSource.startsWith('http')) {
      // For HTTP URLs, try to extract frame using canvas/video element approach
      // This would work in a browser environment but not in Node.js server
      // In production, you'd queue this for client-side processing or use a service
      
      // Generate a better placeholder that indicates video frame extraction
      return createVideoFramePlaceholder(videoSource);
    }
    
    // For S3 videos, we would:
    // 1. Generate a presigned URL
    // 2. Use AWS MediaConvert or Lambda with FFmpeg
    // 3. Extract frame at specific timestamp (e.g., 10% of video duration)
    
    // For now, create an enhanced placeholder
    return createVideoFramePlaceholder(videoSource);
  } catch (error) {
    console.error("Error generating video thumbnail:", error);
    return null;
  }
}

function createVideoFramePlaceholder(videoSource: string): string {
  // Create a more sophisticated placeholder that looks like a video frame
  const width = 640;
  const height = 360;
  
  // Create SVG that looks more like an actual video thumbnail
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="videoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#1e293b;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#334155;stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Video background -->
      <rect width="100%" height="100%" fill="url(#videoBg)"/>
      
      <!-- Grid pattern to simulate video -->
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#475569" stroke-width="0.5" opacity="0.3"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)"/>
      
      <!-- Video play icon -->
      <g transform="translate(${width/2}, ${height/2})">
        <circle cx="0" cy="0" r="40" fill="#3b82f6" opacity="0.9" filter="url(#glow)"/>
        <polygon points="-15,-20 -15,20 25,0" fill="white"/>
      </g>
      
      <!-- Video info -->
      <rect x="10" y="${height - 60}" width="200" height="50" rx="8" fill="rgba(0,0,0,0.7)"/>
      <text x="20" y="${height - 35}" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">
        Video Thumbnail
      </text>
      <text x="20" y="${height - 20}" fill="#94a3b8" font-family="Arial, sans-serif" font-size="10">
        Frame extraction pending
      </text>
      
      <!-- Timestamp -->
      <rect x="${width - 80}" y="${height - 35}" width="65" height="20" rx="4" fill="rgba(0,0,0,0.8)"/>
      <text x="${width - 75}" y="${height - 22}" fill="white" font-family="Arial, sans-serif" font-size="11" text-anchor="start">
        00:00:00
      </text>
    </svg>
  `;
  
  const encodedSvg = encodeURIComponent(svgContent);
  return `data:image/svg+xml,${encodedSvg}`;
}

function createThumbnailCanvas(): string {
  // Create a simple thumbnail as a data URL to avoid external service dependencies
  const width = 640;
  const height = 360;
  
  // Create SVG data URL for consistent thumbnail
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1f2937;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#374151;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      <g transform="translate(${width/2}, ${height/2})">
        <circle cx="0" cy="0" r="30" fill="#3b82f6" opacity="0.8"/>
        <polygon points="-12,-15 -12,15 18,0" fill="white"/>
      </g>
      <text x="${width/2}" y="${height - 30}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" opacity="0.9">
        Video Thumbnail
      </text>
    </svg>
  `;
  
  const encodedSvg = encodeURIComponent(svgContent);
  return `data:image/svg+xml,${encodedSvg}`;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractVimeoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /vimeo\.com\/video\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractDailymotionId(url: string): string | null {
  const patterns = [
    /dailymotion\.com\/video\/([^_?#]+)/,
    /dai\.ly\/([^_?#]+)/,
    /dailymotion\.com\/embed\/video\/([^_?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}