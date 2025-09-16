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
    
    // For now, we'll generate a placeholder thumbnail
    // In production, you'd implement actual video frame extraction
    
    const timestamp = Date.now();
    const filename = `thumbnail_${timestamp}.jpg`;
    
    // Create a simple placeholder image URL
    // In real implementation, this would be an actual extracted frame
    const placeholderUrl = `https://via.placeholder.com/640x360/1f2937/ffffff?text=Video+Thumbnail`;
    
    return placeholderUrl;
  } catch (error) {
    console.error("Error generating video thumbnail:", error);
    return null;
  }
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