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

    // Upload file to S3
    const timestamp = Date.now();
    const sanitizedName = thumbnailFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const thumbnailKey = `thumbnails/${id}/${timestamp}_${sanitizedName}`;
    
    // Get presigned URL for upload
    const contentType = thumbnailFile.type || "image/jpeg";
    const uploadUrl = await generatePresignedUrl(thumbnailKey, contentType);

    // Upload file to S3
    const fileBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { error: "Failed to upload thumbnail file" },
        { status: 500 }
      );
    }

    // Get the S3 URL for the thumbnail
    const baseThumbnailUrl = getS3VideoUrl(thumbnailKey);
    const signedThumbnailUrl = await getSignedS3ObjectUrl(thumbnailKey);

    const thumbnail = {
      id: new ObjectId().toString(),
      url: baseThumbnailUrl,
      s3Key: thumbnailKey,
      filename: thumbnailFile.name,
      size: thumbnailFile.size,
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
      thumbnail: {
        ...thumbnail,
        url: signedThumbnailUrl,
      },
    });
  } catch (error) {
    console.error("Thumbnail upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
