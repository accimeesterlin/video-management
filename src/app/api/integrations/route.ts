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

    // Get user's connected integrations
    const userIntegrations = await db
      .collection("user_integrations")
      .find({ userId: user._id })
      .toArray();

    const connectedIds = new Set(userIntegrations.map(int => int.integrationId));

    // Available integrations
    const availableIntegrations = [
      {
        id: "zeptomail",
        name: "ZeptoMail",
        description: "Email service for transactional emails",
        category: "Email",
        icon: "Mail",
        status: connectedIds.has("zeptomail") ? "connected" : "available",
        features: ["Team invitations", "Email notifications", "Marketing emails"],
        requirements: ["API Key", "From Email", "Region"]
      },
      {
        id: "sendgrid",
        name: "SendGrid",
        description: "Cloud-based email delivery platform",
        category: "Email",
        icon: "Mail",
        status: connectedIds.has("sendgrid") ? "connected" : "available",
        features: ["Team invitations", "Email notifications", "Analytics"],
        requirements: ["API Key", "From Email"]
      },
      {
        id: "mailgun",
        name: "Mailgun",
        description: "Email automation service for developers",
        category: "Email",
        icon: "Mail",
        status: connectedIds.has("mailgun") ? "connected" : "available",
        features: ["Team invitations", "Email tracking", "Bulk emails"],
        requirements: ["API Key", "Domain", "Region"]
      },
      {
        id: "google-drive",
        name: "Google Drive",
        description: "Cloud storage and file sharing",
        category: "Storage",
        icon: "HardDrive",
        status: connectedIds.has("google-drive") ? "connected" : "available",
        features: ["File backup", "Video import", "Collaboration"],
        requirements: ["API Key", "Client ID"]
      },
      {
        id: "dropbox",
        name: "Dropbox",
        description: "File hosting and synchronization",
        category: "Storage",
        icon: "HardDrive",
        status: connectedIds.has("dropbox") ? "connected" : "available",
        features: ["File backup", "Video import", "Team folders"],
        requirements: ["Access Token", "App Key"]
      },
      {
        id: "vimeo",
        name: "Vimeo",
        description: "Video hosting and streaming platform",
        category: "Video",
        icon: "Video",
        status: connectedIds.has("vimeo") ? "connected" : "available",
        features: ["Video hosting", "Streaming", "Analytics"],
        requirements: ["Access Token", "Client ID"]
      },
      {
        id: "slack",
        name: "Slack",
        description: "Team communication and collaboration",
        category: "Communication",
        icon: "MessageSquare",
        status: connectedIds.has("slack") ? "connected" : "available",
        features: ["Project notifications", "Team updates", "File sharing"],
        requirements: ["Bot Token", "Webhook URL"]
      },
      {
        id: "zoom",
        name: "Zoom",
        description: "Video conferencing and meetings",
        category: "Communication",
        icon: "Video",
        status: connectedIds.has("zoom") ? "connected" : "available",
        features: ["Meeting recordings", "Team meetings", "Screen sharing"],
        requirements: ["API Key", "API Secret"]
      }
    ];

    return NextResponse.json({
      integrations: availableIntegrations,
      connected: userIntegrations.length,
      available: availableIntegrations.length - userIntegrations.length
    });

  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}