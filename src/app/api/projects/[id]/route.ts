import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect, { connectToDatabase } from "@/lib/mongodb";
import Project from "@/models/Project";
import User from "@/models/User";
import { ObjectId } from "mongodb";
import {
  getSignedS3ObjectUrl,
  getS3VideoUrl,
  inferS3KeyFromUrl,
} from "@/lib/s3";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { db } = await connectToDatabase();

    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const project = await Project.findById(id).populate("team", "name email");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isOwner = project.ownerId.toString() === user._id.toString();
    const isTeamMember = project.team
      ?.map((member: any) => member._id?.toString?.() || member.toString())
      .includes(user._id.toString());

    if (!isOwner && !isTeamMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const projectData = project.toObject();
    projectData._id = projectData._id.toString();
    projectData.ownerId = projectData.ownerId?.toString();
    projectData.companyId = projectData.companyId?.toString();
    projectData.team = projectData.team?.map((member: any) => ({
      _id: member._id?.toString?.() || member.toString(),
      name: member.name,
      email: member.email,
    }));

    const videoQuery: any = {
      $or: [
        { projectId: new ObjectId(id) },
        { project: project.name },
      ],
    };

    if (user.companyId) {
      videoQuery.companyId = user.companyId;
    } else {
      videoQuery.uploadedBy = user._id;
    }

    const videos = await db
      .collection("videos")
      .find(videoQuery)
      .sort({ uploadedAt: -1 })
      .toArray();

    const enrichedVideos = await Promise.all(
      videos.map(async (video) => {
        let signedVideoUrl = video.url;
        if (video.s3Key) {
          try {
            signedVideoUrl = await getSignedS3ObjectUrl(video.s3Key);
          } catch (error) {
            console.error("Failed to sign project video URL", video._id?.toString(), error);
            signedVideoUrl = getS3VideoUrl(video.s3Key);
          }
        }

        let signedThumbnailUrl = video.thumbnail;
        const thumbnailKey = video.thumbnailKey || inferS3KeyFromUrl(video.thumbnail);
        if (thumbnailKey) {
          try {
            signedThumbnailUrl = await getSignedS3ObjectUrl(thumbnailKey);
          } catch (error) {
            console.error("Failed to sign project thumbnail URL", video._id?.toString(), error);
          }
        }

        return {
          ...video,
          _id: video._id?.toString?.() || video._id,
          uploadedBy: video.uploadedBy?.toString?.() || video.uploadedBy,
          companyId: video.companyId?.toString?.() || video.companyId,
          projectId: video.projectId?.toString?.() || null,
          url: signedVideoUrl,
          thumbnail: signedThumbnailUrl,
        };
      })
    );

    const stats = {
      totalVideos: enrichedVideos.length,
      totalDuration: enrichedVideos.reduce(
        (sum: number, video: any) => sum + (video.duration || 0),
        0
      ),
      totalSize: enrichedVideos.reduce(
        (sum: number, video: any) => sum + (video.size || 0),
        0
      ),
    };

    return NextResponse.json({
      project: projectData,
      videos: enrichedVideos,
      stats,
    });
  } catch (error) {
    console.error("Project fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, status, progress, startDate, endDate, team } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const { id } = await params;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    // Get current user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the project and verify ownership/access
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user has permission to edit (owner or team member)
    const hasAccess =
      project.ownerId.toString() === user._id.toString() ||
      (project.team && project.team.includes(user._id.toString()));

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Build update object
    const updateData: any = {
      name: name.trim(),
      description: description || "",
      updatedAt: new Date(),
    };

    // Add optional fields if provided
    if (status && ["Active", "On Hold", "Completed", "Cancelled"].includes(status)) {
      updateData.status = status;
    }
    
    if (typeof progress === 'number' && progress >= 0 && progress <= 100) {
      updateData.progress = progress;
    }
    
    if (startDate) {
      updateData.startDate = new Date(startDate);
    }
    
    if (endDate) {
      updateData.endDate = new Date(endDate);
    }
    
    if (Array.isArray(team)) {
      // Convert team member names to user IDs if needed
      // For now, just store the names as provided
      updateData.team = team;
    }

    // Update the project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate("team", "name email");

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid project ID" }, { status: 400 });
    }

    // Get current user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the project and verify ownership
    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only owner can delete
    if (project.ownerId.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Only project owner can delete the project" },
        { status: 403 }
      );
    }

    // Delete the project
    await Project.findByIdAndDelete(id);

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Project deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
