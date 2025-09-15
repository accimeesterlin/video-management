import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
    const formData = await request.formData();
    const thumbnailFile = formData.get("thumbnail") as File;
    const { id } = await params;

    if (!thumbnailFile) {
      return NextResponse.json(
        { error: "No thumbnail file provided" },
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

    // In a real implementation, you would upload the file to S3 or similar storage
    // For now, we'll simulate with a placeholder URL
    const thumbnailUrl = `/api/placeholder/thumbnail/${Date.now()}.jpg`;

    const thumbnail = {
      id: new ObjectId().toString(),
      url: thumbnailUrl,
      uploadedBy: user._id.toString(),
      uploadedByName: user.name || user.email,
      uploadedAt: new Date().toISOString(),
      votes: [],
    };

    // Add thumbnail to video
    await db.collection("videos").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { thumbnails: thumbnail as any },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Thumbnail uploaded successfully",
      thumbnail,
    });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
