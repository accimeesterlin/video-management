import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const { id, versionId } = await params;

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

    // Find the version
    const versionIndex = video.versions?.findIndex(
      (version: any) => version.id === versionId
    );

    if (versionIndex === undefined || versionIndex === -1) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    // Update all versions to inactive, then set the selected one to active
    const updatedVersions = video.versions.map((version: any, index: number) => ({
      ...version,
      isActive: index === versionIndex,
    }));

    // Update the video with new version statuses
    await db.collection("videos").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          versions: updatedVersions,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      message: "Version activated successfully",
      activeVersion: updatedVersions[versionIndex],
    });
  } catch (error) {
    console.error("Version activation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}