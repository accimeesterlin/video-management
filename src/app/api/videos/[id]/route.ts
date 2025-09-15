import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    // Find the video
    const video = await db.collection("videos").findOne({
      _id: new ObjectId(id),
    });

    if (!video) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
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

    // Convert ObjectId to string for JSON serialization
    const videoData = {
      ...video,
      _id: video._id.toString(),
      uploadedBy: video.uploadedBy.toString(),
      uploadedByName: uploaderName,
      companyId: video.companyId?.toString(),
      comments: video.comments || [],
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
    if (body.project) updateData.project = body.project;
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

    // Delete the video
    await db.collection("videos").deleteOne({ _id: new ObjectId(id) });

    // TODO: Also delete the video file from S3 storage
    // const s3Key = video.s3Key;
    // await deleteFromS3(s3Key);

    return NextResponse.json({ message: "Video deleted successfully" });
  } catch (error) {
    console.error("Video deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
