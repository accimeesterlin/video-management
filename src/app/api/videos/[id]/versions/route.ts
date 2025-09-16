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
    const versionFile = formData.get("version") as File;
    const description = formData.get("description") as string;
    const { id } = await params;

    if (!versionFile) {
      return NextResponse.json(
        { error: "Version video file is required" },
        { status: 400 }
      );
    }

    if (!versionFile.type.startsWith('video/')) {
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

    // Get next version number
    const maxVersion = video.versions?.reduce((max: number, v: any) => 
      Math.max(max, v.versionNumber), 0) || 0;
    const versionNumber = maxVersion + 1;

    // Upload file to S3
    const timestamp = Date.now();
    const sanitizedName = versionFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const versionKey = `versions/${id}/${timestamp}_v${versionNumber}_${sanitizedName}`;
    
    // Get presigned URL for upload
    const contentType = versionFile.type || "video/mp4";
    const uploadUrl = await generatePresignedUrl(versionKey, contentType);

    // Upload file to S3
    const fileBuffer = Buffer.from(await versionFile.arrayBuffer());
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { error: "Failed to upload version video file" },
        { status: 500 }
      );
    }

    // Get the S3 URL for the version
    const versionUrl = getS3VideoUrl(versionKey);
    const signedVersionUrl = await getSignedS3ObjectUrl(versionKey);

    const version = {
      id: new ObjectId().toString(),
      versionNumber,
      url: versionUrl,
      s3Key: versionKey,
      filename: versionFile.name,
      uploadedBy: user._id.toString(),
      uploadedByName: user.name || user.email,
      uploadedAt: new Date().toISOString(),
      description: description || "",
      size: versionFile.size,
      duration: 0, // Would be populated by video processing
      isActive: false, // New versions are not active by default
    };

    // Add version to video
    await db.collection("videos").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { versions: version as any },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Version uploaded successfully",
      version: {
        ...version,
        url: signedVersionUrl,
      },
    });
  } catch (error) {
    console.error("Version creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
