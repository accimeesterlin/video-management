import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from "crypto";
import { getS3VideoUrl, getSignedUploadUrl } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoKey, contentType = "image/jpeg" } = await request.json();

    if (!videoKey) {
      return NextResponse.json(
        { error: "Video key is required" },
        { status: 400 }
      );
    }

    const baseKey = videoKey
      .replace(/^videos\//, "")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9/_-]/g, "");

    const uniqueSuffix = randomUUID();
    const timestamp = Date.now();
    const thumbnailKey = `thumbnails/${baseKey}-${timestamp}-${uniqueSuffix}.jpg`;

    // Get presigned URL for S3 upload
    const uploadUrl = await getSignedUploadUrl(thumbnailKey, contentType);

    return NextResponse.json({
      uploadUrl,
      thumbnailKey,
      publicUrl: getS3VideoUrl(thumbnailKey),
    });
  } catch (error) {
    console.error("Thumbnail upload URL generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
