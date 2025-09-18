import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getS3VideoUrl, getSignedS3ObjectUrl, inferS3KeyFromUrl } from "@/lib/s3";

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
    const body = await request.json();
    
    const {
      startTime,
      endTime,
      title,
      description,
      clipKey,
      clipFilename,
      clipMimeType,
      clipSize,
    } = body;

    // Validate input
    if (startTime === undefined || endTime === undefined) {
      return NextResponse.json(
        { error: "Start and end times are required" },
        { status: 400 }
      );
    }

    const numericStart = Number(startTime);
    const numericEnd = Number(endTime);

    if (!Number.isFinite(numericStart) || !Number.isFinite(numericEnd) || numericStart >= numericEnd) {
      return NextResponse.json(
        { error: "Invalid time range. Start time must be less than end time." },
        { status: 400 }
      );
    }

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

    // Determine clip URL strategy
    const resolvedClipKey = clipKey?.trim() || null;
    let clipUrl: string | null = null;
    let clipStatus: "pending" | "completed" = "completed";

    if (resolvedClipKey) {
      clipUrl = getS3VideoUrl(resolvedClipKey);
      clipStatus = "completed";
    } else {
      clipUrl = generateClipUrl(video.url, numericStart, numericEnd, video.isExternalLink);
    }

    // Create clip data
    const clipData = {
      videoId: new ObjectId(id),
      title: title || `Clip from ${video.title}`,
      description:
        description || `Clip from ${Math.round(numericStart)}s to ${Math.round(numericEnd)}s`,
      startTime: numericStart,
      endTime: numericEnd,
      duration: numericEnd - numericStart,
      originalVideoTitle: video.title,
      originalVideoUrl: video.url,
      originalVideoS3Key: video.s3Key,
      isExternalLink: video.isExternalLink,
      platform: video.platform,
      createdBy: user._id,
      createdByName: user.name,
      companyId: video.companyId,
      project: video.project,
      tags: video.tags || [],
      status: clipStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
      clipUrl,
      s3Key: resolvedClipKey,
      filename:
        clipFilename ||
        `${(video.title || "video")
          .toLowerCase()
          .replace(/\s+/g, "-")}-clip-${Math.floor(numericStart)}-${Math.floor(numericEnd)}.${
          clipMimeType?.split("/")[1] || "webm"
        }`,
      mimeType: clipMimeType || (resolvedClipKey ? "video/webm" : "video/mp4"),
      size: clipSize || 0,
    };

    // Insert clip
    const result = await db.collection("video_clips").insertOne(clipData);

    const responseData = {
      _id: result.insertedId.toString(),
      ...clipData,
      status: clipStatus,
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error("Clip creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
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

    // Get clips for this video
    const clips = await db
      .collection("video_clips")
      .find({ videoId: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedClips = await Promise.all(
      clips.map(async (clip) => {
        let signedClipUrl = clip.clipUrl;

        const primaryS3Key = clip.s3Key || clip.originalVideoS3Key;

        if (primaryS3Key) {
          try {
            signedClipUrl = await getSignedS3ObjectUrl(primaryS3Key);
          } catch (error) {
            console.error("Failed to sign clip URL using s3Key:", primaryS3Key, error);
          }
        } else if (!clip.isExternalLink) {
          try {
            // For marker-based clips, sign the original video URL
            const s3Key = inferS3KeyFromUrl(clip.originalVideoUrl || clip.clipUrl);
            if (s3Key) {
              signedClipUrl = await getSignedS3ObjectUrl(s3Key);
            } else {
              console.error(`No S3 key found for clip ${clip._id}`);
            }
          } catch (error) {
            console.error("Failed to sign clip URL:", error);
            // Keep original URL if signing fails
          }
        }
        
        return {
          ...clip,
          _id: clip._id.toString(),
          videoId: clip.videoId.toString(),
          createdBy: clip.createdBy.toString(),
          companyId: clip.companyId?.toString(),
          s3Key: clip.s3Key || null,
          clipUrl: signedClipUrl,
          // Include timing info for frontend to handle clip playback
          startTime: clip.startTime,
          endTime: clip.endTime,
          duration: clip.duration,
        };
      })
    );

    return NextResponse.json(enrichedClips);
  } catch (error) {
    console.error("Clips fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function generateClipUrl(
  originalUrl: string,
  startTime: number,
  endTime: number,
  isExternalLink: boolean | undefined | null
): string {
  const safeStart = Math.max(0, Math.floor(startTime));
  const safeEnd = Math.max(safeStart + 1, Math.floor(endTime));

  if (isExternalLink) {
    const separator = originalUrl.includes("?") ? "&" : "?";

    if (originalUrl.includes("youtube.com") || originalUrl.includes("youtu.be")) {
      return `${originalUrl}${separator}start=${safeStart}&end=${safeEnd}`;
    }

    if (originalUrl.includes("vimeo.com")) {
      return `${originalUrl}#t=${safeStart}s`;
    }

    // For other external links, fall back to fragment identifiers
    return `${originalUrl.split("#")[0]}#t=${safeStart},${safeEnd}`;
  }

  // For uploaded videos, append media fragment to hint preferred playback window.
  return `${originalUrl.split("#")[0]}#t=${safeStart},${safeEnd}`;
}
