import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const body = await request.json();

    await db.collection("users").updateOne(
      { email: session.user.email },
      { 
        $set: { 
          notificationSettings: body,
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ message: "Notification settings updated successfully" });
  } catch (error) {
    console.error("Notification settings update error:", error);
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

    return NextResponse.json(user.notificationSettings || {
      emailNotifications: true,
      pushNotifications: true,
      projectUpdates: true,
      teamMessages: true,
      deadlineReminders: true,
      weeklyReports: false,
    });
  } catch (error) {
    console.error("Notification settings fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}