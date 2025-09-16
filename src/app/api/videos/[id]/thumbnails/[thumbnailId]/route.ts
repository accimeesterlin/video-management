import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { deleteS3Object, inferS3KeyFromUrl } from "@/lib/s3";

export async function DELETE(
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
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const video = await db.collection("videos").findOne({ _id: new ObjectId(id) });
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

    const thumbnail = (video.thumbnails || []).find((item: any) => item.id === thumbnailId);
    if (!thumbnail) {
      return NextResponse.json({ error: "Thumbnail not found" }, { status: 404 });
    }

    const thumbnailKey = thumbnail.s3Key || inferS3KeyFromUrl(thumbnail.url);
    if (thumbnailKey) {
      try {
        await deleteS3Object(thumbnailKey);
      } catch (s3Error) {
        console.error("Failed to delete thumbnail from S3", thumbnailKey, s3Error);
      }
    }

    await db.collection("videos").updateOne(
      { _id: new ObjectId(id) },
      {
        $pull: { thumbnails: { id: thumbnailId } as any },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({ message: "Thumbnail deleted successfully" });
  } catch (error) {
    console.error("Thumbnail deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
