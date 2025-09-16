import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { getSignedS3ObjectUrl, getS3VideoUrl } from "@/lib/s3";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();
    
    const { name, phone, location, bio } = body;

    await db.collection("users").updateOne(
      { email: session.user.email },
      { 
        $set: { 
          name,
          phone,
          location,
          bio,
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile update error:", error);
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
    const user = await db.collection("users").findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate signed URL for avatar if it exists
    let avatarUrl = `https://via.placeholder.com/100x100/3B82F6/FFFFFF?text=${user.name?.charAt(0) || 'U'}`;
    if (user.avatar) {
      try {
        avatarUrl = await getSignedS3ObjectUrl(user.avatar);
      } catch (error) {
        console.error("Failed to generate signed URL for avatar:", error);
        // Fallback to unsigned URL
        avatarUrl = getS3VideoUrl(user.avatar);
      }
    }

    return NextResponse.json({
      name: user.name,
      email: user.email,
      role: user.role || "Company Owner",
      phone: user.phone || "",
      location: user.location || "",
      bio: user.bio || "",
      avatar: avatarUrl
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}