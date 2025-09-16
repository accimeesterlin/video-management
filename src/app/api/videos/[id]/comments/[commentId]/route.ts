import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { text } = await request.json();
    const { id, commentId } = await params;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Comment text is required" },
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

    // Find video and verify access
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

    // Find and update the comment
    const commentIndex = video.comments?.findIndex(
      (comment: any) => comment.id === commentId
    );

    if (commentIndex === undefined || commentIndex === -1) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    const updatedComment = {
      ...video.comments[commentIndex],
      text: text.trim(),
      updatedAt: new Date().toISOString(),
    };

    // Update the video in database
    await db.collection("videos").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [`comments.${commentIndex}`]: updatedComment,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Comment updated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Comment update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id, commentId } = await params;

    // Get user
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find video and verify access
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

    // Remove comment from video
    await db.collection("videos").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { comments: { id: commentId } as any },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Comment deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}