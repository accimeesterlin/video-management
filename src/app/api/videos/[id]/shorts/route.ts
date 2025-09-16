import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generatePresignedUrl, getS3VideoUrl, getSignedS3ObjectUrl } from "@/lib/s3";

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
    const shortFile = formData.get("short") as File;
    const description = formData.get("description") as string;
    const { id } = await params;

    if (!shortFile) {
      return NextResponse.json(
        { error: "Short video file is required" },
        { status: 400 }
      );
    }

    if (!shortFile.type.startsWith('video/')) {
      return NextResponse.json(
        { error: "Please upload a video file" },
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

    // Upload file to S3
    const timestamp = Date.now();
    const sanitizedName = shortFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const shortKey = `shorts/${id}/${timestamp}_${sanitizedName}`;
    
    // Get presigned URL for upload
    const contentType = shortFile.type || "video/mp4";
    const uploadUrl = await generatePresignedUrl(shortKey, contentType);

    // Upload file to S3
    const fileBuffer = Buffer.from(await shortFile.arrayBuffer());
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { error: "Failed to upload short video file" },
        { status: 500 }
      );
    }

    // Get the S3 URL for the short
    const shortUrl = getS3VideoUrl(shortKey);
    const signedShortUrl = await getSignedS3ObjectUrl(shortKey);

    const short = {
      id: new ObjectId().toString(),
      url: shortUrl,
      s3Key: shortKey,
      filename: shortFile.name,
      uploadedBy: user._id.toString(),
      uploadedByName: user.name || user.email,
      uploadedAt: new Date().toISOString(),
      description: description || "",
      duration: 0, // Would be populated by video processing
      size: shortFile.size,
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
      message: "Short uploaded successfully",
      short: {
        ...short,
        url: signedShortUrl,
      },
    });
  } catch (error) {
    console.error("Short creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
