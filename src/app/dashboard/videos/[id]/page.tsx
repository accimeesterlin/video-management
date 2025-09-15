"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Video,
  ArrowLeft,
  Play,
  Download,
  Share2,
  Edit,
  Trash2,
  Clock,
  Calendar,
  User,
  Tag,
  MessageCircle,
  Heart,
  Eye,
  MoreVertical,
  Plus,
  X,
  Link,
  ExternalLink,
  FileText,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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
  tags: string[];
  isPublic?: boolean;
  url?: string;
  thumbnails?: Array<{
    id: string;
    url: string;
    uploadedBy: string;
    uploadedByName: string;
    uploadedAt: string;
    votes: Array<{
      userId: string;
      userName: string;
      votedAt: string;
    }>;
  }>;
  resources?: Array<{
    id: string;
    name: string;
    type: 'link' | 'file' | 'document';
    url: string;
    description?: string;
    addedBy: string;
    addedByName: string;
    addedAt: string;
  }>;
  comments: Array<{
    id: string;
    text: string;
    timestamp: number;
    author: string;
    createdAt: string;
  }>;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [addingResource, setAddingResource] = useState(false);
  const [resourceData, setResourceData] = useState({
    name: "",
    type: "link" as 'link' | 'file' | 'document',
    url: "",
    description: ""
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    tags: ""
  });

  useEffect(() => {
    if (session && params.id) {
      fetchVideo(params.id as string);
    }
  }, [session, params.id]);

  const fetchVideo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        setVideo(data);
      } else {
        toast.error("Failed to fetch video details");
        router.push("/dashboard/videos");
      }
    } catch (error) {
      toast.error("Error fetching video details");
      router.push("/dashboard/videos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!video || !confirm("Are you sure you want to delete this video?")) {
      return;
    }

    try {
      const response = await fetch(`/api/videos/${video._id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Video deleted successfully");
        router.push("/dashboard/videos");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete video");
      }
    } catch (error) {
      toast.error("Error deleting video");
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    if (!video) return;
    
    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      
      const response = await fetch(`/api/videos/${video._id}/thumbnails`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setVideo(prev => prev ? {
          ...prev,
          thumbnails: [...(prev.thumbnails || []), result.thumbnail]
        } : null);
        toast.success('Thumbnail uploaded successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to upload thumbnail');
      }
    } catch (error) {
      toast.error('Error uploading thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleThumbnailVote = async (thumbnailId: string) => {
    if (!video) return;

    try {
      const response = await fetch(`/api/videos/${video._id}/thumbnails/${thumbnailId}/vote`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setVideo(prev => prev ? {
          ...prev,
          thumbnails: prev.thumbnails?.map(thumb => 
            thumb.id === thumbnailId ? result.thumbnail : thumb
          )
        } : null);
        toast.success(result.message);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to vote');
      }
    } catch (error) {
      toast.error('Error voting on thumbnail');
    }
  };

  const handleAddComment = async () => {
    if (!video || !newComment.trim()) return;

    setAddingComment(true);
    try {
      const response = await fetch(`/api/videos/${video._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment.trim() }),
      });

      if (response.ok) {
        const result = await response.json();
        setVideo(prev => prev ? {
          ...prev,
          comments: [...prev.comments, result.comment]
        } : null);
        setNewComment('');
        toast.success('Comment added successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add comment');
      }
    } catch (error) {
      toast.error('Error adding comment');
    } finally {
      setAddingComment(false);
    }
  };

  const handleAddResource = async () => {
    if (!video || !resourceData.name.trim() || !resourceData.url.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setAddingResource(true);
    try {
      const response = await fetch(`/api/videos/${video._id}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resourceData),
      });

      if (response.ok) {
        const result = await response.json();
        setVideo(prev => prev ? {
          ...prev,
          resources: [...(prev.resources || []), result.resource]
        } : null);
        setResourceData({
          name: "",
          type: "link",
          url: "",
          description: ""
        });
        setShowResourceModal(false);
        toast.success('Resource added successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add resource');
      }
    } catch (error) {
      toast.error('Error adding resource');
    } finally {
      setAddingResource(false);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!video || !confirm("Are you sure you want to delete this resource?")) return;

    try {
      const response = await fetch(`/api/videos/${video._id}/resources/${resourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setVideo(prev => prev ? {
          ...prev,
          resources: prev.resources?.filter(resource => resource.id !== resourceId)
        } : null);
        toast.success('Resource deleted successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete resource');
      }
    } catch (error) {
      toast.error('Error deleting resource');
    }
  };

  const handleEditVideo = () => {
    if (!video) return;
    setEditFormData({
      title: video.title,
      description: video.description,
      tags: video.tags.join(", ")
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!video) return;

    try {
      const response = await fetch(`/api/videos/${video._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          tags: editFormData.tags
        })
      });

      if (response.ok) {
        const result = await response.json();
        setVideo(prev => prev ? {
          ...prev,
          title: editFormData.title,
          description: editFormData.description,
          tags: editFormData.tags.split(",").map(t => t.trim()).filter(t => t)
        } : null);
        toast.success("Video updated successfully");
        setShowEditModal(false);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update video");
      }
    } catch (error) {
      toast.error("Error updating video");
    }
  };

  const handleDownload = () => {
    if (!video?.url) {
      toast.error("Video URL not available");
      return;
    }
    
    // Create download link
    const link = document.createElement('a');
    link.href = video.url;
    link.download = video.filename || video.title;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started");
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleTogglePublic = async (isPublic: boolean) => {
    if (!video) return;

    try {
      const response = await fetch(`/api/videos/${video._id}/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });

      if (response.ok) {
        setVideo(prev => prev ? { ...prev, isPublic } : null);
        toast.success(`Video ${isPublic ? 'made public' : 'made private'} successfully`);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update video sharing");
      }
    } catch (error) {
      toast.error("Error updating video sharing");
    }
  };

  const copyShareLink = () => {
    if (!video) return;
    const shareUrl = `${window.location.origin}/shared/video/${video._id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Share link copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
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
      case "public":
        return "bg-green-100 text-green-800";
      case "Processing":
        return "bg-yellow-100 text-yellow-800";
      case "Error":
        return "bg-red-100 text-red-800";
      case "private":
        return "bg-gray-100 text-gray-800";
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

  if (!video) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Video not found</p>
        <Button onClick={() => router.push("/dashboard/videos")} className="mt-4">
          Back to Videos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/videos")}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Videos
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{video.title}</h1>
            <p className="text-gray-600 mt-1">{video.project}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={handleEditVideo}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                {video.url ? (
                  <video
                    src={video.url}
                    controls
                    className="w-full h-full rounded-lg"
                    poster={video.thumbnail}
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div className="text-center text-white">
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Video Preview</p>
                    <p className="text-sm opacity-75">{video.filename}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Video Info */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle>Video Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-gray-600 leading-relaxed">
                      {video.description}
                    </p>
                  )}
                </div>

                {video.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {video.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Thumbnails Section */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Play className="h-5 w-5 mr-2" />
                  Thumbnails ({video.thumbnails?.length || 0})
                </CardTitle>
                <Button
                  onClick={() => setShowThumbnailModal(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Thumbnail
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {video.thumbnails && video.thumbnails.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {video.thumbnails.map((thumbnail) => (
                    <div key={thumbnail.id} className="space-y-2">
                      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={thumbnail.url}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center">
                          <Heart className="h-3 w-3 mr-1" />
                          {thumbnail.votes.length}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          by {thumbnail.uploadedByName}
                        </div>
                        <Button
                          onClick={() => handleThumbnailVote(thumbnail.id)}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          <Heart className="h-3 w-3 mr-1" />
                          Vote
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Play className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No thumbnails yet</p>
                  <p className="text-sm text-gray-400">
                    Upload thumbnails for team voting
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resources Section */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Link className="h-5 w-5 mr-2" />
                  Resources ({video.resources?.length || 0})
                </CardTitle>
                <Button
                  onClick={() => setShowResourceModal(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {video.resources && video.resources.length > 0 ? (
                <div className="space-y-3">
                  {video.resources.map((resource) => (
                    <div key={resource.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          resource.type === 'link' ? 'bg-blue-100 text-blue-600' :
                          resource.type === 'file' ? 'bg-green-100 text-green-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          {resource.type === 'link' ? <ExternalLink className="h-4 w-4" /> :
                           resource.type === 'file' ? <Download className="h-4 w-4" /> :
                           <FileText className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{resource.name}</h4>
                          <p className="text-sm text-gray-500 truncate">{resource.description || resource.url}</p>
                          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                            <span>Added by {resource.addedByName}</span>
                            <span>•</span>
                            <span>{new Date(resource.addedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => window.open(resource.url, '_blank')}
                          size="sm"
                          variant="outline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteResource(resource.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Link className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No resources yet</p>
                  <p className="text-sm text-gray-400">
                    Add useful links, files, or documents
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Comments ({video.comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Comment Form */}
              <div className="mb-6 space-y-3">
                <div className="flex space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || addingComment}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {addingComment ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Adding...
                          </>
                        ) : (
                          "Add Comment"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {video.comments.length > 0 ? (
                <div className="space-y-4">
                  {video.comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {comment.author.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-sm font-medium text-gray-900">
                            {comment.author}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No comments yet</p>
                  <p className="text-sm text-gray-400">
                    Be the first to leave a comment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Video Stats */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle>Video Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    Duration
                  </div>
                  <span className="font-medium">
                    {formatDuration(video.duration)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <Download className="h-4 w-4 mr-2" />
                    File Size
                  </div>
                  <span className="font-medium">
                    {formatFileSize(video.size)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    Uploaded
                  </div>
                  <span className="font-medium">
                    {new Date(video.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    Uploaded by
                  </div>
                  <span className="font-medium">{video.uploadedByName || video.uploadedBy}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <Eye className="h-4 w-4 mr-2" />
                    Status
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(
                      video.status
                    )}`}
                  >
                    {video.status}
                  </span>
                </div>
                {video.isPublic !== undefined && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-600">
                      <Share2 className="h-4 w-4 mr-2" />
                      Visibility
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${
                        video.isPublic
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {video.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project Info */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900">{video.project}</h4>
                  <p className="text-sm text-gray-500">Project Name</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push("/dashboard/projects")}
                >
                  View Project Details
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => router.push('/dashboard/projects')}
                >
                  <Play className="h-4 w-4 mr-2" />
                  View Project
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Video
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Video
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setShowThumbnailModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Thumbnail
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setShowResourceModal(true)}
                >
                  <Link className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Thumbnail Upload Modal */}
      {showThumbnailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Upload Thumbnail</h3>
              <button
                onClick={() => setShowThumbnailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose Thumbnail
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleThumbnailUpload(file);
                        setShowThumbnailModal(false);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={uploadingThumbnail}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Upload a thumbnail image for team voting
                  </p>
                </div>

                {uploadingThumbnail && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-sm text-gray-600">Uploading thumbnail...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => setShowThumbnailModal(false)}
                variant="outline"
                disabled={uploadingThumbnail}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resource Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Add Resource</h3>
              <button
                onClick={() => {
                  setShowResourceModal(false);
                  setResourceData({ name: "", type: "link", url: "", description: "" });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resource Name *
                </label>
                <input
                  type="text"
                  value={resourceData.name}
                  onChange={(e) => setResourceData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter resource name"
                  disabled={addingResource}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type *
                </label>
                <select
                  value={resourceData.type}
                  onChange={(e) => setResourceData(prev => ({ ...prev, type: e.target.value as 'link' | 'file' | 'document' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={addingResource}
                >
                  <option value="link">Link</option>
                  <option value="file">File</option>
                  <option value="document">Document</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={resourceData.url}
                  onChange={(e) => setResourceData(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                  disabled={addingResource}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={resourceData.description}
                  onChange={(e) => setResourceData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Brief description of the resource"
                  disabled={addingResource}
                />
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowResourceModal(false);
                  setResourceData({ name: "", type: "link", url: "", description: "" });
                }}
                variant="outline"
                className="flex-1"
                disabled={addingResource}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddResource}
                disabled={!resourceData.name.trim() || !resourceData.url.trim() || addingResource}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addingResource ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  'Add Resource'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Modal */}
      {showEditModal && video && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Edit Video</h3>
              <button
                onClick={() => setShowEditModal(false)}
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
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter video title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Enter video description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={editFormData.tags}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tags (comma separated)"
                />
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => setShowEditModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editFormData.title.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Video Modal */}
      {showShareModal && video && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Share Video</h3>
              <button
                onClick={() => setShowShareModal(false)}
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
                  <h4 className="font-medium text-gray-900">{video.title}</h4>
                  <p className="text-sm text-gray-500">{video.project}</p>
                </div>
              </div>

              {/* Public Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">Make Public</h4>
                      <p className="text-sm text-gray-500">Anyone with the link can view</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={video.isPublic || false}
                      onChange={(e) => handleTogglePublic(e.target.checked)}
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
                      {`${window.location.origin}/shared/video/${video._id}`}
                    </div>
                    <Button
                      onClick={copyShareLink}
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {video.isPublic 
                      ? "This link is publicly accessible" 
                      : "Only team members can access this link"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-100">
              <Button
                onClick={() => setShowShareModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}