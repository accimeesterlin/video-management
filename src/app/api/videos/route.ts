import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getS3VideoUrl } from "@/lib/s3";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    
    const { videoKey, title, description, project, tags, duration, size } = body;

    // Get user data
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const videoData = {
      title,
      description: description || "",
      filename: videoKey.split('/').pop() || "",
      s3Key: videoKey,
      url: getS3VideoUrl(videoKey),
      duration: duration || 0,
      size: size || 0,
      status: "processing",
      project: project || "General",
      uploadedBy: user._id,
      uploadedByName: user.name,
      companyId: user.companyId,
      uploadedAt: new Date(),
      tags: tags ? tags.split(",").map((t: string) => t.trim()) : [],
      comments: [],
      thumbnail: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("videos").insertOne(videoData);

    return NextResponse.json({
      _id: result.insertedId,
      ...videoData,
    });
  } catch (error) {
    console.error("Video creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get user's company
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const query = user.companyId 
      ? { companyId: user.companyId }
      : { uploadedBy: user._id };

    const videos = await db.collection("videos")
      .find(query)
      .sort({ uploadedAt: -1 })
      .toArray();

    // Enrich videos with uploader names if missing
    const enrichedVideos = await Promise.all(
      videos.map(async (video) => {
        if (!video.uploadedByName && video.uploadedBy) {
          const uploader = await db.collection("users").findOne({ _id: video.uploadedBy });
          return {
            ...video,
            uploadedByName: uploader?.name || uploader?.email || "Unknown User"
          };
        }
        return {
          ...video,
          uploadedByName: video.uploadedByName || "Unknown User"
        };
      })
    );

    return NextResponse.json(enrichedVideos);
  } catch (error) {
    console.error("Videos fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}