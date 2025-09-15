import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; thumbnailId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id, thumbnailId } = await params;

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

    // Find the thumbnail
    const thumbnailIndex = video.thumbnails?.findIndex(
      (thumb: any) => thumb.id === thumbnailId
    );

    if (thumbnailIndex === undefined || thumbnailIndex === -1) {
      return NextResponse.json(
        { error: "Thumbnail not found" },
        { status: 404 }
      );
    }

    const thumbnail = video.thumbnails[thumbnailIndex];

    // Check if user already voted
    const existingVoteIndex = thumbnail.votes.findIndex(
      (vote: any) => vote.userId === user._id.toString()
    );

    let message = "";
    if (existingVoteIndex !== -1) {
      // Remove existing vote
      thumbnail.votes.splice(existingVoteIndex, 1);
      message = "Vote removed";
    } else {
      // Add new vote
      thumbnail.votes.push({
        userId: user._id.toString(),
        userName: user.name || user.email,
        votedAt: new Date().toISOString(),
      });
      message = "Vote added";
    }

    // Update the video in database
    await db.collection("videos").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          [`thumbnails.${thumbnailIndex}`]: thumbnail,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message,
      thumbnail,
    });
  } catch (error) {
    console.error("Thumbnail vote error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
