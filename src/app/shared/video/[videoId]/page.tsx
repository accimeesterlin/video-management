"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Download, Share2, Calendar, User, ExternalLink, Video as VideoIcon } from "lucide-react";
import { toast } from "sonner";

interface Video {
  _id: string;
  title: string;
  description: string;
  url: string;
  filename: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  tags: string[];
  isPublic: boolean;
  isExternalLink?: boolean;
  platform?: string | null;
  projectId?: string | null;
  projectInfo?: {
    _id: string;
    name: string;
    status?: string;
    progress?: number;
  } | null;
  thumbnail?: string;
  project?: {
    _id: string;
    name: string;
  };
}

export default function SharedVideoPage() {
  const params = useParams();
  const videoId = params.videoId as string;
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError("Video not found");
          } else if (response.status === 403) {
            setError("This video is not publicly accessible");
          } else {
            setError("Failed to load video");
          }
          return;
        }

        const data = await response.json();

        if (!data.isPublic) {
          setError("This video is not publicly accessible");
          return;
        }

        setVideo(data);
      } catch (error) {
        console.error("Error fetching video:", error);
        setError("Failed to load video");
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchVideo();
    }
  }, [videoId]);

  const extractYouTubeId = (url: string) => {
    const pattern =
      /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?.*v=|embed\/|v\/)|youtu\.be\/)([\w-]{11})/;
    const match = url.match(pattern);
    return match ? match[1] : null;
  };

  const extractVimeoId = (url: string) => {
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : null;
  };

  const extractDailymotionId = (url: string) => {
    const match =
      url.match(/dailymotion\.com\/video\/([^_?#]+)/) ||
      url.match(/dai\.ly\/([^_?#]+)/);
    return match ? match[1] : null;
  };

  const getExternalEmbed = (url: string, platform?: string | null) => {
    const normalizedPlatform = (platform || "").toLowerCase();
    const inferredPlatform = normalizedPlatform
      ? normalizedPlatform
      : url.includes("youtu")
      ? "youtube"
      : url.includes("vimeo")
      ? "vimeo"
      : url.includes("dailymotion") || url.includes("dai.ly")
      ? "dailymotion"
      : "";

    switch (inferredPlatform) {
      case "youtube": {
        const id = extractYouTubeId(url);
        if (id) {
          return {
            type: "iframe" as const,
            src: `https://www.youtube.com/embed/${id}`,
          };
        }
        break;
      }
      case "vimeo": {
        const id = extractVimeoId(url);
        if (id) {
          return {
            type: "iframe" as const,
            src: `https://player.vimeo.com/video/${id}`,
          };
        }
        break;
      }
      case "dailymotion": {
        const id = extractDailymotionId(url);
        if (id) {
          return {
            type: "iframe" as const,
            src: `https://www.dailymotion.com/embed/video/${id}`,
          };
        }
        break;
      }
    }

    return {
      type: "link" as const,
      href: url,
    };
  };

  const triggerFileDownload = (url: string, filename?: string) => {
    const link = document.createElement("a");
    link.href = url;
    if (filename) {
      link.download = filename;
    }
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderVideoContent = () => {
    if (!video) return null;

    if (video.isExternalLink && video.url) {
      const embed = getExternalEmbed(video.url, video.platform);
      if (embed.type === "iframe") {
        return (
          <iframe
            src={embed.src}
            className="w-full h-full"
            title={video.title || "Shared video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        );
      }

      return (
        <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center text-white p-8 space-y-4">
          <VideoIcon className="w-14 h-14 text-gray-500" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">External video link</h3>
            <p className="text-sm text-gray-300">
              This video is hosted externally. Open it in a new tab to watch.
            </p>
          </div>
          <Button
            onClick={() => window.open(video.url, "_blank", "noopener,noreferrer")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Video
          </Button>
        </div>
      );
    }

    if (video.url) {
      return (
        <video
          controls
          className="w-full h-full object-contain"
          preload="metadata"
          poster={video.thumbnail}
          onError={(e) => {
            console.error("Video load error:", e, "URL:", video.url);
            toast.error("Unable to load video. Please try downloading instead.");
          }}
        >
          <source src={video.url} type="video/mp4" />
          <source src={video.url} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center text-white p-8 space-y-2">
        <VideoIcon className="w-14 h-14 text-gray-500" />
        <p className="text-sm text-gray-300">Video preview unavailable.</p>
      </div>
    );
  };

  const handleDownload = async () => {
    if (!video) return;

    if (video.isExternalLink && video.url) {
      window.open(video.url, "_blank", "noopener,noreferrer");
      toast.info("Opening external video source");
      return;
    }

    try {
      const response = await fetch(`/api/videos/${video._id}/download`);

      if (response.ok) {
        const data = await response.json();

        // Create download link
        triggerFileDownload(data.downloadUrl, data.filename || video.title);

        toast.success("Download started");
      } else {
        toast.error("Failed to download video");
      }
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download video");
    }
  };

  const handleShare = () => {
    if (!video) return;

    const shareUrl = window.location.href;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success("Share link copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-4">
            <div className="text-red-500 mb-4">
              <Play className="h-16 w-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Video Not Available
            </h1>
            <p className="text-gray-600 mb-6">
              {error || "This video could not be found"}
            </p>
            <Button
              onClick={() => (window.location.href = "/")}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {video.title}
              </h1>
              <p className="text-sm text-gray-500 mt-1">Shared Video</p>
            </div>
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video bg-black rounded-t-lg overflow-hidden">
                  {renderVideoContent()}
                </div>
              </CardContent>
            </Card>

            {/* Video Details */}
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      Description
                    </h2>
                    <p className="text-gray-600">
                      {video.description || "No description provided"}
                    </p>
                  </div>

                  {video.tags && video.tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {video.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Video Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Video Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Uploaded by</div>
                      <span className="font-medium">
                        {video.uploadedByName || video.uploadedBy}
                      </span>
                    </div>
                  </div>
                  {video.projectInfo?.name && (
                    <div className="flex items-center space-x-3">
                      <VideoIcon className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Project</div>
                        <span className="font-medium">
                          {video.projectInfo.name}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-sm text-gray-500">Uploaded</div>
                      <span className="font-medium">
                        {new Date(video.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {video.project && (
                    <div className="flex items-center space-x-3">
                      <Play className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Project</div>
                        <span className="font-medium">
                          {video.project.name}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Actions
                </h3>
                <div className="space-y-3">
                  <Button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Video</span>
                  </Button>
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="w-full flex items-center justify-center space-x-2"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Copy Share Link</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
