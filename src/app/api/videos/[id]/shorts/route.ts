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
    const { videoKey, filename, description, size } = await request.json();
    const { id } = await params;

    if (!videoKey || !filename) {
      return NextResponse.json(
        { error: "Video key and filename are required" },
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

    // Create S3 URL (this would be constructed based on your bucket setup)
    const s3Url = `https://your-bucket.s3.amazonaws.com/${videoKey}`;

    const short = {
      id: new ObjectId().toString(),
      url: s3Url,
      filename,
      uploadedBy: user._id.toString(),
      uploadedByName: user.name || user.email,
      uploadedAt: new Date().toISOString(),
      description: description || "",
      duration: 0, // Would be populated by video processing
      size: size || 0,
      votes: [], // Empty votes array
    };

    // Add short to video
    await db.collection("videos").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { shorts: short as any },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Short created successfully",
      short,
    });
  } catch (error) {
    console.error("Short creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}