import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
    const { name, type, url, description } = await request.json();

    if (!name || !type || !url) {
      return NextResponse.json(
        { error: "Name, type, and URL are required" },
        { status: 400 }
      );
    }

    const { id } = await params;

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

    const resource = {
      id: new ObjectId().toString(),
      name: name.trim(),
      type,
      url: url.trim(),
      description: description?.trim() || "",
      addedBy: user._id.toString(),
      addedByName: user.name || user.email,
      addedAt: new Date().toISOString(),
    };

    // Add resource to video
    await db.collection("videos").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: { resources: resource as any },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Resource added successfully",
      resource,
    });
  } catch (error) {
    console.error("Resource creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
