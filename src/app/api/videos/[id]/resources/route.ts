import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generatePresignedUrl, getS3VideoUrl, getSignedS3ObjectUrl } from "@/lib/s3";

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
    const formData = await request.formData();
    const resourceFile = formData.get("resource") as File;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!resourceFile || !name) {
      return NextResponse.json(
        { error: "Resource file and name are required" },
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

    // Upload file to S3
    const timestamp = Date.now();
    const sanitizedName = resourceFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const resourceKey = `resources/${id}/${timestamp}_${sanitizedName}`;
    
    // Get presigned URL for upload
    const contentType = resourceFile.type || "application/octet-stream";
    const uploadUrl = await generatePresignedUrl(resourceKey, contentType);

    // Upload file to S3
    const fileBuffer = Buffer.from(await resourceFile.arrayBuffer());
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { error: "Failed to upload resource file" },
        { status: 500 }
      );
    }

    // Get the S3 URL for the resource
    const resourceUrl = getS3VideoUrl(resourceKey);
    const signedResourceUrl = await getSignedS3ObjectUrl(resourceKey);

    const resource = {
      id: new ObjectId().toString(),
      name: name.trim(),
      type: contentType,
      url: resourceUrl,
      s3Key: resourceKey,
      filename: resourceFile.name,
      size: resourceFile.size,
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
      message: "Resource uploaded successfully",
      resource: {
        ...resource,
        url: signedResourceUrl,
      },
    });
  } catch (error) {
    console.error("Resource creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
