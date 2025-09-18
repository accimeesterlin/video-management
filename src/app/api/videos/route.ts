import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  getS3VideoUrl,
  getSignedS3ObjectUrl,
  inferS3KeyFromUrl,
} from "@/lib/s3";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    
    const {
      videoKey,
      url,
      title,
      description,
      project,
      tags,
      duration,
      size,
      isExternalLink,
      thumbnailKey,
      thumbnailUrl,
      platform,
      companyId,
    } = body;

    // Get user data
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let videoData;
    
    const resolvedThumbnailKey = thumbnailKey || null;
    let resolvedThumbnailUrl = resolvedThumbnailKey
      ? getS3VideoUrl(resolvedThumbnailKey)
      : thumbnailUrl || null;
      
    // If no thumbnail provided, generate a default one
    if (!resolvedThumbnailUrl) {
      if (isExternalLink && url) {
        // Try to generate thumbnail for external links
        resolvedThumbnailUrl = await generateExternalThumbnail(url, platform);
      }
      
      // If still no thumbnail, use a default placeholder
      if (!resolvedThumbnailUrl) {
        resolvedThumbnailUrl = generateDefaultThumbnail();
      }
    }

    // Use provided companyId or default to user's companyId
    const finalCompanyId = companyId || user.companyId;

    let projectId: ObjectId | null = null;
    if (project) {
      try {
        const projectFilter: any = { name: project };

        if (finalCompanyId) {
          projectFilter.$or = [
            { companyId: finalCompanyId },
            { ownerId: user._id },
          ];
        } else {
          projectFilter.ownerId = user._id;
        }

        const projectDoc = await db.collection("projects").findOne(projectFilter);
        if (projectDoc?._id) {
          projectId = projectDoc._id as ObjectId;
        }
      } catch (error) {
        console.error("Failed to match project for video", project, error);
      }
    }

    if (isExternalLink && url) {
      // Handle external video link
      videoData = {
        title,
        description: description || "",
        filename: title || "External Video",
        s3Key: null,
        url: url,
        duration: duration || 0,
        size: size || 0,
        status: "completed",
        project: project || "General",
        uploadedBy: user._id,
        uploadedByName: user.name,
        companyId: finalCompanyId,
        uploadedAt: new Date(),
        tags: tags ? tags.split(",").map((t: string) => t.trim()) : [],
        comments: [],
        thumbnail: resolvedThumbnailUrl,
        thumbnailKey: resolvedThumbnailKey,
        projectId,
        isExternalLink: true,
        platform: platform || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else if (videoKey) {
      // Handle file upload
      videoData = {
        title,
        description: description || "",
        filename: videoKey.split('/').pop() || "",
        s3Key: videoKey,
        url: getS3VideoUrl(videoKey),
        duration: duration || await extractVideoDuration(videoKey) || 0,
        size: size || 0,
        status: "processing",
        project: project || "General",
        uploadedBy: user._id,
        uploadedByName: user.name,
        companyId: finalCompanyId,
        uploadedAt: new Date(),
        tags: tags ? tags.split(",").map((t: string) => t.trim()) : [],
        comments: [],
        thumbnail: resolvedThumbnailUrl,
        thumbnailKey: resolvedThumbnailKey,
        projectId,
        isExternalLink: false,
        platform: "upload",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else {
      return NextResponse.json({ error: "Missing video data" }, { status: 400 });
    }

    const result = await db.collection("videos").insertOne(videoData);

    const responseData: any = {
      _id: result.insertedId.toString(),
      ...videoData,
      projectId: projectId ? projectId.toString() : null,
    };

    if (!isExternalLink && videoKey) {
      try {
        responseData.url = await getSignedS3ObjectUrl(videoKey);
      } catch (error) {
        console.error("Failed to create signed video URL:", error);
      }
    }

    if (resolvedThumbnailKey) {
      try {
        responseData.thumbnail = await getSignedS3ObjectUrl(resolvedThumbnailKey);
      } catch (error) {
        console.error("Failed to create signed thumbnail URL:", error);
      }
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Video creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get user's company
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const query = user.companyId 
      ? { companyId: user.companyId }
      : { uploadedBy: user._id };

    const videos = await db.collection("videos")
      .find(query)
      .sort({ uploadedAt: -1 })
      .toArray();

    const enrichedVideos = await Promise.all(
      videos.map(async (video) => {
        let uploaderName = video.uploadedByName;

        if (!uploaderName && video.uploadedBy) {
          const uploader = await db.collection("users").findOne({ _id: video.uploadedBy });
          uploaderName = uploader?.name || uploader?.email || "Unknown User";
        }

        let signedVideoUrl = video.url;
        if (video.s3Key) {
          try {
            signedVideoUrl = await getSignedS3ObjectUrl(video.s3Key);
          } catch (error) {
            console.error("Failed to sign video URL for", video._id?.toString(), error);
          }
        }

        let signedThumbnailUrl = video.thumbnail;
        const resolvedThumbnailKey = video.thumbnailKey || inferS3KeyFromUrl(video.thumbnail);
        if (resolvedThumbnailKey) {
          try {
            signedThumbnailUrl = await getSignedS3ObjectUrl(resolvedThumbnailKey);
          } catch (error) {
            console.error("Failed to sign thumbnail URL for", video._id?.toString(), error);
          }
        }

        return {
          ...video,
          _id: video._id?.toString?.() || video._id,
          uploadedBy: video.uploadedBy?.toString?.() || video.uploadedBy,
          companyId: video.companyId?.toString?.() || video.companyId,
          uploadedByName: uploaderName || "Unknown User",
          url: signedVideoUrl,
          thumbnail: signedThumbnailUrl,
          projectId: video.projectId?.toString?.() || null,
        };
      })
    );

    return NextResponse.json(enrichedVideos);
  } catch (error) {
    console.error("Videos fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
          return `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
        }
        break;
      }
      case "vimeo": {
        const id = extractVimeoId(url);
        if (id) {
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

function generateDefaultThumbnail(): string {
  // Create a default thumbnail as SVG data URL
  const width = 640;
  const height = 360;
  
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

async function extractVideoDuration(videoKey: string): Promise<number | null> {
  try {
    // In a real implementation, you would:
    // 1. Use AWS MediaConvert, AWS Lambda with FFmpeg, or a similar service
    // 2. Extract video metadata including duration
    // 3. Return the duration in seconds
    
    // For now, we'll simulate duration extraction
    // In production, you could use:
    // - AWS Elemental MediaInfo
    // - FFprobe via AWS Lambda
    // - A third-party video processing service
    
    console.log(`Extracting duration for video: ${videoKey}`);
    
    // Placeholder: return null to indicate duration should be set manually
    // or provided by the client during upload
    return null;
  } catch (error) {
    console.error("Error extracting video duration:", error);
    return null;
  }
}
