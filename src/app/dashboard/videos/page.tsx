"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Share2,
  Globe,
  Link,
  Copy,
  Edit,
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
  uploadedByName?: string;
  uploadedAt: string;
  thumbnail?: string;
  url?: string;
  tags: string[];
  isPublic?: boolean;
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
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingVideo, setSharingVideo] = useState<VideoItem | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [editingVideoInline, setEditingVideoInline] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project: "",
    tags: "",
  });

  useEffect(() => {
    if (session) {
      fetchVideos();
      fetchProjects();
      fetchTags();
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

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        // Set first project as default if none selected
        if (data.length > 0 && !formData.project) {
          setFormData(prev => ({ ...prev, project: data[0].name }));
        }
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const uploadToS3 = async (file: File, uploadUrl: string, onProgress?: (progress: number) => void) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.response);
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let completedFiles = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileIndex = i + 1;
        
        setUploadStatus(`Preparing ${file.name} (${fileIndex}/${totalFiles})...`);
        
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

        // Upload file to S3 with progress
        setUploadStatus(`Uploading ${file.name} (${fileIndex}/${totalFiles})...`);
        await uploadToS3(file, uploadUrl, (fileProgress) => {
          // Calculate overall progress: completed files + current file progress
          const overallProgress = ((completedFiles * 100) + fileProgress) / totalFiles;
          setUploadProgress(Math.round(overallProgress));
        });

        // Create video record in database
        setUploadStatus(`Processing ${file.name} (${fileIndex}/${totalFiles})...`);
        const allTags = selectedTags.length > 0 
          ? selectedTags.join(", ") + (formData.tags ? ", " + formData.tags : "")
          : formData.tags;

        const videoResponse = await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoKey,
            title: formData.title || file.name.replace(/\.[^/.]+$/, ""),
            description: formData.description,
            project: formData.project || "General",
            tags: allTags,
            size: file.size,
          }),
        });

        if (!videoResponse.ok) {
          toast.error("Failed to create video record");
          continue;
        }

        const newVideo = await videoResponse.json();
        setVideos((prev) => [newVideo, ...prev]);

        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      toast.success(`${selectedFiles.length} video(s) uploaded successfully`);
      setShowUploadModal(false);
      setSelectedFiles([]);
      setSelectedTags([]);
      setFormData({ title: "", description: "", project: "", tags: "" });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error uploading videos");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"],
    },
    multiple: true,
    maxSize: 5 * 1024 * 1024 * 1024, // 5GB
    onDropRejected: (fileRejections) => {
      fileRejections.forEach((rejection) => {
        if (rejection.errors.some((error) => error.code === "file-too-large")) {
          toast.error(
            `${rejection.file.name} is too large. Maximum file size is 5GB.`
          );
        } else if (
          rejection.errors.some((error) => error.code === "file-invalid-type")
        ) {
          toast.error(
            `${rejection.file.name} is not a supported video format.`
          );
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
    setSelectedFiles([]);
    setSelectedTags([]);
  };

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleShareVideo = (video: VideoItem) => {
    setSharingVideo(video);
    setShowShareModal(true);
  };

  const handleTogglePublic = async (videoId: string, isPublic: boolean) => {
    try {
      const response = await fetch(`/api/videos/${videoId}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });

      if (response.ok) {
        // Update local state immediately
        setVideos(prev => 
          prev.map(video => 
            video._id === videoId 
              ? { ...video, isPublic, status: isPublic ? "public" : "private" }
              : video
          )
        );
        
        // Update sharing video state if it's the one being edited
        if (sharingVideo?._id === videoId) {
          setSharingVideo(prev => prev ? { ...prev, isPublic, status: isPublic ? "public" : "private" } : null);
        }
        
        toast.success(`Video ${isPublic ? 'made public' : 'made private'} successfully`);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update video sharing");
      }
    } catch (error) {
      toast.error("Error updating video sharing");
    }
  };

  const copyShareLink = (video: VideoItem) => {
    const shareUrl = `${window.location.origin}/shared/video/${video._id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Share link copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const handleVideoClick = (videoId: string) => {
    router.push(`/dashboard/videos/${videoId}`);
  };

  const handlePreviewVideo = (video: VideoItem) => {
    setPreviewVideo(video);
    setShowPreviewModal(true);
  };

  const startQuickEdit = (video: VideoItem) => {
    setEditingVideoInline(video._id);
    setQuickEditData({
      title: video.title,
      project: video.project,
      tags: video.tags.join(", ")
    });
  };

  const cancelQuickEdit = () => {
    setEditingVideoInline(null);
    setQuickEditData({});
  };

  const saveQuickEdit = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: quickEditData.title,
          project: quickEditData.project,
          tags: quickEditData.tags
        })
      });

      if (response.ok) {
        // Update local state
        setVideos(prev => 
          prev.map(video => 
            video._id === videoId 
              ? { 
                  ...video, 
                  title: quickEditData.title,
                  project: quickEditData.project,
                  tags: quickEditData.tags.split(",").map(t => t.trim()).filter(t => t)
                }
              : video
          )
        );
        
        toast.success("Video updated successfully");
        setEditingVideoInline(null);
        setQuickEditData({});
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update video");
      }
    } catch (error) {
      toast.error("Error updating video");
    }
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
              className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleVideoClick(video._id)}
              onMouseEnter={() => setHoveredVideo(video._id)}
              onMouseLeave={() => setHoveredVideo(null)}
            >
              <CardHeader className="pb-4">
                <div className="relative aspect-video bg-gray-100 rounded-lg flex items-center justify-center mb-3 group">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : video.url ? (
                    <video
                      className="w-full h-full object-cover rounded-lg"
                      muted
                      poster={video.thumbnail}
                    >
                      <source src={video.url} type="video/mp4" />
                    </video>
                  ) : (
                    <Video className="h-12 w-12 text-gray-400" />
                  )}
                  
                  {/* Preview overlay */}
                  {hoveredVideo === video._id && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreviewVideo(video);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                  )}
                  
                  {/* Duration badge */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {formatDuration(video.duration)}
                  </div>
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    {editingVideoInline === video._id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={quickEditData.title || ''}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Video title"
                        />
                        <input
                          type="text"
                          value={quickEditData.project || ''}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, project: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Project name"
                        />
                        <input
                          type="text"
                          value={quickEditData.tags || ''}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, tags: e.target.value }))}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Tags (comma separated)"
                        />
                      </div>
                    ) : (
                      <>
                        <h3
                          className="font-semibold text-gray-900 text-sm truncate"
                          title={video.title}
                        >
                          {video.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {video.project}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex space-x-1 ml-2">
                    {editingVideoInline === video._id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveQuickEdit(video._id);
                          }}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 p-1"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelQuickEdit();
                          }}
                          className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startQuickEdit(video);
                          }}
                          className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1"
                          title="Quick Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareVideo(video);
                          }}
                          className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVideo(video._id);
                          }}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
                      {video.uploadedByName || video.uploadedBy}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600 truncate">{file.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                          className="text-gray-400 hover:text-red-600 p-1 h-6 w-6"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Upload Progress</span>
                    <span className="text-sm text-gray-500">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  {uploadStatus && (
                    <p className="text-sm text-gray-600">{uploadStatus}</p>
                  )}
                </div>
              )}

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
                    disabled={uploading}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
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
                    disabled={uploading}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Describe your video"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <select
                    value={formData.project}
                    onChange={(e) =>
                      setFormData({ ...formData, project: e.target.value })
                    }
                    disabled={uploading}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  >
                    <option value="">Select project (optional)</option>
                    {projects.map((project) => (
                      <option key={project._id} value={project.name}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tag Selection */}
                {tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                      {tags.map((tag) => (
                        <label key={tag._id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedTags.includes(tag.name)}
                            onChange={() => handleTagToggle(tag.name)}
                            disabled={uploading}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <span className="text-sm text-gray-700">#{tag.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    {selectedTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedTags.map((tagName) => {
                          const tag = tags.find(t => t.name === tagName);
                          return (
                            <span
                              key={tagName}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: tag?.color || "#3B82F6" }}
                            >
                              #{tagName}
                              <button
                                onClick={() => handleTagToggle(tagName)}
                                disabled={uploading}
                                className="ml-1 hover:bg-black/20 rounded-full p-0.5"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Tags (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    disabled={uploading}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                    placeholder="Enter additional tags (comma separated)"
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
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ` : ""}Videos
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      {showEditModal && editingVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
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

      {/* Share Video Modal */}
      {showShareModal && sharingVideo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Share Video
              </h3>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setSharingVideo(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Video Info */}
              <div className="flex items-center space-x-3">
                <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Video className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{sharingVideo.title}</h4>
                  <p className="text-sm text-gray-500">{sharingVideo.project}</p>
                </div>
              </div>

              {/* Public Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">Make Public</h4>
                      <p className="text-sm text-gray-500">Anyone with the link can view</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sharingVideo.isPublic || false}
                      onChange={(e) => handleTogglePublic(sharingVideo._id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Share Link */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Share Link</h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 font-mono">
                      {`${window.location.origin}/shared/video/${sharingVideo._id}`}
                    </div>
                    <Button
                      onClick={() => copyShareLink(sharingVideo)}
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {sharingVideo.isPublic 
                      ? "This link is publicly accessible" 
                      : "Only team members can access this link"}
                  </p>
                </div>

                {/* Share Options */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Share Options</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => {
                        const url = encodeURIComponent(`${window.location.origin}/shared/video/${sharingVideo._id}`);
                        const text = encodeURIComponent(`Check out this video: ${sharingVideo.title}`);
                        window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-blue-500 border-blue-200 hover:bg-blue-50"
                    >
                      Twitter
                    </Button>
                    <Button
                      onClick={() => {
                        const url = encodeURIComponent(`${window.location.origin}/shared/video/${sharingVideo._id}`);
                        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                      }}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      Facebook
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowShareModal(false);
                  setSharingVideo(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {showPreviewModal && previewVideo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Play className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{previewVideo.title}</h3>
                  <p className="text-sm text-gray-500">{previewVideo.project}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewVideo(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                {previewVideo.url ? (
                  <video
                    controls
                    autoPlay
                    className="w-full h-full"
                    poster={previewVideo.thumbnail}
                  >
                    <source src={previewVideo.url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                      <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Video Preview</p>
                      <p className="text-sm opacity-75">Video file not available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm">
                    {previewVideo.description || "No description available"}
                  </p>
                  
                  {previewVideo.tags.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {previewVideo.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Duration:</span>
                      <span className="text-gray-900">{formatDuration(previewVideo.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Size:</span>
                      <span className="text-gray-900">{formatFileSize(previewVideo.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(previewVideo.status)}`}>
                        {previewVideo.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uploaded:</span>
                      <span className="text-gray-900">
                        {new Date(previewVideo.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center p-6 border-t border-gray-100">
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleShareVideo(previewVideo)}
                  variant="outline"
                  size="sm"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  onClick={() => openEditModal(previewVideo)}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleVideoClick(previewVideo._id);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
