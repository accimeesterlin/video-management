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
    } = body;

    // Get user data
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let videoData;
    
    const resolvedThumbnailKey = thumbnailKey || null;
    const resolvedThumbnailUrl = resolvedThumbnailKey
      ? getS3VideoUrl(resolvedThumbnailKey)
      : thumbnailUrl || null;

    let projectId: ObjectId | null = null;
    if (project) {
      try {
        const projectFilter: any = { name: project };

        if (user.companyId) {
          projectFilter.$or = [
            { companyId: user.companyId },
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
        companyId: user.companyId,
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
        duration: duration || 0,
        size: size || 0,
        status: "processing",
        project: project || "General",
        uploadedBy: user._id,
        uploadedByName: user.name,
        companyId: user.companyId,
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
