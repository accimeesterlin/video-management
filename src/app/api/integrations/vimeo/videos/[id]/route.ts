import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { vimeoService } from "@/lib/vimeo";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const video = await vimeoService.getVideo(id);

    return NextResponse.json({
      success: true,
      data: video,
    });
  } catch (error) {
    console.error("Vimeo get video error:", error);
    return NextResponse.json(
      { error: "Failed to get video from Vimeo" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { id } = await params;
    const result = await vimeoService.updateVideo(id, data);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Vimeo update video error:", error);
    return NextResponse.json(
      { error: "Failed to update video on Vimeo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await vimeoService.deleteVideo(id);

    return NextResponse.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Vimeo delete video error:", error);
    return NextResponse.json(
      { error: "Failed to delete video from Vimeo" },
      { status: 500 }
    );
  }
}
