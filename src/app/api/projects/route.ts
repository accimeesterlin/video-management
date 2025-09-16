import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Project from "@/models/Project";
import User from "@/models/User";
import dbConnect from "@/lib/mongodb";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get user by email first
    const user = await User.findOne({ email: session.user?.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const projects = await Project.find({
      ownerId: user._id,
    })
      .populate("team", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Project name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get user by email first
    const user = await User.findOne({ email: session.user?.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const project = new Project({
      name: name.trim(),
      description: description?.trim() || "",
      ownerId: user._id,
      status: "Active",
      progress: 0,
      team: [],
      tasks: [],
    });

    await project.save();
    await project.populate("team", "name email");

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
