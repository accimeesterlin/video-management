import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get user data
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if sample videos already exist
    const existingVideos = await db.collection("videos").countDocuments({ 
      uploadedBy: user._id,
      isSample: true 
    });
    
    if (existingVideos > 0) {
      return NextResponse.json({ message: "Sample videos already exist" });
    }

    const sampleVideos = [
      {
        title: "Product Demo Video",
        description: "A comprehensive walkthrough of our latest product features and capabilities.",
        filename: "product_demo.mp4",
        url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        thumbnail: "https://via.placeholder.com/640x360/1f2937/ffffff?text=Product+Demo",
        duration: 120,
        size: 15000000,
        status: "completed",
        project: "Marketing",
        tags: ["demo", "product", "marketing"],
        uploadedBy: user._id,
        uploadedByName: user.name,
        companyId: user.companyId,
        uploadedAt: new Date(Date.now() - 86400000 * 7), // 7 days ago
        comments: [],
        isSample: true,
        createdAt: new Date(Date.now() - 86400000 * 7),
        updatedAt: new Date(Date.now() - 86400000 * 7),
      },
      {
        title: "Team Meeting Recording",
        description: "Weekly team sync meeting discussing project progress and upcoming milestones.",
        filename: "team_meeting_2024.mp4",
        url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_2mb.mp4",
        thumbnail: "https://via.placeholder.com/640x360/1f2937/ffffff?text=Team+Meeting",
        duration: 1800,
        size: 45000000,
        status: "completed",
        project: "Internal",
        tags: ["meeting", "team", "sync"],
        uploadedBy: user._id,
        uploadedByName: user.name,
        companyId: user.companyId,
        uploadedAt: new Date(Date.now() - 86400000 * 5), // 5 days ago
        comments: [
          {
            _id: "comment1",
            author: user.name,
            authorId: user._id,
            content: "Great discussion on the new features!",
            timestamp: 300,
            createdAt: new Date(Date.now() - 86400000 * 4),
          }
        ],
        isSample: true,
        createdAt: new Date(Date.now() - 86400000 * 5),
        updatedAt: new Date(Date.now() - 86400000 * 4),
      },
      {
        title: "Client Presentation Draft",
        description: "Initial draft of the client presentation for Q4 business review.",
        filename: "q4_presentation_draft.mp4",
        url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_5mb.mp4",
        thumbnail: "https://via.placeholder.com/640x360/1f2937/ffffff?text=Client+Presentation",
        duration: 900,
        size: 78000000,
        status: "review",
        project: "Client Work",
        tags: ["presentation", "client", "q4", "draft"],
        uploadedBy: user._id,
        uploadedByName: user.name,
        companyId: user.companyId,
        uploadedAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
        comments: [],
        isSample: true,
        createdAt: new Date(Date.now() - 86400000 * 2),
        updatedAt: new Date(Date.now() - 86400000 * 2),
      },
      {
        title: "Tutorial: Video Editing Basics",
        description: "Step-by-step tutorial covering fundamental video editing techniques and best practices.",
        filename: "editing_tutorial_basics.mp4",
        url: "https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4",
        thumbnail: "https://via.placeholder.com/640x360/1f2937/ffffff?text=Video+Tutorial",
        duration: 2100,
        size: 125000000,
        status: "completed",
        project: "Training",
        tags: ["tutorial", "education", "editing", "basics"],
        uploadedBy: user._id,
        uploadedByName: user.name,
        companyId: user.companyId,
        uploadedAt: new Date(Date.now() - 86400000 * 1), // 1 day ago
        comments: [
          {
            _id: "comment2",
            author: user.name,
            authorId: user._id,
            content: "Really helpful for beginners!",
            timestamp: 1200,
            createdAt: new Date(Date.now() - 86400000 * 1),
          }
        ],
        isSample: true,
        createdAt: new Date(Date.now() - 86400000 * 1),
        updatedAt: new Date(Date.now() - 86400000 * 1),
      }
    ];

    const result = await db.collection("videos").insertMany(sampleVideos);

    return NextResponse.json({
      message: "Sample videos created successfully",
      count: result.insertedCount,
      insertedIds: result.insertedIds
    });
  } catch (error) {
    console.error("Sample video creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get user data
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete sample videos for this user
    const result = await db.collection("videos").deleteMany({ 
      uploadedBy: user._id,
      isSample: true 
    });

    return NextResponse.json({
      message: "Sample videos deleted successfully",
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("Sample video deletion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}