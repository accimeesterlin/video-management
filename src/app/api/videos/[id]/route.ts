import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getS3VideoUrl, getSignedS3ObjectUrl, inferS3KeyFromUrl } from "@/lib/s3";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { db } = await connectToDatabase();
    const { id } = await params;

    // Find the video
    const video = await db.collection("videos").findOne({
      _id: new ObjectId(id),
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const signObjectUrl = async (key?: string | null, fallbackUrl?: string | null) => {
      const derivedKey = key || inferS3KeyFromUrl(fallbackUrl ?? undefined);
      if (derivedKey) {
        try {
          return await getSignedS3ObjectUrl(derivedKey);
        } catch (error) {
          console.error("Failed to sign S3 object", derivedKey, error);
          return getS3VideoUrl(derivedKey);
        }
      }
      return fallbackUrl || null;
    };

    const mapThumbnails = async (thumbnails: any[] | undefined | null) => {
      if (!Array.isArray(thumbnails) || thumbnails.length === 0) return [];
      return Promise.all(
        thumbnails.map(async (thumbnail) => {
          const key = thumbnail?.s3Key || inferS3KeyFromUrl(thumbnail?.url);
          const signedUrl = await signObjectUrl(key, thumbnail?.url);
          return {
            ...thumbnail,
            s3Key: key || null,
            url: signedUrl,
          };
        })
      );
    };

    const mapResources = async (resources: any[] | undefined | null) => {
      if (!Array.isArray(resources) || resources.length === 0) return [];
      return Promise.all(
        resources.map(async (resource) => {
          const key = resource?.s3Key || inferS3KeyFromUrl(resource?.url);
          const signedUrl = await signObjectUrl(key, resource?.url);
          return {
            ...resource,
            s3Key: key || null,
            url: signedUrl,
          };
        })
      );
    };

    const mapVersions = async (versions: any[] | undefined | null) => {
      if (!Array.isArray(versions) || versions.length === 0) return [];
      return Promise.all(
        versions.map(async (version) => {
          const key = version?.s3Key || inferS3KeyFromUrl(version?.url);
          const signedUrl = await signObjectUrl(key, version?.url);
          return {
            ...version,
            s3Key: key || null,
            url: signedUrl,
          };
        })
      );
    };

    const mapShorts = async (shorts: any[] | undefined | null) => {
      if (!Array.isArray(shorts) || shorts.length === 0) return [];
      return Promise.all(
        shorts.map(async (short) => {
          const key = short?.s3Key || inferS3KeyFromUrl(short?.url);
          const signedUrl = await signObjectUrl(key, short?.url);
          return {
            ...short,
            s3Key: key || null,
            url: signedUrl,
          };
        })
      );
    };

    // Check if this is a public video (for shared access)
    if (video.isPublic) {
      // For public videos, allow access without authentication
      let uploaderName = video.uploadedByName;
      if (!uploaderName && video.uploadedBy) {
        const uploader = await db
          .collection("users")
          .findOne({ _id: video.uploadedBy });
        uploaderName = uploader?.name || uploader?.email || "Unknown User";
      }

      const resolvedVideoUrl = await signObjectUrl(
        video.s3Key,
        video.url
      );

      const resolvedThumbnailUrl = await signObjectUrl(
        video.thumbnailKey,
        video.thumbnail
      );

      const thumbnails = await mapThumbnails(video.thumbnails);
      const resources = await mapResources(video.resources);
      const versions = await mapVersions(video.versions);
      const shorts = await mapShorts(video.shorts);

      let projectInfo: any = null;
      if (video.projectId || video.project) {
        const projectIdValue = video.projectId
          ? typeof video.projectId === "string"
            ? video.projectId
            : video.projectId.toString()
          : null;

        const projectQuery: any = projectIdValue
          ? { _id: new ObjectId(projectIdValue) }
          : { name: video.project };

        if (video.companyId) {
          projectQuery.companyId = video.companyId;
        } else if (video.uploadedBy) {
          projectQuery.ownerId = video.uploadedBy;
        }

        try {
          const projectDoc = await db.collection("projects").findOne(projectQuery);
          if (projectDoc) {
            projectInfo = {
              _id: projectDoc._id.toString(),
              name: projectDoc.name,
              status: projectDoc.status,
              progress: projectDoc.progress,
            };
          }
        } catch (error) {
          console.error("Failed to load project info for video", id, error);
        }
      }

      // Convert ObjectId to string for JSON serialization
      const videoData = {
        ...video,
        _id: video._id.toString(),
        uploadedBy: video.uploadedBy.toString(),
        uploadedByName: uploaderName,
        companyId: video.companyId?.toString(),
        comments: video.comments || [],
        url: resolvedVideoUrl,
        thumbnail: resolvedThumbnailUrl,
        thumbnails,
        resources,
        versions,
        shorts,
        projectId:
          video.projectId?.toString?.() || projectInfo?._id || null,
        projectInfo,
      };

      return NextResponse.json(videoData);
    }

    // For private videos, require authentication
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has access to this video
    const hasAccess =
      video.uploadedBy.toString() === user._id.toString() ||
      (user.companyId &&
        video.companyId &&
        video.companyId.toString() === user.companyId.toString());

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get uploader info if not present
    let uploaderName = video.uploadedByName;
    if (!uploaderName && video.uploadedBy) {
      const uploader = await db
        .collection("users")
        .findOne({ _id: video.uploadedBy });
      uploaderName = uploader?.name || uploader?.email || "Unknown User";
    }

    const resolvedVideoUrl = await signObjectUrl(
      video.s3Key,
      video.url
    );

    const resolvedThumbnailUrl = await signObjectUrl(
      video.thumbnailKey,
      video.thumbnail
    );

    const thumbnails = await mapThumbnails(video.thumbnails);
    const resources = await mapResources(video.resources);
    const versions = await mapVersions(video.versions);
    const shorts = await mapShorts(video.shorts);

    let projectInfo: any = null;
    if (video.projectId || video.project) {
      const projectIdValue = video.projectId
        ? typeof video.projectId === "string"
          ? video.projectId
          : video.projectId.toString()
        : null;

      const projectQuery: any = projectIdValue
        ? { _id: new ObjectId(projectIdValue) }
        : { name: video.project };

      if (user.companyId) {
        projectQuery.companyId = user.companyId;
      } else {
        projectQuery.ownerId = user._id;
      }

      try {
        const projectDoc = await db.collection("projects").findOne(projectQuery);
        if (projectDoc) {
          projectInfo = {
            _id: projectDoc._id.toString(),
            name: projectDoc.name,
            status: projectDoc.status,
            progress: projectDoc.progress,
          };
        }
      } catch (error) {
        console.error("Failed to load project info for", id, error);
      }
    }

    // Convert ObjectId to string for JSON serialization
    const videoData = {
      ...video,
      _id: video._id.toString(),
      uploadedBy: video.uploadedBy.toString(),
      uploadedByName: uploaderName,
      companyId: video.companyId?.toString(),
      comments: video.comments || [],
      url: resolvedVideoUrl,
      thumbnail: resolvedThumbnailUrl,
      thumbnails,
      resources,
      versions,
      shorts,
      projectId:
        video.projectId?.toString?.() || projectInfo?._id || null,
      projectInfo,
    };

    return NextResponse.json(videoData);
  } catch (error) {
    console.error("Video fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();

    const { id } = await params;

    // Get user
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the video and verify access
    const video = await db.collection("videos").findOne({
      _id: new ObjectId(id),
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Check if user has permission to update this video
    const hasAccess =
      video.uploadedBy.toString() === user._id.toString() ||
      (user.companyId &&
        video.companyId &&
        video.companyId.toString() === user.companyId.toString());

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update video
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.title) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.project) {
      updateData.project = body.project;
      try {
        const projectFilter: any = { name: body.project };
        if (user.companyId) {
          projectFilter.$or = [
            { companyId: user.companyId },
            { ownerId: user._id },
          ];
        } else {
          projectFilter.ownerId = user._id;
        }

        const matchingProject = await db
          .collection("projects")
          .findOne(projectFilter);

        updateData.projectId = matchingProject?._id || null;
      } catch (error) {
        console.error("Failed to resolve project for video", id, error);
      }
    }
    if (body.tags !== undefined) {
      updateData.tags =
        typeof body.tags === "string"
          ? body.tags
              .split(",")
              .map((t: string) => t.trim())
              .filter((t: string) => t)
          : body.tags;
    }

    await db
      .collection("videos")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // Get updated video
    const updatedVideo = await db
      .collection("videos")
      .findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      message: "Video updated successfully",
      video: updatedVideo,
    });
  } catch (error) {
    console.error("Video update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Find the video and verify access
    const video = await db.collection("videos").findOne({
      _id: new ObjectId(id),
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    // Check if user has permission to delete this video
    const hasAccess =
      video.uploadedBy.toString() === user._id.toString() ||
      (user.companyId &&
        video.companyId &&
        video.companyId.toString() === user.companyId.toString());

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete the video from database
    await db.collection("videos").deleteOne({ _id: new ObjectId(id) });

    // Delete the video file from S3 storage if URL exists
    if (video.url && video.url.includes("amazonaws.com")) {
      try {
        // Extract S3 key from URL
        const urlParts = video.url.split("/");
        const s3Key = urlParts.slice(-2).join("/"); // Get the last two parts (folder/filename)

        // Delete from S3 (you'll need to implement S3 deletion based on your setup)
        // await deleteFromS3(s3Key);
        console.log("S3 deletion needed for key:", s3Key);

        // For now, we'll just log the deletion
        // In production, you'd implement actual S3 deletion here
      } catch (s3Error) {
        console.error("Error deleting from S3:", s3Error);
        // Don't fail the entire operation if S3 deletion fails
      }
    }

    return NextResponse.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Video deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
