import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { googleDriveService } from "@/lib/google-drive";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileId, fileName, project, tags } = await request.json();

    if (!fileId || !fileName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Get user
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get file metadata from Google Drive
    const fileMetadata = await googleDriveService.getFileMetadata(fileId);

    // Generate S3 upload URL
    const uploadUrlResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/videos/upload-url`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": request.headers.get("cookie") || ""
      },
      body: JSON.stringify({
        filename: fileName,
        contentType: fileMetadata.mimeType,
        fileSize: parseInt(fileMetadata.size || '0'),
      }),
    });

    if (!uploadUrlResponse.ok) {
      return NextResponse.json({ error: "Failed to get S3 upload URL" }, { status: 500 });
    }

    const { uploadUrl, videoKey } = await uploadUrlResponse.json();

    // Import file from Google Drive to S3
    await googleDriveService.importVideoToS3(fileId, uploadUrl);

    // Create video record in database
    const videoData = {
      videoKey,
      title: fileName.replace(/\.[^/.]+$/, ""),
      description: `Imported from Google Drive`,
      project: project || "Google Drive Import",
      tags: tags || "",
      size: parseInt(fileMetadata.size || '0'),
      uploadedBy: user._id,
      companyId: user.companyId,
      uploadedAt: new Date(),
      status: "Ready",
      googleDriveId: fileId,
      importedFrom: "google-drive"
    };

    const result = await db.collection("videos").insertOne(videoData);

    // Return the created video with proper ID
    const newVideo = {
      ...videoData,
      _id: result.insertedId.toString(),
      uploadedBy: user.name || user.email
    };

    return NextResponse.json({ 
      message: "Video imported successfully",
      video: newVideo
    });
  } catch (error) {
    console.error("Google Drive import error:", error);
    return NextResponse.json(
      { error: "Failed to import video from Google Drive" }, 
      { status: 500 }
    );
  }
}