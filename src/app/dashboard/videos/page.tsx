"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  Plus,
  Upload,
  Play,
  Pause,
  Clock,
  Users,
  Calendar,
  FileText,
  Download,
  Trash2,
  X,
  Save,
  Eye,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";

interface VideoItem {
  _id: string;
  title: string;
  description: string;
  filename: string;
  duration: number;
  size: number;
  status: string;
  project: string;
  uploadedBy: string;
  uploadedAt: string;
  thumbnail?: string;
  tags: string[];
  comments: Array<{
    id: string;
    text: string;
    timestamp: number;
    author: string;
    createdAt: string;
  }>;
}

export default function VideosPage() {
  const { data: session } = useSession();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project: "",
    tags: "",
  });

  useEffect(() => {
    if (session) {
      fetchVideos();
    }
  }, [session]);

  const fetchVideos = async () => {
    try {
      const response = await fetch("/api/videos");
      if (response.ok) {
        const data = await response.json();
        setVideos(data);
      } else {
        toast.error("Failed to fetch videos");
      }
    } catch (error) {
      toast.error("Error fetching videos");
    } finally {
      setLoading(false);
    }
  };

  const uploadToS3 = async (file: File, uploadUrl: string) => {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to upload to S3");
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);

      try {
        for (const file of acceptedFiles) {
          // Get presigned URL for S3 upload
          const uploadUrlResponse = await fetch("/api/videos/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              fileSize: file.size,
            }),
          });

          if (!uploadUrlResponse.ok) {
            const error = await uploadUrlResponse.json();
            toast.error(error.error || "Failed to get upload URL");
            continue;
          }

          const { uploadUrl, videoKey } = await uploadUrlResponse.json();

          // Upload file to S3
          await uploadToS3(file, uploadUrl);

          // Create video record in database
          const videoResponse = await fetch("/api/videos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              videoKey,
              title: formData.title || file.name.replace(/\.[^/.]+$/, ""),
              description: formData.description,
              project: formData.project || "General",
              tags: formData.tags,
              size: file.size,
            }),
          });

          if (!videoResponse.ok) {
            toast.error("Failed to create video record");
            continue;
          }

          const newVideo = await videoResponse.json();
          setVideos((prev) => [newVideo, ...prev]);
        }

        toast.success(`${acceptedFiles.length} video(s) uploaded successfully`);
        setShowUploadModal(false);
        setFormData({ title: "", description: "", project: "", tags: "" });
      } catch (error) {
        console.error("Upload error:", error);
        toast.error("Error uploading videos");
      } finally {
        setUploading(false);
      }
    },
    [formData, session]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"],
    },
    multiple: true,
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    onDropRejected: (fileRejections) => {
      fileRejections.forEach((rejection) => {
        if (rejection.errors.some(error => error.code === 'file-too-large')) {
          toast.error(`${rejection.file.name} is too large. Maximum file size is 5GB.`);
        } else if (rejection.errors.some(error => error.code === 'file-invalid-type')) {
          toast.error(`${rejection.file.name} is not a supported video format.`);
        }
      });
    },
  });

  const handleEditVideo = async () => {
    if (!editingVideo) return;

    try {
      // In real app, this would update via API
      toast.success("Video updated successfully");
      setShowEditModal(false);
      setEditingVideo(null);
      setFormData({ title: "", description: "", project: "", tags: "" });
      fetchVideos();
    } catch (error) {
      toast.error("Error updating video");
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) {
      return;
    }

    try {
      // In real app, this would delete via API
      setVideos((prev) => prev.filter((v) => v._id !== videoId));
      toast.success("Video deleted successfully");
    } catch (error) {
      toast.error("Error deleting video");
    }
  };

  const openEditModal = (video: VideoItem) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description,
      project: video.project,
      tags: video.tags.join(", "),
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", project: "", tags: "" });
    setEditingVideo(null);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Ready":
        return "bg-green-100 text-green-800";
      case "Processing":
        return "bg-yellow-100 text-yellow-800";
      case "Error":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Videos</h1>
          <p className="text-gray-600 mt-2">
            Upload, organize, and manage your video content
          </p>
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm"
        >
          <Upload className="h-5 w-5 mr-2" />
          Upload Video
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Video className="h-4 w-4 mr-2 text-blue-500" />
              Total Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {videos.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">All videos</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Play className="h-4 w-4 mr-2 text-green-500" />
              Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {videos.filter((v) => v.status === "Ready").length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Ready to use</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-yellow-500" />
              Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {videos.filter((v) => v.status === "Processing").length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Currently processing</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-purple-500" />
              Total Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {formatFileSize(videos.reduce((sum, v) => sum + v.size, 0))}
            </div>
            <p className="text-sm text-gray-500 mt-1">Storage used</p>
          </CardContent>
        </Card>
      </div>

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-16 text-center">
            <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No videos yet
            </h3>
            <p className="text-gray-500 mb-6">
              Upload your first video to get started
            </p>
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload First Video
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <Card
              key={video._id}
              className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-4">
                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Video className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold text-gray-900 text-sm truncate"
                      title={video.title}
                    >
                      {video.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {video.project}
                    </p>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(video)}
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteVideo(video._id)}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDuration(video.duration)}
                    </span>
                    <span>{formatFileSize(video.size)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {video.uploadedBy}
                    </span>
                    <span className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(video.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                        video.status
                      )}`}
                    >
                      {video.status}
                    </span>
                    {video.comments.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {video.comments.length} comment
                        {video.comments.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {video.tags.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{video.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Upload Videos
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {isDragActive ? (
                  <p className="text-blue-600 font-medium">
                    Drop the videos here...
                  </p>
                ) : (
                  <div>
                    <p className="text-gray-600 font-medium mb-2">
                      Drag & drop videos here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports MP4, AVI, MOV, WMV, FLV, WebM (Max 5GB per file)
                    </p>
                  </div>
                )}
              </div>

              {/* Upload Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter video title (will use filename if empty)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your video"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.project}
                    onChange={(e) =>
                      setFormData({ ...formData, project: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter tags (comma separated)"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowUploadModal(false);
                  resetForm();
                }}
                variant="outline"
                className="flex-1 py-3 border-gray-200 text-gray-700 hover:bg-gray-50"
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={() => onDrop([])}
                disabled={uploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Videos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      {showEditModal && editingVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit Video
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe your video"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <input
                  type="text"
                  value={formData.project}
                  onChange={(e) =>
                    setFormData({ ...formData, project: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tags (comma separated)"
                />
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                variant="outline"
                className="flex-1 py-3 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditVideo}
                disabled={!formData.title.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
