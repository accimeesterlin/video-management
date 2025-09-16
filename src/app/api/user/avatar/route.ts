import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getS3VideoUrl, getSignedS3ObjectUrl } from "@/lib/s3";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { avatarKey } = await request.json();

    if (!avatarKey) {
      return NextResponse.json(
        { error: "Avatar key is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Update user's avatar in database
    const result = await db
      .collection("users")
      .updateOne(
        { email: session.user.email },
        { 
          $set: { 
            avatar: avatarKey,
            updatedAt: new Date()
          } 
        }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate signed URL for the avatar
    let avatarUrl;
    try {
      avatarUrl = await getSignedS3ObjectUrl(avatarKey);
    } catch (error) {
      console.error("Failed to generate signed URL for avatar:", error);
      // Fallback to unsigned URL
      avatarUrl = getS3VideoUrl(avatarKey);
    }

    return NextResponse.json({
      message: "Avatar updated successfully",
      avatarUrl,
    });
  } catch (error) {
    console.error("Avatar update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}