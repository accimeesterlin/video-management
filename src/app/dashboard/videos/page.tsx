"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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
  projectId?: string | null;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedAt: string;
  thumbnail?: string;
  thumbnailKey?: string;
  s3Key?: string;
  url?: string;
  tags: string[];
  isPublic?: boolean;
  isExternalLink?: boolean;
  platform?: string | null;
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
  const searchParams = useSearchParams();
  const [initializedFromQuery, setInitializedFromQuery] = useState(false);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<VideoItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadPaused, setUploadPaused] = useState(false);
  const [pausePending, setPausePending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [videoLink, setVideoLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingVideo, setSharingVideo] = useState<VideoItem | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<VideoItem | null>(null);
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);
  const [editingVideoInline, setEditingVideoInline] = useState<string | null>(null);
  const [quickEditData, setQuickEditData] = useState<{[key: string]: string}>({});
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [videosPerPage, setVideosPerPage] = useState(12);
  const [compressionEnabled, setCompressionEnabled] = useState(false);
  const [compressionQuality, setCompressionQuality] = useState(0.8);
  const [compressingFiles, setCompressingFiles] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    project: "",
    company: "",
    tags: "",
  });
  const [thumbnailErrors, setThumbnailErrors] = useState<Record<string, boolean>>({});
  const [lastUsedProject, setLastUsedProject] = useState<string>("");
  const pauseRequestedRef = useRef(false);
  const resumeResolverRef = useRef<(() => void) | null>(null);
  const currentUploadRequestRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    if (session) {
      fetchVideos();
      fetchProjects();
      fetchTags();
      fetchCompanies();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTagFilters]);

  const fetchVideos = async () => {
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/videos?t=${timestamp}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      if (response.ok) {
        const data = await response.json();
        const normalizedVideos = Array.isArray(data)
          ? data.map((video: any) => ({
              ...video,
              comments: Array.isArray(video?.comments) ? video.comments : [],
            }))
          : [];
        setVideos(normalizedVideos);
      } else {
        toast.error("Failed to fetch videos");
      }
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast.error("Error fetching videos");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
        console.log('Fetched projects:', data);
        if (data.length > 0) {
          const preferred = lastUsedProject || data[0].name;
          if (!formData.project) {
            setFormData(prev => ({ ...prev, project: preferred }));
          }
          if (!lastUsedProject) {
            setLastUsedProject(preferred);
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Failed to fetch projects:", response.status, errorData);
        if (response.status === 401) {
          toast.error("Please log in to view projects");
        } else if (response.status === 404) {
          toast.error("No projects found. Create your first project!");
        } else {
          toast.error("Failed to load projects");
        }
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Error loading projects. Please check your connection.");
    }
  }, [lastUsedProject, formData.project]);

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

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/companies");
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const refreshVideoAssets = useCallback(
    async (videoId: string) => {
      try {
        const response = await fetch(`/api/videos/${videoId}`);
        if (!response.ok) {
          return;
        }

        const updated = await response.json();
        setVideos((prev) =>
          prev.map((video) =>
            video._id === videoId
              ? {
                  ...video,
                  url: updated.url || video.url,
                  thumbnail: updated.thumbnail || video.thumbnail,
                  thumbnailKey: updated.thumbnailKey || video.thumbnailKey,
                  isExternalLink: updated.isExternalLink ?? video.isExternalLink,
                  platform: updated.platform ?? video.platform,
                }
              : video
          )
        );

        setPreviewVideo((prev) =>
          prev && prev._id === videoId
            ? {
                ...prev,
                url: updated.url || prev.url,
                thumbnail: updated.thumbnail || prev.thumbnail,
                isExternalLink: updated.isExternalLink ?? prev.isExternalLink,
                platform: updated.platform ?? prev.platform,
              }
            : prev
        );

        setThumbnailErrors((prev) => {
          if (!(videoId in prev)) return prev;
          const next = { ...prev };
          delete next[videoId];
          return next;
        });
      } catch (error) {
        console.error("Failed to refresh video assets", videoId, error);
      }
    },
    []
  );

  const handleThumbnailError = useCallback(
    (videoId: string) => {
      setThumbnailErrors((prev) => ({ ...prev, [videoId]: true }));
      refreshVideoAssets(videoId);
    },
    [refreshVideoAssets]
  );

  const handleThumbnailLoad = useCallback((videoId: string) => {
    setThumbnailErrors((prev) => {
      if (!(videoId in prev)) return prev;
      const next = { ...prev };
      delete next[videoId];
      return next;
    });
  }, []);

  useEffect(() => {
    if (!searchParams) return;

    const paramSet = new Set<string>();

    searchParams.getAll("tag").forEach((value) => {
      if (value) {
        paramSet.add(value);
      }
    });

    const tagsParam = searchParams.get("tags");
    if (tagsParam) {
      tagsParam
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => paramSet.add(tag));
    }

    if (paramSet.size > 0) {
      setSelectedTagFilters(Array.from(paramSet));
      setInitializedFromQuery(true);
    } else if (!initializedFromQuery && (searchParams.has("tag") || searchParams.has("tags"))) {
      setSelectedTagFilters([]);
      setInitializedFromQuery(true);
    }
  }, [searchParams, initializedFromQuery]);

  const openUploadModal = async () => {
    setShowUploadModal(true);
    // Refresh projects when opening upload modal
    await fetchProjects();
  };

  const handleVideoLinkSubmit = async () => {
    if (!videoLink.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    if (!formData.title.trim()) {
      toast.error("Please enter a video title");
      return;
    }

    setUploading(true);
    setUploadStatus("Adding video link...");

    try {
      let linkMetadata: { duration?: number | null; thumbnailUrl?: string | null } = {};

      try {
        const metadataResponse = await fetch("/api/videos/link-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: videoLink.trim() }),
        });

        if (metadataResponse.ok) {
          const metadataPayload = await metadataResponse.json();
          linkMetadata = metadataPayload.metadata || {};
        }
      } catch (metadataError) {
        console.error("Failed to resolve link metadata:", metadataError);
      }

      const allTags = selectedTags.length > 0 
        ? selectedTags.join(", ") + (formData.tags ? ", " + formData.tags : "")
        : formData.tags;

      const response = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: videoLink.trim(),
          title: formData.title.trim(),
          description: formData.description,
          project: formData.project || "General",
          companyId: formData.company || null,
          tags: allTags,
          duration: linkMetadata.duration ?? 0,
          thumbnailUrl: linkMetadata.thumbnailUrl,
          isExternalLink: true,
          platform: getVideoPlatform(videoLink),
        }),
      });

      if (response.ok) {
        const newVideoResponse = await response.json();
        const normalizedNewVideo = {
          ...newVideoResponse,
          comments: Array.isArray(newVideoResponse?.comments)
            ? newVideoResponse.comments
            : [],
          tags: Array.isArray(newVideoResponse?.tags)
            ? newVideoResponse.tags
            : [],
        };

        // Immediately add the video to the list
        setVideos((prev) => {
          const updated = [normalizedNewVideo, ...prev];
          console.log(`Added external video ${normalizedNewVideo.title} to list. Total videos: ${updated.length}. Tags:`, normalizedNewVideo.tags);
          return updated;
        });
        setCurrentPage(1);

        toast.success("Video link added successfully");
        if ((formData.project || normalizedNewVideo.project) && formData.project !== lastUsedProject) {
          setLastUsedProject(formData.project || normalizedNewVideo.project);
        }
        if (normalizedNewVideo?._id) {
          await refreshVideoAssets(normalizedNewVideo._id);
        }

        // Reset form
        setVideoLink('');
        setFormData({
          title: "",
          description: "",
          project: "",
          company: "",
          tags: "",
        });
        setSelectedTags([]);
        setShowUploadModal(false);
        await fetchVideos();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add video link");
      }
    } catch (error) {
      toast.error("Error adding video link");
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  };

  const getVideoPlatform = (url: string): string => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    } else if (url.includes('vimeo.com')) {
      return 'vimeo';
    } else if (url.includes('dailymotion.com')) {
      return 'dailymotion';
    } else {
      return 'other';
    }
  };

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

  const renderPreviewPlayer = (videoItem: VideoItem) => {
    if (videoItem.isExternalLink && videoItem.url) {
      const embed = getExternalEmbed(videoItem.url, videoItem.platform);

      if (embed.type === "iframe") {
        return (
          <iframe
            src={embed.src}
            className="w-full h-full"
            title={videoItem.title || "External video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        );
      }

      return (
        <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center text-white p-8 space-y-4">
          <Video className="h-10 w-10 text-gray-400" />
          <p className="text-sm text-gray-200 text-center">
            This video is hosted externally. Open it in a new tab to watch.
          </p>
          <Button
            onClick={() => window.open(videoItem.url!, "_blank", "noopener,noreferrer")}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Video
          </Button>
        </div>
      );
    }

    if (videoItem.url) {
      return (
        <video
          controls
          autoPlay
          className="w-full h-full"
          poster={videoItem.thumbnail}
          onError={(e) => {
            console.error('Video playback error:', e);
            toast.error('Video format not supported in browser. Try downloading the video.');
          }}
        >
          <source src={videoItem.url} type="video/webm" />
          <source src={videoItem.url} type="video/mp4" />
          <source src={videoItem.url} type="video/avi" />
          <source src={videoItem.url} type="video/mov" />
          Your browser does not support the video tag.
        </video>
      );
    }

    return (
      <div className="w-full h-full flex items-center justify-center text-white">
        <div className="text-center">
          <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Video Preview</p>
          <p className="text-sm opacity-75">Video file not available</p>
        </div>
      </div>
    );
  };

  const generateVideoThumbnail = async (
    file: File
  ): Promise<{ blob: Blob; previewUrl: string; contentType: string }> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.muted = true;
      (video as any).playsInline = true;
      video.preload = 'auto';

      video.addEventListener('loadedmetadata', () => {
        // Set canvas size to video dimensions (or a max size)
        const maxWidth = 400;
        const maxHeight = 300;
        const videoAspectRatio = video.videoWidth / video.videoHeight;
        
        if (video.videoWidth > video.videoHeight) {
          canvas.width = Math.min(maxWidth, video.videoWidth);
          canvas.height = canvas.width / videoAspectRatio;
        } else {
          canvas.height = Math.min(maxHeight, video.videoHeight);
          canvas.width = canvas.height * videoAspectRatio;
        }

        // Seek to 10% into the video for a good thumbnail
        video.currentTime = video.duration * 0.1;
      });

      video.addEventListener('seeked', () => {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbnailUrl = URL.createObjectURL(blob);
            resolve({
              blob,
              previewUrl: thumbnailUrl,
              contentType: blob.type || 'image/jpeg',
            });
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      });

      video.addEventListener('error', () => {
        reject(new Error('Video loading failed for thumbnail generation'));
      });

      video.src = URL.createObjectURL(file);
      video.load();
      video.play().catch(() => {
        /* ignore */
      });
    });
  };

  const compressVideo = async (file: File, quality: number = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.muted = true;
      (video as any).playsInline = true;
      video.preload = 'auto';

      video.addEventListener('loadedmetadata', () => {
        // Set canvas dimensions based on compression quality
        const scaleFactor = Math.sqrt(quality); // Scale dimensions to maintain quality
        canvas.width = Math.floor(video.videoWidth * scaleFactor);
        canvas.height = Math.floor(video.videoHeight * scaleFactor);

        // Use MediaRecorder for compression
        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: Math.floor(1000000 * quality), // Adjust bitrate based on quality
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const compressedBlob = new Blob(chunks, { type: 'video/webm' });
          const compressedFile = new File([compressedBlob], 
            file.name.replace(/\.[^/.]+$/, '_compressed.webm'), 
            { type: 'video/webm' }
          );
          resolve(compressedFile);
        };

        // Start recording
        mediaRecorder.start();
        
        // Draw video frames to canvas
        const drawFrame = () => {
          if (video.currentTime < video.duration) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            requestAnimationFrame(drawFrame);
          } else {
            mediaRecorder.stop();
          }
       };

       video.addEventListener('play', drawFrame);
        video.play().catch(() => {
          /* ignore */
        });
      });

      video.addEventListener('error', () => {
        reject(new Error('Video loading failed'));
      });

      video.src = URL.createObjectURL(file);
      video.load();
    });
  };

  const uploadToS3 = async (file: File, uploadUrl: string, onProgress?: (progress: number) => void) => {
    console.log('Starting S3 upload:', { fileName: file.name, fileSize: file.size, uploadUrl: uploadUrl.substring(0, 100) + '...' });
    
    // First try XMLHttpRequest for progress tracking
    try {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        currentUploadRequestRef.current = xhr;
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          currentUploadRequestRef.current = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response);
          } else {
            const message = xhr.responseText || xhr.statusText || 'Unexpected error';
            reject(new Error(`Upload failed with status ${xhr.status}: ${message}`));
          }
        });

        xhr.addEventListener('error', (event) => {
          currentUploadRequestRef.current = null;
          console.error('XHR Error details:', {
            status: xhr.status,
            statusText: xhr.statusText,
            readyState: xhr.readyState,
            responseText: xhr.responseText,
            uploadUrl: uploadUrl?.substring(0, 100) + '...',
            fileSize: file.size,
            fileName: file.name,
            event
          });
          
          // Check if it's a CORS issue
          if (xhr.status === 0 && xhr.readyState === 4) {
            reject(new Error(`Upload failed due to CORS policy. Please check S3 bucket CORS configuration. Add ${window.location.origin} to AllowedOrigins.`));
          } else {
            reject(new Error(`Upload failed due to a network error (Status: ${xhr.status || 'unknown'}, ${xhr.statusText || 'No status text'})`));
          }
        });

        xhr.addEventListener('abort', () => {
          currentUploadRequestRef.current = null;
          reject(new Error('Upload aborted'));
        });

        xhr.addEventListener('timeout', () => {
          currentUploadRequestRef.current = null;
          reject(new Error('Upload timed out'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.timeout = 5 * 60 * 1000; // 5 minutes timeout
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    } catch (xhrError) {
      console.warn('XMLHttpRequest failed, falling back to fetch:', xhrError);
      
      // Fallback to fetch API without progress tracking
      try {
        console.log('Attempting fetch upload fallback...');
        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        });

        console.log('Fetch upload response:', { status: response.status, statusText: response.statusText, ok: response.ok });

        if (!response.ok) {
          const responseText = await response.text().catch(() => 'Unable to read response');
          console.error('Fetch upload failed response:', responseText);
          throw new Error(`Upload failed with status ${response.status}: ${response.statusText}. Response: ${responseText}`);
        }

        return response;
      } catch (fetchError) {
        console.error('Fetch upload error:', fetchError);
        
        // Check if it's a CORS issue
        if (fetchError.message.includes('CORS') || fetchError.message.includes('fetch')) {
          throw new Error(`Upload failed due to CORS policy. Please check S3 bucket CORS configuration. Add ${window.location.origin} to AllowedOrigins. Original error: ${fetchError.message}`);
        }
        
        throw new Error(`Both XMLHttpRequest and fetch failed: ${fetchError.message}`);
      }
    }
  };

  const waitForResume = () =>
    new Promise<void>((resolve) => {
      resumeResolverRef.current = resolve;
    });

  const handlePauseUploads = () => {
    if (!uploading || pauseRequestedRef.current || uploadPaused) {
      return;
    }
    pauseRequestedRef.current = true;
    setPausePending(true);
    setUploadStatus('Pausing uploads after the current file...');
    toast.info('Upload will pause after the current file finishes.');
  };

  const handleResumeUploads = () => {
    if (!uploadPaused && !pauseRequestedRef.current) {
      return;
    }
    pauseRequestedRef.current = false;
    setPausePending(false);
    setUploadPaused(false);
    setUploadStatus('Resuming uploads...');
    const resolver = resumeResolverRef.current;
    resumeResolverRef.current = null;
    if (resolver) {
      resolver();
    }
    toast.success('Resuming uploads');
  };

  const waitIfPaused = async () => {
    if (!pauseRequestedRef.current) {
      return;
    }
    setUploadPaused(true);
    setPausePending(false);
    setUploadStatus('Uploads paused. Resume to continue.');
    await waitForResume();
    setUploadStatus('');
    setUploadPaused(false);
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(acceptedFiles);
  }, []);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select files to upload");
      return;
    }

    pauseRequestedRef.current = false;
    resumeResolverRef.current = null;
    setPausePending(false);
    setUploadPaused(false);
    setUploading(true);
    setUploadProgress(0);
    setShowUploadModal(false);
    toast.info("Upload started. You can continue working while we finish in the background.");

    try {
      const totalFiles = selectedFiles.length;
      let completedFiles = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        await waitIfPaused();

        const originalFile = selectedFiles[i];
        let fileToUpload = originalFile;
        const fileIndex = i + 1;
        
        // Create a temporary video entry to show upload progress
        const tempVideoId = `temp-${Date.now()}-${i}`;
        const tempVideo = {
          _id: tempVideoId,
          title: formData.title || originalFile.name.replace(/\.[^/.]+$/, ""),
          description: formData.description,
          filename: originalFile.name,
          duration: 0,
          size: originalFile.size,
          status: "uploading",
          project: formData.project || "General",
          uploadedBy: "",
          uploadedByName: "You",
          uploadedAt: new Date().toISOString(),
          thumbnail: null,
          url: null,
          uploadProgress: 0,
          tags: Array.isArray(selectedTags) ? [...selectedTags] : [],
          comments: [],
        };
        
        // Add temp video to list
        setVideos((prev) => [tempVideo, ...prev]);
        setCurrentPage(1);
        
        setUploadStatus(`Preparing ${originalFile.name} (${fileIndex}/${totalFiles})...`);

        // Generate thumbnail for video files
        let generatedThumbnail: { blob: Blob; previewUrl: string; contentType: string } | null = null;
        if (originalFile.type.startsWith('video/')) {
          try {
            setUploadStatus(`Generating thumbnail for ${originalFile.name} (${fileIndex}/${totalFiles})...`);
            generatedThumbnail = await generateVideoThumbnail(originalFile);
          } catch (thumbnailError) {
            console.error('Thumbnail generation failed:', thumbnailError);
            // Don't fail the upload if thumbnail generation fails
          }
        }

        // Compress video if enabled and file is a video
        if (compressionEnabled && originalFile.type.startsWith('video/')) {
          try {
            setCompressingFiles(prev => [...prev, originalFile.name]);
            setUploadStatus(`Compressing ${originalFile.name} (${fileIndex}/${totalFiles})... Quality: ${Math.round(compressionQuality * 100)}%`);
            
            fileToUpload = await compressVideo(originalFile, compressionQuality);
            
            const originalSizeMB = (originalFile.size / (1024 * 1024)).toFixed(2);
            const compressedSizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2);
            const compressionRatio = ((1 - fileToUpload.size / originalFile.size) * 100).toFixed(1);
            
            toast.success(`Compressed ${originalFile.name}: ${originalSizeMB}MB → ${compressedSizeMB}MB (${compressionRatio}% reduction)`);
            
            setCompressingFiles(prev => prev.filter(name => name !== originalFile.name));
          } catch (compressionError) {
            console.error('Compression failed:', compressionError);
            toast.warning(`Compression failed for ${originalFile.name}, uploading original file`);
            fileToUpload = originalFile; // Fall back to original file
            setCompressingFiles(prev => prev.filter(name => name !== originalFile.name));
          }
        }
        
        // Get presigned URL for S3 upload
        const uploadUrlResponse = await fetch("/api/videos/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: fileToUpload.name,
            contentType: fileToUpload.type,
            fileSize: fileToUpload.size,
          }),
        });

        if (!uploadUrlResponse.ok) {
          const error = await uploadUrlResponse.json();
          console.error('Upload URL request failed:', error);
          toast.error(`Failed to get upload URL for ${originalFile.name}: ${error.error || 'Unknown error'}`);
          
          // Update temp video to show error status
          setVideos((prev) => prev.map(video => 
            video._id === tempVideoId 
              ? { ...video, status: "failed", error: error.error || 'Failed to get upload URL' }
              : video
          ));
          continue;
        }

        const { uploadUrl, videoKey } = await uploadUrlResponse.json();
        
        console.log('Upload URL response:', { 
          uploadUrl: uploadUrl?.substring(0, 100) + '...', 
          videoKey,
          fileSize: fileToUpload.size,
          fileName: originalFile.name 
        });
        
        if (!uploadUrl || !videoKey) {
          console.error('Invalid upload URL response:', { uploadUrl, videoKey });
          toast.error(`Invalid upload URL response for ${originalFile.name}`);
          
          // Update temp video to show error status
          setVideos((prev) => prev.map(video => 
            video._id === tempVideoId 
              ? { ...video, status: "failed", error: 'Invalid upload URL response' }
              : video
          ));
          continue;
        }

        let thumbnailKey: string | null = null;

        if (generatedThumbnail) {
          const thumbnailData = generatedThumbnail;
          try {
            setUploadStatus(`Uploading thumbnail for ${originalFile.name} (${fileIndex}/${totalFiles})...`);

            const thumbnailUploadResponse = await fetch('/api/videos/thumbnails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                videoKey,
                contentType: thumbnailData.contentType,
              }),
            });

            if (!thumbnailUploadResponse.ok) {
              throw new Error('Failed to get thumbnail upload URL');
            }

            const { uploadUrl: thumbnailUploadUrl, thumbnailKey: resolvedThumbnailKey } = await thumbnailUploadResponse.json();

            const thumbnailFile = new File(
              [thumbnailData.blob],
              `thumbnail-${Date.now()}.jpg`,
              { type: thumbnailData.contentType }
            );

            await uploadToS3(thumbnailFile, thumbnailUploadUrl);
            thumbnailKey = resolvedThumbnailKey;
          } catch (thumbnailUploadError) {
            console.error('Thumbnail upload failed:', thumbnailUploadError);
            toast.warning(`Thumbnail upload failed for ${originalFile.name}. Uploading video without thumbnail.`);
          } finally {
            URL.revokeObjectURL(thumbnailData.previewUrl);
          }
        }

        // Upload file to S3 with progress
        setUploadStatus(`Uploading ${fileToUpload.name} (${fileIndex}/${totalFiles})...`);
        try {
          await uploadToS3(fileToUpload, uploadUrl, (fileProgress) => {
            // Calculate overall progress: completed files + current file progress
            const overallProgress = ((completedFiles * 100) + fileProgress) / totalFiles;
            setUploadProgress(Math.round(overallProgress));
          });
        } catch (uploadError) {
          console.error('S3 upload failed:', uploadError);
          toast.error(`Upload failed for ${originalFile.name}: ${uploadError.message}`);
          
          // Update temp video to show error status
          setVideos((prev) => prev.map(video => 
            video._id === tempVideoId 
              ? { ...video, status: "failed", error: uploadError.message || 'Upload failed' }
              : video
          ));
          continue;
        }

        // Create video record in database
        setUploadStatus(`Processing ${originalFile.name} (${fileIndex}/${totalFiles})...`);
        const allTags = selectedTags.length > 0 
          ? selectedTags.join(", ") + (formData.tags ? ", " + formData.tags : "")
          : formData.tags;

        const videoResponse = await fetch("/api/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoKey,
            title: formData.title || originalFile.name.replace(/\.[^/.]+$/, ""),
            description: formData.description,
            project: formData.project || "General",
            companyId: formData.company || null,
            tags: allTags,
            size: fileToUpload.size,
            originalSize: originalFile.size,
            isCompressed: compressionEnabled && originalFile.type.startsWith('video/') && fileToUpload !== originalFile,
            compressionRatio: compressionEnabled && originalFile.type.startsWith('video/') && fileToUpload !== originalFile
              ? Math.round((1 - fileToUpload.size / originalFile.size) * 100)
              : 0,
            thumbnailKey,
          }),
        });

        if (!videoResponse.ok) {
          const errorData = await videoResponse.json();
          console.error("Video creation failed:", errorData);
          toast.error(`Failed to create video record for ${originalFile.name}: ${errorData.error || 'Unknown error'}`);
          
          // Update temp video to show error status
          setVideos((prev) => prev.map(video => 
            video._id === tempVideoId 
              ? { ...video, status: "failed", error: errorData.error || 'Upload failed' }
              : video
          ));
          continue;
        }

        const newVideoResponse = await videoResponse.json();
        const normalizedNewVideo = {
          ...newVideoResponse,
          comments: Array.isArray(newVideoResponse?.comments)
            ? newVideoResponse.comments
            : [],
          tags: Array.isArray(newVideoResponse?.tags)
            ? newVideoResponse.tags
            : [],
        };

        // Replace temp video with real video data
        setVideos((prev) => {
          const filtered = prev.filter((video) => video._id !== tempVideoId);
          const updated = [normalizedNewVideo, ...filtered];
          console.log(`Added video ${normalizedNewVideo.title} to list. Total videos: ${updated.length}. Tags:`, normalizedNewVideo.tags);
          return updated;
        });
        setCurrentPage(1);
        
        if (normalizedNewVideo?._id) {
          await refreshVideoAssets(normalizedNewVideo._id);
        }
        if (formData.project) {
          setLastUsedProject(formData.project);
        }

        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));

        await waitIfPaused();
      }

      console.log(`Upload completed. ${completedFiles} of ${totalFiles} files processed successfully.`);
      toast.success(`${selectedFiles.length} video(s) uploaded successfully`);
      setSelectedFiles([]);
      setSelectedTags([]);
      setFormData({
        title: "",
        description: "",
        project: lastUsedProject,
        company: "",
        tags: "",
      });
      setCurrentPage(1);
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Error uploading videos: ${errorMessage}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
      setCompressingFiles([]);
      setPausePending(false);
      setUploadPaused(false);
      pauseRequestedRef.current = false;
      resumeResolverRef.current = null;
      currentUploadRequestRef.current = null;
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

  const goToProject = useCallback(
    (projectId?: string | null) => {
      if (!projectId) return;
      router.push(`/dashboard/projects/${projectId}`);
    },
    [router]
  );

  const handleEditVideo = async () => {
    if (!editingVideo) return;

    try {
      // In real app, this would update via API
      toast.success("Video updated successfully");
      setShowEditModal(false);
      setEditingVideo(null);
      setFormData({ title: "", description: "", project: "", company: "", tags: "" });
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
      company: "", // Videos don't have company in their interface currently
      tags: video.tags.join(", "),
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", project: "", company: "", tags: "" });
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

  const handleCreateSampleVideos = async () => {
    try {
      const response = await fetch('/api/videos/sample', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Created ${data.count} sample videos successfully`);
        fetchVideos(); // Refresh the video list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create sample videos');
      }
    } catch (error) {
      toast.error('Error creating sample videos');
    }
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

  const toggleTagFilter = (tagName: string) => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagName)
        ? prev.filter((tag) => tag !== tagName)
        : [...prev, tagName]
    );
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

  const availableFilterTags = useMemo(() => {
    const set = new Set<string>();

    if (Array.isArray(tags)) {
      tags.forEach((tag: any) => {
        const tagName = typeof tag === "string" ? tag : tag?.name;
        if (tagName && typeof tagName === "string") {
          set.add(tagName);
        }
      });
    }

    videos.forEach((video) => {
      (video.tags || []).forEach((tag) => {
        if (tag) {
          set.add(tag);
        }
      });
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tags, videos]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Filter videos by selected tags
  const filteredVideos = selectedTagFilters.length > 0
    ? videos.filter(video => 
        selectedTagFilters.every(tag => video.tags.includes(tag))
      )
    : videos;

  // Debug logging for video visibility
  console.log(`Total videos: ${videos.length}, Filtered videos: ${filteredVideos.length}, Selected filters: ${selectedTagFilters.length}`, {
    selectedTagFilters,
    videoTags: videos.length > 0 ? videos.slice(0, 3).map(v => ({ title: v.title, tags: v.tags })) : 'No videos'
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredVideos.length / videosPerPage);
  const startIndex = (currentPage - 1) * videosPerPage;
  const endIndex = startIndex + videosPerPage;
  const paginatedVideos = filteredVideos.slice(startIndex, endIndex);


  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Videos</h1>
          <p className="text-gray-600 mt-2">
            Upload, organize, and manage your video content
          </p>
          {selectedTagFilters.length > 0 && (
            <div className="mt-2">
              <span className="text-sm text-gray-500 mb-2 block">
                Filtered by tags ({selectedTagFilters.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedTagFilters.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => setSelectedTagFilters(prev => prev.filter(t => t !== tag))}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setSelectedTagFilters([])}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded hover:bg-gray-200"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
        <Button
          onClick={openUploadModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm"
        >
          <Upload className="h-5 w-5 mr-2" />
          Upload Video
        </Button>
      </div>

      {availableFilterTags.length > 0 && (
        <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                Filter by tags
              </h2>
              <p className="text-sm text-gray-500">
                Select one or more tags to narrow down the video list.
              </p>
            </div>
            {selectedTagFilters.length > 0 && (
              <Button
                onClick={() => setSelectedTagFilters([])}
                variant="outline"
                size="sm"
                className="self-start text-gray-600 border-gray-200 hover:bg-gray-50"
              >
                <X className="h-4 w-4 mr-2" />
                Clear filters
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {availableFilterTags.map((tag) => {
              const isActive = selectedTagFilters.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTagFilter(tag)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Video className="h-4 w-4 mr-2 text-blue-500" />
              Total Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {filteredVideos.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">{selectedTagFilters.length > 0 ? 'Filtered videos' : 'All videos'}</p>
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
              {filteredVideos.filter((v) => v.status === "Ready").length}
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
              {filteredVideos.filter((v) => v.status === "Processing").length}
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
              {formatFileSize(filteredVideos.reduce((sum, v) => sum + v.size, 0))}
            </div>
            <p className="text-sm text-gray-500 mt-1">Storage used</p>
          </CardContent>
        </Card>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-16 text-center">
            <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {selectedTagFilters.length > 0 ? `No videos found with selected tags` : 'No videos yet'}
            </h3>
            <p className="text-gray-500 mb-6">
              {selectedTagFilters.length > 0 
                ? 'Try selecting different tags or clear the filters to see all videos' 
                : 'Upload your first video to get started, or try some sample videos'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {selectedTagFilters.length > 0 ? (
                <Button
                  onClick={() => setSelectedTagFilters([])}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  <X className="h-5 w-5 mr-2" />
                  Clear Filters
                </Button>
              ) : (
                <>
                  <Button
                    onClick={openUploadModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    Upload First Video
                  </Button>
                  <Button
                    onClick={handleCreateSampleVideos}
                    variant="outline"
                    className="px-6 py-3 rounded-lg font-medium"
                  >
                    <Video className="h-5 w-5 mr-2" />
                    Add Sample Videos
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedVideos.map((video) => (
            <Card
              key={video._id}
              className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer flex h-full flex-col"
              onClick={() => handleVideoClick(video._id)}
              onMouseEnter={() => setHoveredVideo(video._id)}
              onMouseLeave={() => setHoveredVideo(null)}
            >
              <CardHeader className="pb-4">
                <div className="relative aspect-square w-full bg-gray-100 rounded-lg flex items-center justify-center mb-3 group overflow-hidden">
                  {video.thumbnail && !thumbnailErrors[video._id] ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover rounded-lg"
                      onError={() => handleThumbnailError(video._id)}
                      onLoad={() => handleThumbnailLoad(video._id)}
                    />
                  ) : video.thumbnail ? (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex flex-col items-center justify-center text-center p-4">
                      <Video className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Thumbnail failed to load</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshVideoAssets(video._id);
                        }}
                      >
                        Retry
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Video className="h-12 w-12 text-blue-400 mx-auto mb-2" />
                        <p className="text-xs text-blue-600">Video preview</p>
                      </div>
                    </div>
                  )}

                  {/* Preview overlay */}
                  {hoveredVideo === video._id && !thumbnailErrors[video._id] && (
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
                      <div 
                        className="space-y-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={quickEditData.title || ''}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, title: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Video title"
                        />
                        <input
                          type="text"
                          value={quickEditData.project || ''}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, project: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Project name"
                        />
                        <input
                          type="text"
                          value={quickEditData.tags || ''}
                          onChange={(e) => setQuickEditData(prev => ({ ...prev, tags: e.target.value }))}
                          onClick={(e) => e.stopPropagation()}
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
                          {video.projectId ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToProject(video.projectId);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {video.project || "View Project"}
                            </button>
                          ) : (
                            video.project
                          )}
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
              <CardContent className="pt-0 mt-auto">
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
                    {Array.isArray(video.comments) && video.comments.length > 0 && (
                      <span className="text-xs text-gray-500">
                        {video.comments.length} comment
                        {video.comments.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {video.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {video.tags.slice(0, 3).map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTagFilters(prev => 
                              prev.includes(tag)
                                ? prev.filter(t => t !== tag)
                                : [...prev, tag]
                            );
                          }}
                          className={`px-2 py-1 text-xs rounded hover:bg-blue-200 transition-colors ${
                            selectedTagFilters.includes(tag)
                              ? 'bg-blue-500 text-white'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                          title={`${selectedTagFilters.includes(tag) ? 'Remove filter:' : 'Filter by tag:'} ${tag}`}
                        >
                          {tag}
                        </button>
                      ))}
                      {video.tags.length > 3 && (
                        <span 
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                          title={`${video.tags.length - 3} more tags: ${video.tags.slice(3).join(', ')}`}
                        >
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
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Show</span>
              <select
                value={videosPerPage}
                onChange={(e) => {
                  setVideosPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded px-2 py-1 text-sm"
              >
                <option value={8}>8</option>
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
              <span>per page</span>
              <span className="ml-4">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredVideos.length)} of {filteredVideos.length} videos
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 p-0 ${
                        currentPage === pageNum 
                          ? 'bg-blue-600 text-white' 
                          : 'text-gray-600'
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                {totalPages > 5 && currentPage < totalPages - 2 && (
                  <>
                    <span className="px-2 text-gray-400">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-8 h-8 p-0 text-gray-600"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Add Video
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  resetForm();
                  setUploadMode('file');
                  setVideoLink('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Mode Switcher */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setUploadMode('file')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    uploadMode === 'file'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Upload Files
                </button>
                <button
                  onClick={() => setUploadMode('link')}
                  className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                    uploadMode === 'link'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Add Link
                </button>
              </div>

              {uploadMode === 'file' && (
              <div className="space-y-6">
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
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handlePauseUploads}
                      variant="outline"
                      size="sm"
                      className="text-gray-700 border-gray-200 hover:bg-gray-100"
                      disabled={pausePending || uploadPaused}
                    >
                      {pausePending ? 'Pausing...' : 'Pause' }
                    </Button>
                    <Button
                      onClick={handleResumeUploads}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      disabled={!uploadPaused && !pausePending}
                    >
                      Resume
                    </Button>
                  </div>
                  {uploadPaused && (
                    <p className="text-xs text-amber-600">Uploads paused. Click resume to continue.</p>
                  )}
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
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, project: value });
                      setLastUsedProject(value);
                    }}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <select
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    disabled={uploading}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                  >
                    <option value="">Select company (optional)</option>
                    {companies.map((company) => (
                      <option key={company._id} value={company._id}>
                        {company.name}
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

                {/* Video Compression Settings */}
                {uploadMode === 'file' && (
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Video Compression
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compressionEnabled}
                          onChange={(e) => setCompressionEnabled(e.target.checked)}
                          disabled={uploading}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    {compressionEnabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quality: {Math.round(compressionQuality * 100)}%
                          </label>
                          <input
                            type="range"
                            min="0.3"
                            max="1"
                            step="0.1"
                            value={compressionQuality}
                            onChange={(e) => setCompressionQuality(parseFloat(e.target.value))}
                            disabled={uploading}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>Smaller (30%)</span>
                            <span>Balanced (80%)</span>
                            <span>Best (100%)</span>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-start">
                            <div className="text-blue-600 mt-0.5 mr-2">
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-sm">
                              <p className="text-blue-800 font-medium">Compression Info</p>
                              <p className="text-blue-700 mt-1">
                                Videos will be compressed to WebM format with VP9 codec. Higher quality settings maintain better visual quality but result in larger file sizes.
                              </p>
                            </div>
                          </div>
                        </div>

                        {compressingFiles.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                              <div className="text-sm">
                                <p className="text-yellow-800 font-medium">Compressing Videos</p>
                                <p className="text-yellow-700">
                                  Currently compressing: {compressingFiles.join(', ')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
              )}

              {uploadMode === 'link' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Video URL
                    </label>
                    <input
                      type="url"
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      disabled={uploading}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                      placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Supports YouTube, Vimeo, and other public video URLs
                    </p>
                  </div>

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
                      placeholder="Enter video title"
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
                </div>
              )}
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
                onClick={uploadMode === 'file' ? handleUpload : handleVideoLinkSubmit}
                disabled={uploading || (uploadMode === 'file' ? selectedFiles.length === 0 : !videoLink.trim())}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {uploadMode === 'file' ? 'Uploading...' : 'Adding...'}
                  </>
                ) : (
                  <>
                    {uploadMode === 'file' ? (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload {selectedFiles.length > 0 ? selectedFiles.length + " " : ""}Videos
                      </>
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-2" />
                        Add Video Link
                      </>
                    )}
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
                    <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 font-mono break-all overflow-x-auto">
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
                {renderPreviewPlayer(previewVideo)}
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
