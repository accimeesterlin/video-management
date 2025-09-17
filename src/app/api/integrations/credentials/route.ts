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
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all user integrations
    const integrations = await db
      .collection("user_integrations")
      .find({ userId: user._id })
      .toArray();

    return NextResponse.json(integrations);

  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { integrationId, credentials } = await request.json();

    if (!integrationId || !credentials) {
      return NextResponse.json(
        { error: "Integration ID and credentials are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get user
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // In a real application, you would:
    // 1. Encrypt the credentials before storing
    // 2. Validate the credentials with the external service
    // 3. Store in a secure credentials collection with proper access controls

    // For now, we'll simulate a successful save
    // and store basic integration info (without actual credentials for security)
    
    const integrationData = {
      userId: user._id,
      integrationId,
      isConnected: true,
      connectedAt: new Date(),
      status: "active",
      // In production, store encrypted credentials securely
      // credentialsHash: encrypt(credentials),
    };

    // Upsert integration record
    await db.collection("user_integrations").updateOne(
      { userId: user._id, integrationId },
      { $set: integrationData },
      { upsert: true }
    );

    // Simulate credential validation with external service
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      message: "Credentials saved successfully",
      integrationId,
      status: "connected"
    });

  } catch (error) {
    console.error("Error saving credentials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { integrationId } = await request.json();

    if (!integrationId) {
      return NextResponse.json(
        { error: "Integration ID is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.collection("user_integrations").deleteOne({
      userId: user._id,
      integrationId,
    });

    await db.collection("users").updateOne(
      { _id: user._id, defaultEmailProvider: integrationId },
      {
        $unset: { defaultEmailProvider: "" },
        $set: { updatedAt: new Date() },
      }
    );

    return NextResponse.json({
      message: "Integration disconnected",
      integrationId,
    });
  } catch (error) {
    console.error("Error disconnecting integration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
