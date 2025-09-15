import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePresignedUrl, generateVideoKey } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename, contentType, fileSize } = await request.json();

    // Validate file size (max 5GB for videos)
    const maxFileSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (fileSize > maxFileSize) {
      return NextResponse.json(
        { error: "File size too large. Maximum allowed is 5GB." },
        { status: 400 }
      );
    }

    // Validate content type
    const allowedTypes = [
      "video/mp4",
      "video/avi",
      "video/mov",
      "video/quicktime",
      "video/wmv",
      "video/x-flv",
      "video/webm",
    ];

    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid file type. Only video files are allowed." },
        { status: 400 }
      );
    }

    const userId = session.user?.email;
    const videoKey = generateVideoKey(userId, filename);

    // Generate presigned URL with 1 hour expiration
    const uploadUrl = await generatePresignedUrl(videoKey, contentType, 3600);

    return NextResponse.json({
      uploadUrl,
      videoKey,
      maxFileSize,
    });
  } catch (error) {
    console.error("Upload URL generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
