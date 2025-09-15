import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
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

    const { db } = await connectToDatabase();
    const body = await request.json();

    const { name, color, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Tag name is required" },
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

    // Find the tag and verify ownership
    const tag = await db.collection("tags").findOne({
      _id: new ObjectId(id),
      $or: user.companyId
        ? [{ companyId: user.companyId }, { createdBy: user._id }]
        : [{ createdBy: user._id }],
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found or access denied" },
        { status: 404 }
      );
    }

    // Check if another tag with the same name exists (excluding current tag)
    const existingTag = await db.collection("tags").findOne({
      _id: { $ne: new ObjectId(id) },
      name: name.trim().toLowerCase(),
      $or: user.companyId
        ? [{ companyId: user.companyId }, { createdBy: user._id }]
        : [{ createdBy: user._id }],
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "Tag with this name already exists" },
        { status: 409 }
      );
    }

    // Update the tag
    const updateData = {
      name: name.trim(),
      color: color || tag.color,
      description: description || "",
      updatedAt: new Date(),
    };

    await db
      .collection("tags")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    // If tag name changed, update all videos that use this tag
    if (tag.name !== name.trim()) {
      await db
        .collection("videos")
        .updateMany({ tags: tag.name }, { $set: { "tags.$": name.trim() } });
    }

    // Get updated tag with usage count
    const updatedTag = await db
      .collection("tags")
      .findOne({ _id: new ObjectId(id) });
    const usageCount = await db.collection("videos").countDocuments({
      tags: updatedTag?.name,
    });

    return NextResponse.json({
      ...updatedTag,
      usage_count: usageCount,
    });
  } catch (error) {
    console.error("Tag update error:", error);
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

    const { db } = await connectToDatabase();

    const { id } = await params;

    // Get user
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the tag and verify ownership
    const tag = await db.collection("tags").findOne({
      _id: new ObjectId(id),
      $or: user.companyId
        ? [{ companyId: user.companyId }, { createdBy: user._id }]
        : [{ createdBy: user._id }],
    });

    if (!tag) {
      return NextResponse.json(
        { error: "Tag not found or access denied" },
        { status: 404 }
      );
    }

    // Remove tag from all videos
    await db
      .collection("videos")
      .updateMany({ tags: tag.name }, { $pull: { tags: tag.name } });

    // Delete the tag
    await db.collection("tags").deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error("Tag deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
