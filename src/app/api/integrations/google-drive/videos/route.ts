import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { googleDriveService } from "@/lib/google-drive";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // In a real implementation, you would check if the user has connected their Google Drive
    // and use their stored credentials

    const videos = await googleDriveService.listVideoFiles();

    // Transform the data to match our interface
    const transformedVideos = (videos || []).map((video: any) => ({
      id: video.id,
      name: video.name,
      mimeType: video.mimeType,
      size: parseInt(video.size || "0"),
      createdTime: video.createdTime,
      webViewLink: video.webViewLink,
      thumbnailLink: video.thumbnailLink,
    }));

    return NextResponse.json(transformedVideos);
  } catch (error) {
    console.error("Google Drive API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos from Google Drive" },
      { status: 500 }
    );
  }
}
