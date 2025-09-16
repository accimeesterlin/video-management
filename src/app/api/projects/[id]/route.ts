import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Project from "@/models/Project";
import User from "@/models/User";
import { ObjectId } from "mongodb";

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
