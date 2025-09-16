import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Video URL is required" }, { status: 400 });
    }

    const encodedUrl = encodeURIComponent(url);
    const noEmbedEndpoint = `https://noembed.com/embed?url=${encodedUrl}`;

    const response = await fetch(noEmbedEndpoint, {
      headers: {
        "User-Agent": "video-editor-management/1.0",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ metadata: null });
    }

    const data = await response.json();

    return NextResponse.json({
      metadata: {
        title: data.title || null,
        thumbnailUrl: data.thumbnail_url || null,
        providerName: data.provider_name || null,
        duration: typeof data.duration === "number" ? data.duration : null,
      },
    });
  } catch (error) {
    console.error("Link metadata fetch error:", error);
    return NextResponse.json({ metadata: null });
  }
}
