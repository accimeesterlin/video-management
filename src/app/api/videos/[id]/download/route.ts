import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getSignedS3ObjectUrl, getS3VideoUrl } from "@/lib/s3";

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

    // Check if this is a public video (for shared access)
    if (video.isPublic) {
      // For public videos, allow download without authentication
      if (!video.url) {
        return NextResponse.json(
          { error: "Video file not available" },
          { status: 404 }
        );
      }

      let downloadUrl = video.url;

      if (video.s3Key) {
        try {
          downloadUrl = await getSignedS3ObjectUrl(video.s3Key, 600);
        } catch (error) {
          console.error("Failed to sign public download URL for", id, error);
          downloadUrl = getS3VideoUrl(video.s3Key);
        }
      }

      return NextResponse.json({
        downloadUrl,
        filename: video.filename || video.title,
        contentType: "video/mp4",
      });
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

    if (!video.url) {
      return NextResponse.json(
        { error: "Video file not available" },
        { status: 404 }
      );
    }

    // For S3 URLs, we can either return the direct URL or create a signed URL
    // For now, we'll return the download URL with proper headers
    let downloadUrl = video.url;

    if (video.s3Key) {
      try {
        downloadUrl = await getSignedS3ObjectUrl(video.s3Key, 600);
      } catch (error) {
        console.error("Failed to sign private download URL for", id, error);
        downloadUrl = getS3VideoUrl(video.s3Key);
      }
    }

    return NextResponse.json({
      downloadUrl,
      filename: video.filename || video.title,
      contentType: "video/mp4",
    });
  } catch (error) {
    console.error("Video download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
