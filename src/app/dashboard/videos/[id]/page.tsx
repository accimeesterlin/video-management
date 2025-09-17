"use client";

import { useState, useEffect, useRef } from "react";
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
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Upload,
  Scissors,
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
  projectId?: string | null;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  thumbnail?: string;
  thumbnailKey?: string;
  s3Key?: string;
  tags: string[];
  isPublic?: boolean;
  isExternalLink?: boolean;
  platform?: string | null;
  url?: string;
  thumbnails?: Array<{
    id: string;
    url: string;
    s3Key?: string | null;
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
    type: "link" | "file" | "document";
    url: string;
    s3Key?: string | null;
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
  versions?: Array<{
    id: string;
    versionNumber: number;
    url: string;
    s3Key?: string | null;
    filename: string;
    uploadedBy: string;
    uploadedByName: string;
    uploadedAt: string;
    description?: string;
    size: number;
    duration?: number;
    isActive: boolean;
  }>;
  shorts?: Array<{
    id: string;
    url: string;
    s3Key?: string | null;
    filename: string;
    uploadedBy: string;
    uploadedByName: string;
    uploadedAt: string;
    description?: string;
    duration: number;
    size: number;
    votes: Array<{
      userId: string;
      userName: string;
      votedAt: string;
    }>;
  }>;
  projectInfo?: {
    _id: string;
    name: string;
    status?: string;
    progress?: number;
  } | null;
}

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showThumbnailsModal, setShowThumbnailsModal] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showShortsModal, setShowShortsModal] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingResource, setUploadingResource] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [uploadingShort, setUploadingShort] = useState(false);
  const [generatingThumbnail, setGeneratingThumbnail] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [editSelectedTags, setEditSelectedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    tags: "",
    status: "",
    project: "",
    isPublic: false,
  });
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  // Modal refs for click outside detection
  const editModalRef = useRef<HTMLDivElement>(null);
  const shareModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (session && params.id) {
      fetchVideo(params.id as string);
    }
  }, [session, params.id]);

  useEffect(() => {
    if (session) {
      fetchAvailableTags();
    }
  }, [session]);

  // Handle click outside modals
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        editModalRef.current &&
        !editModalRef.current.contains(event.target as Node)
      ) {
        setShowEditModal(false);
      }
      if (
        shareModalRef.current &&
        !shareModalRef.current.contains(event.target as Node)
      ) {
        setShowShareModal(false);
      }
    };

    if (showEditModal || showShareModal || showThumbnailsModal || showResourcesModal || showVersionsModal || showShortsModal) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEditModal, showShareModal, showThumbnailsModal, showResourcesModal, showVersionsModal, showShortsModal]);

  const fetchVideo = async (videoId: string) => {
    try {
      const response = await fetch(`/api/videos/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        setVideo(data);
        if (Array.isArray(data.tags)) {
          setAvailableTags((prev) =>
            Array.from(
              new Set([
                ...prev,
                ...data.tags.filter((tag: string) => typeof tag === "string" && tag.trim()),
              ])
            )
          );
        }
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

  const fetchAvailableTags = async () => {
    if (!session?.user) return;
    try {
      setLoadingTags(true);
      const response = await fetch("/api/tags");
      if (response.ok) {
        const data = await response.json();
        const tagNames = Array.isArray(data)
          ? data
              .map((tag: any) => tag?.name)
              .filter((name: string | undefined) => typeof name === "string" && name.trim())
          : [];
        if (tagNames.length > 0) {
          setAvailableTags((prev) =>
            Array.from(new Set([...prev, ...tagNames.map((name) => name.trim())]))
          );
        }
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoadingTags(false);
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

  const handleAddComment = async () => {
    if (!video || !newComment.trim()) return;

    setAddingComment(true);
    try {
      const response = await fetch(`/api/videos/${video._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newComment.trim() }),
      });

      if (response.ok) {
        const result = await response.json();
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                comments: [...prev.comments, result.comment],
              }
            : null
        );
        setNewComment("");
        toast.success("Comment added successfully");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to add comment");
      }
    } catch (error) {
      toast.error("Error adding comment");
    } finally {
      setAddingComment(false);
    }
  };

  const handleEditComment = (commentId: string, text: string) => {
    setEditingComment(commentId);
    setEditCommentText(text);
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!video || !editCommentText.trim()) return;

    try {
      const response = await fetch(
        `/api/videos/${video._id}/comments/${commentId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editCommentText.trim() }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.map((comment) =>
                  comment.id === commentId ? result.comment : comment
                ),
              }
            : null
        );
        setEditingComment(null);
        setEditCommentText("");
        toast.success("Comment updated successfully");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update comment");
      }
    } catch (error) {
      toast.error("Error updating comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!video || !confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      const response = await fetch(
        `/api/videos/${video._id}/comments/${commentId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                comments: prev.comments.filter(
                  (comment) => comment.id !== commentId
                ),
              }
            : null
        );
        toast.success("Comment deleted successfully");
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete comment");
      }
    } catch (error) {
      toast.error("Error deleting comment");
    }
  };

  const handleEditVideo = () => {
    if (!video) return;
    setEditFormData({
      title: video.title,
      description: video.description,
      tags: "",
      status: video.status,
      project: video.project,
      isPublic: video.isPublic || false,
    });
    setEditSelectedTags(video.tags || []);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!video) return;

    try {
      const manualTags = editFormData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);
      const combinedTags = Array.from(
        new Set([...editSelectedTags, ...manualTags])
      );

      const response = await fetch(`/api/videos/${video._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          tags: combinedTags,
          status: editFormData.status,
          project: editFormData.project,
          isPublic: editFormData.isPublic,
        }),
      });

      if (response.ok) {
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                title: editFormData.title,
                description: editFormData.description,
                status: editFormData.status,
                project: editFormData.project,
                isPublic: editFormData.isPublic,
                tags: combinedTags,
                projectInfo: prev.projectInfo
                  ? { ...prev.projectInfo, name: editFormData.project }
                  : prev.projectInfo,
              }
            : null
        );
        if (combinedTags.length > 0) {
          setAvailableTags((prev) =>
            Array.from(new Set([...prev, ...combinedTags]))
          );
        }
        setEditSelectedTags(combinedTags);
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

  const handleDownload = async () => {
    if (!video) {
      toast.error("Video not available");
      return;
    }

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
        const error = await response.json();
        toast.error(error.message || "Failed to download video");
      }
    } catch (error) {
      toast.error("Error downloading video");
    }
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
        setVideo((prev) => (prev ? { ...prev, isPublic } : null));
        toast.success(
          `Video ${isPublic ? "made public" : "made private"} successfully`
        );
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
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success("Share link copied to clipboard");
      })
      .catch(() => {
      toast.error("Failed to copy link");
      });
  };

  const toggleEditTag = (tagName: string) => {
    setEditSelectedTags((prev) =>
      prev.includes(tagName)
        ? prev.filter((tag) => tag !== tagName)
        : [...prev, tagName]
    );
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

  const navigateToProject = () => {
    if (!video?.projectInfo?._id) return;
    router.push(`/dashboard/projects/${video.projectInfo._id}`);
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !video) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingThumbnail(true);

    try {
      const formData = new FormData();
      formData.append('thumbnail', file);

      const response = await fetch(`/api/videos/${video._id}/thumbnails`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Thumbnail uploaded successfully');
        fetchVideo(video._id); // Refresh video data
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to upload thumbnail');
      }
    } catch (error) {
      toast.error('Error uploading thumbnail');
    } finally {
      if (input) {
        input.value = "";
      }
      setUploadingThumbnail(false);
    }
  };

  const handleShortUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !video) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    setUploadingShort(true);

    try {
      const formData = new FormData();
      formData.append('short', file);

      const response = await fetch(`/api/videos/${video._id}/shorts`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Short uploaded successfully');
        fetchVideo(video._id); // Refresh video data
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to upload short');
      }
    } catch (error) {
      toast.error('Error uploading short');
    } finally {
      if (input) {
        input.value = "";
      }
      setUploadingShort(false);
    }
  };

  const handleVersionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !video) return;

    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    setUploadingVersion(true);

    try {
      const formData = new FormData();
      formData.append('version', file);

      const response = await fetch(`/api/videos/${video._id}/versions`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Version uploaded successfully');
        fetchVideo(video._id); // Refresh video data
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to upload version');
      }
    } catch (error) {
      toast.error('Error uploading version');
    } finally {
      if (input) {
        input.value = "";
      }
      setUploadingVersion(false);
    }
  };

  const handleResourceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !video) return;

    setUploadingResource(true);

    try {
      const formData = new FormData();
      formData.append('resource', file);
      formData.append('name', file.name);
      formData.append('description', '');

      const response = await fetch(`/api/videos/${video._id}/resources`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Resource uploaded successfully');
        fetchVideo(video._id); // Refresh video data
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to upload resource');
      }
    } catch (error) {
      toast.error('Error uploading resource');
    } finally {
      if (input) {
        input.value = "";
      }
      setUploadingResource(false);
    }
  };

  const handleDeleteThumbnail = async (thumbnailId: string) => {
    if (!video) return;
    if (!confirm("Delete this thumbnail?")) return;

    const targetThumbnail = (video.thumbnails || []).find(
      (item: any) => item.id === thumbnailId
    );

    try {
      const response = await fetch(`/api/videos/${video._id}/thumbnails/${thumbnailId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Thumbnail deleted');
        setVideo((prev) => {
          if (!prev) return prev;
          const remainingThumbnails = (prev.thumbnails || []).filter(
            (thumb: any) => thumb.id !== thumbnailId
          );

          const nextPrimary =
            prev.thumbnail && targetThumbnail?.url === prev.thumbnail
              ? remainingThumbnails[0]?.url || undefined
              : prev.thumbnail;

          return {
            ...prev,
            thumbnails: remainingThumbnails,
            thumbnail: nextPrimary,
          };
        });
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete thumbnail');
      }
    } catch (error) {
      toast.error('Error deleting thumbnail');
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!video) return;
    if (!confirm("Delete this resource?")) return;

    try {
      const response = await fetch(`/api/videos/${video._id}/resources/${resourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Resource deleted');
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                resources: (prev.resources || []).filter((resource: any) => resource.id !== resourceId),
              }
            : prev
        );
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete resource');
      }
    } catch (error) {
      toast.error('Error deleting resource');
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!video) return;
    if (!confirm("Delete this version?")) return;

    try {
      const response = await fetch(`/api/videos/${video._id}/versions/${versionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Version deleted');
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                versions: (prev.versions || []).filter((version: any) => version.id !== versionId),
              }
            : prev
        );
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete version');
      }
    } catch (error) {
      toast.error('Error deleting version');
    }
  };

  const handleDeleteShort = async (shortId: string) => {
    if (!video) return;
    if (!confirm("Delete this short?")) return;

    try {
      const response = await fetch(`/api/videos/${video._id}/shorts/${shortId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Short deleted');
        setVideo((prev) =>
          prev
            ? {
                ...prev,
                shorts: (prev.shorts || []).filter((short: any) => short.id !== shortId),
              }
            : prev
        );
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete short');
      }
    } catch (error) {
      toast.error('Error deleting short');
    }
  };

  const handleGenerateThumbnail = async () => {
    if (!video) return;

    setGeneratingThumbnail(true);
    try {
      const response = await fetch(`/api/videos/${video._id}/generate-thumbnail`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Thumbnail generated successfully');
        setVideo((prev) => prev ? {
          ...prev,
          thumbnail: result.thumbnail,
        } : prev);
        fetchVideo(video._id);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to generate thumbnail');
      }
    } catch (error) {
      toast.error('Error generating thumbnail');
    } finally {
      setGeneratingThumbnail(false);
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

  const tagOptions = Array.from(
    new Set([...availableTags, ...editSelectedTags])
  );

  const extractYouTubeId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const extractVimeoId = (url: string) => {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /vimeo\.com\/video\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const extractDailymotionId = (url: string) => {
    const patterns = [
      /dailymotion\.com\/video\/([^_?#]+)/,
      /dai\.ly\/([^_?#]+)/,
      /dailymotion\.com\/embed\/video\/([^_?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getExternalEmbed = (url: string, platform?: string | null) => {
    const normalizedPlatform = (platform || "").toLowerCase();
    let inferredPlatform = normalizedPlatform;
    
    // Auto-detect platform if not provided
    if (!inferredPlatform) {
      if (url.includes("youtu.be") || url.includes("youtube.com")) {
        inferredPlatform = "youtube";
      } else if (url.includes("vimeo.com")) {
        inferredPlatform = "vimeo";
      } else if (url.includes("dailymotion.com") || url.includes("dai.ly")) {
        inferredPlatform = "dailymotion";
      }
    }

    switch (inferredPlatform) {
      case "youtube": {
        const id = extractYouTubeId(url);
        if (id) {
          return {
            type: "iframe" as const,
            src: `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`,
          };
        }
        break;
      }
      case "vimeo": {
        const id = extractVimeoId(url);
        if (id) {
          return {
            type: "iframe" as const,
            src: `https://player.vimeo.com/video/${id}?autoplay=0`,
          };
        }
        break;
      }
      case "dailymotion": {
        const id = extractDailymotionId(url);
        if (id) {
          return {
            type: "iframe" as const,
            src: `https://www.dailymotion.com/embed/video/${id}?autoplay=0`,
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

  const renderVideoContent = () => {
    if (!video) return null;

    // Check if this is an external video (either flagged or detected by URL pattern)
    const isExternalVideo = video.isExternalLink || 
      (video.url && (
        video.url.includes('youtube.com') || 
        video.url.includes('youtu.be') || 
        video.url.includes('vimeo.com') || 
        video.url.includes('dailymotion.com') || 
        video.url.includes('dai.ly')
      ));

    if (isExternalVideo && video.url) {
      const embed = getExternalEmbed(video.url, video.platform);
      
      if (embed.type === "iframe") {
        return (
          <iframe
            src={embed.src}
            className="w-full h-full rounded-lg border-0"
            title={video.title || "External video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        );
      }

      return (
        <div className="w-full h-full bg-gray-800 rounded-lg flex flex-col items-center justify-center text-white p-8 space-y-4">
          <Video className="w-14 h-14 text-gray-400" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium">External video link</h3>
            <p className="text-gray-300 text-sm" data-testid="external-video-message">
              This video is hosted externally. Open it in a new tab to watch.
            </p>
            <p className="text-gray-400 text-xs">URL: {video.url}</p>
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
          className="w-full h-full rounded-lg"
          poster={
            video.thumbnail ||
            `https://via.placeholder.com/640x360/1f2937/ffffff?text=${encodeURIComponent(
              video.title || "Video"
            )}`
          }
          preload="metadata"
          onError={(e) => {
            console.error("Video load error:", e, "URL:", video.url);
            const videoElement = e.target as HTMLVideoElement;
            const container = videoElement.parentElement;
            if (container) {
              container.innerHTML = `
                <div class="w-full h-full bg-gray-800 rounded-lg flex flex-col items-center justify-center text-white p-8">
                  <svg class="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                  <h3 class="text-lg font-medium mb-2">Video Preview Unavailable</h3>
                  <p class="text-gray-400 text-center text-sm">The video file cannot be loaded at this time. You can try downloading it or contact support.</p>
                  <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                    Retry
                  </button>
                </div>
              `;
            }
          }}
          onLoadStart={() => console.log("Video loading started")}
          onCanPlay={() => console.log("Video can start playing")}
          onLoadedData={() => console.log("Video data loaded")}
        >
          <source src={video.url} type="video/mp4" />
          <source src={video.url} type="video/webm" />
          <source src={video.url} type="video/avi" />
          <source src={video.url} type="video/mov" />
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <div className="w-full h-full bg-gray-800 rounded-lg flex flex-col items-center justify-center text-white p-8">
        <Video className="w-16 h-16 mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">Video Preview Unavailable</h3>
        <p className="text-gray-400 text-center text-sm">
          The video file cannot be loaded at this time. You can try downloading it or contact support.
        </p>
      </div>
    );
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
        <Button
          onClick={() => router.push("/dashboard/videos")}
          className="mt-4"
        >
          Back to Videos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/videos")}
            className="text-gray-600 hover:text-gray-900 self-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Videos
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 break-words">{video.title}</h1>
            <p className="text-gray-600 mt-1">
              {video.projectInfo?._id ? (
                <button
                  type="button"
                  onClick={navigateToProject}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {video.projectInfo.name || video.project || "View Project"}
                </button>
              ) : (
                video.project
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGenerateThumbnail}
            disabled={generatingThumbnail}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generatingThumbnail ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {generatingThumbnail ? 'Generating...' : 'Generate Thumbnail'}
            </span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleEditVideo}>
            <Edit className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Edit</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6">
        {/* Video Player */}
        <div className="lg:col-span-3 space-y-4 lg:space-y-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-0">
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center relative">
                {renderVideoContent()}
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
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900">
                              {comment.author}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() =>
                                handleEditComment(comment.id, comment.text)
                              }
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        {editingComment === comment.id ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              value={editCommentText}
                              onChange={(e) =>
                                setEditCommentText(e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              rows={2}
                            />
                            <div className="flex space-x-2">
                              <Button
                                onClick={() =>
                                  handleSaveCommentEdit(comment.id)
                                }
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Save
                              </Button>
                              <Button
                                onClick={() => {
                                  setEditingComment(null);
                                  setEditCommentText("");
                                }}
                                size="sm"
                                variant="outline"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">
                            {comment.text}
                          </p>
                        )}
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
        <div className="space-y-4 lg:space-y-6">
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
                  <span className="font-medium">
                    {video.uploadedByName || video.uploadedBy}
                  </span>
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
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {video.projectInfo?._id ? (
                      <button
                        type="button"
                        onClick={navigateToProject}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {video.projectInfo.name || video.project || "View Project"}
                      </button>
                    ) : (
                      video.project
                    )}
                  </h4>
                  <p className="text-sm text-gray-500">Project</p>
                </div>

                {video.projectInfo?.status && (
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Status</span>
                    <span className="font-medium text-gray-900">
                      {video.projectInfo.status}
                    </span>
                  </div>
                )}

                {typeof video.projectInfo?.progress === 'number' && (
                  <div>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span className="font-medium text-gray-900">
                        {video.projectInfo.progress}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600"
                        style={{ width: `${Math.min(Math.max(video.projectInfo.progress ?? 0, 0), 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    video.projectInfo?._id
                      ? navigateToProject()
                      : router.push("/dashboard/projects")
                  }
                >
                  {video.projectInfo?._id ? "Open Project" : "Browse Projects"}
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
                  onClick={() =>
                    video.projectInfo?._id
                      ? navigateToProject()
                      : router.push("/dashboard/projects")
                  }
                >
                  <Play className="h-4 w-4 mr-2" />
                  {video.projectInfo?._id ? "Project Dashboard" : "View Projects"}
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
                <div className="border-t border-gray-100 pt-2 mt-2">
                  <p className="text-xs font-medium text-gray-500 mb-2 px-1">
                    VIEW & MANAGE
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start mb-1"
                    onClick={() => setShowThumbnailsModal(true)}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Thumbnails ({video.thumbnails?.length || 0})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start mb-1"
                    onClick={() => setShowResourcesModal(true)}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Resources ({video.resources?.length || 0})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start mb-1"
                    onClick={() => setShowVersionsModal(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Versions ({video.versions?.length || 0})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start mb-1"
                    onClick={() => setShowShortsModal(true)}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Shorts ({video.shorts?.length || 0})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Video Modal */}
      {showEditModal && video && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            ref={editModalRef}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit Video
              </h3>
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
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
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
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
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
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      tags: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter tags (comma separated)"
                />
                {tagOptions.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Existing Tags {loadingTags ? "(refreshing...)" : ""}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tagOptions.map((tag) => {
                        const isSelected = editSelectedTags.includes(tag);
                        return (
                          <button
                            type="button"
                            key={tag}
                            onClick={() => toggleEditTag(tag)}
                            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                              isSelected
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                    {editSelectedTags.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Selected:{" "}
                        {editSelectedTags.join(", ")}
                      </p>
                    )}
                  </div>
                ) : loadingTags ? (
                  <p className="mt-3 text-xs text-gray-500">Loading available tags...</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="processing">Processing</option>
                    <option value="ready">Ready</option>
                    <option value="failed">Failed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project
                  </label>
                  <input
                    type="text"
                    value={editFormData.project}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        project: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project name"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Eye className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">Public Video</h4>
                    <p className="text-sm text-gray-500">
                      Anyone with the link can view
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isPublic}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        isPublic: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div
            ref={shareModalRef}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Share Video
              </h3>
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
                  <p className="text-sm text-gray-500">
                    {video.projectInfo?._id ? (
                      <button
                        type="button"
                        onClick={navigateToProject}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {video.projectInfo.name || video.project || "View Project"}
                      </button>
                    ) : (
                      video.project
                    )}
                  </p>
                </div>
              </div>

              {/* Public Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-gray-600" />
                    <div>
                      <h4 className="font-medium text-gray-900">Make Public</h4>
                      <p className="text-sm text-gray-500">
                        Anyone with the link can view
                      </p>
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
                    <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 font-mono break-all">
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

      {/* Thumbnails Modal */}
      {showThumbnailsModal && video && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Video Thumbnails
              </h3>
              <button
                onClick={() => setShowThumbnailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {video.thumbnails && video.thumbnails.length > 0 ? (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
                    {video.thumbnails.map((thumbnail: any, index: number) => (
                      <div
                        key={thumbnail.id || index}
                        className="relative group rounded-xl overflow-hidden border border-gray-200"
                      >
                        <img
                          src={thumbnail.url}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-white border-white hover:bg-white hover:text-black w-full"
                          >
                            Set as Primary
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => thumbnail.id && handleDeleteThumbnail(thumbnail.id)}
                            disabled={!thumbnail.id}
                            className="w-full"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      id="thumbnail-upload"
                      disabled={uploadingThumbnail}
                    />
                    <label
                      htmlFor="thumbnail-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingThumbnail ? 'Uploading...' : 'Add Another Thumbnail'}
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Play className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Thumbnails Yet</h3>
                  <p className="text-gray-500 mb-6">Upload custom thumbnails or generate them from video frames</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailUpload}
                    className="hidden"
                    id="thumbnail-upload"
                    disabled={uploadingThumbnail}
                  />
                  <label
                    htmlFor="thumbnail-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingThumbnail ? 'Uploading...' : 'Upload Thumbnail'}
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resources Modal */}
      {showResourcesModal && video && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Video Resources
              </h3>
              <button
                onClick={() => setShowResourcesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {video.resources && video.resources.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid gap-4">
                    {video.resources.map((resource: any, index: number) => (
                      <div
                        key={resource.id || index}
                        className="border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            <FileText className="h-5 w-5 text-blue-500" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {resource.name || resource.filename}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Added by {resource.addedByName || "Unknown"} on {new Date(resource.addedAt).toLocaleString()}
                            </p>
                            {resource.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(resource.url, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              triggerFileDownload(
                                resource.url,
                                resource.filename || resource.name
                              )
                            }
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => resource.id && handleDeleteResource(resource.id)}
                            disabled={!resource.id}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <input
                      type="file"
                      onChange={handleResourceUpload}
                      className="hidden"
                      id="resource-upload"
                      disabled={uploadingResource}
                    />
                    <label
                      htmlFor="resource-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {uploadingResource ? 'Uploading...' : 'Add Another Resource'}
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Link className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Resources Yet</h3>
                  <p className="text-gray-500 mb-6">Add related files, documents, or links to this video</p>
                  <input
                    type="file"
                    onChange={handleResourceUpload}
                    className="hidden"
                    id="resource-upload"
                    disabled={uploadingResource}
                  />
                  <label
                    htmlFor="resource-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {uploadingResource ? 'Uploading...' : 'Add Resource'}
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Versions Modal */}
      {showVersionsModal && video && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Video Versions
              </h3>
              <button
                onClick={() => setShowVersionsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {video.versions && video.versions.length > 0 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {video.versions.map((version: any, index: number) => (
                      <div
                        key={version.id || index}
                        className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">
                              v{version.versionNumber || index + 1}
                            </span>
                            {version.isActive && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                Active
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 mt-2">
                            {version.filename || `Version ${index + 1}`}
                          </h4>
                          <p className="text-sm text-gray-500">
                            Uploaded by {version.uploadedByName || "Unknown"} on {new Date(version.uploadedAt).toLocaleString()}
                          </p>
                          {version.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {version.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(version.url, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              triggerFileDownload(
                                version.url,
                                version.filename || `version-${index + 1}.mp4`
                              )
                            }
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => version.id && handleDeleteVersion(version.id)}
                            disabled={!version.id}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleVersionUpload}
                      className="hidden"
                      id="version-upload"
                      disabled={uploadingVersion}
                    />
                    <label
                      htmlFor="version-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingVersion ? 'Uploading...' : 'Upload Another Version'}
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <RefreshCw className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Versions Yet</h3>
                  <p className="text-gray-500 mb-6">Upload different versions or revisions of this video</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVersionUpload}
                    className="hidden"
                    id="version-upload"
                    disabled={uploadingVersion}
                  />
                  <label
                    htmlFor="version-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingVersion ? 'Uploading...' : 'Upload Version'}
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shorts Modal */}
      {showShortsModal && video && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Video Shorts
              </h3>
              <button
                onClick={() => setShowShortsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              {video.shorts && video.shorts.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {video.shorts.map((short: any, index: number) => (
                      <div
                        key={short.id || index}
                        className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="aspect-[9/16] bg-black flex items-center justify-center">
                          <video
                            src={short.url}
                            className="h-full w-full object-contain bg-black"
                            controls
                            preload="metadata"
                          />
                        </div>
                        <div className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">
                              {short.filename || `Short ${index + 1}`}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {short.duration ? `${short.duration}s` : ""}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Uploaded by {short.uploadedByName || "Unknown"} on {new Date(short.uploadedAt).toLocaleString()}
                          </p>
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(short.url, "_blank", "noopener,noreferrer")}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                triggerFileDownload(
                                  short.url,
                                  short.filename || `short-${index + 1}.mp4`
                                )
                              }
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => short.id && handleDeleteShort(short.id)}
                              disabled={!short.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleShortUpload}
                      className="hidden"
                      id="short-upload"
                      disabled={uploadingShort}
                    />
                    <label
                      htmlFor="short-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingShort ? 'Uploading...' : 'Upload Another Short'}
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Shorts Yet</h3>
                  <p className="text-gray-500 mb-6">Upload short clips or highlights from this video</p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleShortUpload}
                    className="hidden"
                    id="short-upload"
                    disabled={uploadingShort}
                  />
                  <label
                    htmlFor="short-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingShort ? 'Uploading...' : 'Upload Short'}
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
