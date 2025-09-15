import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get user
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get tags for the user's company or personal tags
    const query = user.companyId 
      ? { $or: [{ companyId: user.companyId }, { createdBy: user._id }] }
      : { createdBy: user._id };

    const tags = await db.collection("tags")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Calculate usage count for each tag
    const tagsWithUsage = await Promise.all(tags.map(async (tag) => {
      const usageCount = await db.collection("videos").countDocuments({
        tags: tag.name
      });
      return {
        ...tag,
        usage_count: usageCount
      };
    }));

    return NextResponse.json(tagsWithUsage);
  } catch (error) {
    console.error("Tags fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    
    const { name, color, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    // Get user
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if tag already exists
    const existingTag = await db.collection("tags").findOne({
      name: name.trim().toLowerCase(),
      $or: user.companyId 
        ? [{ companyId: user.companyId }, { createdBy: user._id }]
        : [{ createdBy: user._id }]
    });

    if (existingTag) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    }

    const tagData = {
      name: name.trim(),
      color: color || "#3B82F6",
      description: description || "",
      createdBy: user._id,
      companyId: user.companyId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("tags").insertOne(tagData);

    return NextResponse.json({
      _id: result.insertedId,
      ...tagData,
      usage_count: 0
    });
  } catch (error) {
    console.error("Tag creation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}