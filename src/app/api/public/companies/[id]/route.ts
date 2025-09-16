import { NextRequest, NextResponse } from "next/server";
import dbConnect, { connectToDatabase } from "@/lib/mongodb";
import Company from "@/models/Company";
import {
  getSignedS3ObjectUrl,
  getS3VideoUrl,
  inferS3KeyFromUrl,
} from "@/lib/s3";
import { ObjectId } from "mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid company id" }, { status: 400 });
    }

    await dbConnect();
    const { db } = await connectToDatabase();

    const companyDoc = await Company.findById(id).lean();
    if (!companyDoc) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const actualCompany = Array.isArray(companyDoc) ? companyDoc[0] : companyDoc;
    
    const company = {
      _id: actualCompany._id?.toString(),
      name: actualCompany.name,
      description: actualCompany.description || "",
      website: actualCompany.website || "",
      industry: actualCompany.industry || "",
      size: actualCompany.size || "",
      founded: actualCompany.founded || "",
      location: actualCompany.location || "",
      logo: actualCompany.logo || "",
      createdAt: actualCompany.createdAt,
    };

    const videoCursor = db
      .collection("videos")
      .find({
        companyId: new ObjectId(id),
        isPublic: true,
      })
      .sort({ uploadedAt: -1 });

    const videosRaw = await videoCursor.toArray();

    const videos = await Promise.all(
      videosRaw.map(async (video) => {
        let videoUrl = video.url;
        if (video.s3Key) {
          try {
            videoUrl = await getSignedS3ObjectUrl(video.s3Key);
          } catch (error) {
            console.error("Failed to sign company video URL", video._id?.toString(), error);
            videoUrl = getS3VideoUrl(video.s3Key);
          }
        }

        let thumbnailUrl = video.thumbnail;
        const thumbnailKey = video.thumbnailKey || inferS3KeyFromUrl(video.thumbnail);
        if (thumbnailKey) {
          try {
            thumbnailUrl = await getSignedS3ObjectUrl(thumbnailKey);
          } catch (error) {
            console.error("Failed to sign company thumbnail URL", video._id?.toString(), error);
          }
        }

        return {
          _id: video._id?.toString?.() || video._id,
          title: video.title,
          description: video.description,
          duration: video.duration,
          size: video.size,
          uploadedAt: video.uploadedAt,
          tags: video.tags || [],
          thumbnail: thumbnailUrl,
          url: videoUrl,
        };
      })
    );

    const stats = {
      totalVideos: videos.length,
      totalDuration: videos.reduce((sum, video) => sum + (video.duration || 0), 0),
    };

    return NextResponse.json({ company, videos, stats });
  } catch (error) {
    console.error("Public company fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
