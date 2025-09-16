"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Play,
  Upload,
  Video,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ProjectDetail {
  _id: string;
  name: string;
  description: string;
  status?: string;
  progress?: number;
  startDate?: string;
  endDate?: string;
  team?: Array<{ _id: string; name?: string; email?: string }>;
  createdAt?: string;
  updatedAt?: string;
}

interface VideoSummary {
  _id: string;
  title: string;
  description?: string;
  duration?: number;
  size?: number;
  status?: string;
  project?: string;
  projectId?: string | null;
  thumbnail?: string;
  url?: string;
  uploadedAt?: string;
  tags?: string[];
}

interface ProjectStats {
  totalVideos: number;
  totalDuration: number;
  totalSize: number;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [videos, setVideos] = useState<VideoSummary[]>([]);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Active",
    progress: 0,
  });

  useEffect(() => {
    if (session && projectId) {
      fetchProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}`);
      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to load project");
        router.push("/dashboard/projects");
        return;
      }

      const data = await response.json();
      setProject(data.project);
      setVideos(data.videos || []);
      setStats(data.stats || null);

      if (data.project) {
        setFormData({
          name: data.project.name || "",
          description: data.project.description || "",
          status: data.project.status || "Active",
          progress:
            typeof data.project.progress === "number"
              ? data.project.progress
              : 0,
        });
      }
    } catch (error) {
      toast.error("Error loading project");
      router.push("/dashboard/projects");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return "--";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const handleSaveProject = async () => {
    if (!project) return;
    if (!formData.name.trim()) {
      toast.error("Project name is required");
      return;
    }

    setSavingProject(true);
    try {
      const response = await fetch(`/api/projects/${project._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description,
          status: formData.status,
          progress: formData.progress,
        }),
      });

      if (response.ok) {
        toast.success("Project updated successfully");
        setShowEditModal(false);
        fetchProject();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update project");
      }
    } catch (error) {
      toast.error("Error updating project");
    } finally {
      setSavingProject(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Project not found</p>
        <Button
          onClick={() => router.push("/dashboard/projects")}
          className="mt-4"
        >
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/projects")}
            className="text-gray-600 hover:text-gray-900 self-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600 mt-1">
              {project.status || "Active"} • Updated {project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "recently"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="border-0 shadow-sm bg-white lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600 leading-relaxed">
              {project.description || "No description provided."}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Status
                </p>
                <p className="text-lg font-semibold text-blue-900 mt-2">
                  {project.status || "Active"}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-sm text-purple-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Progress
                </p>
                <p className="text-lg font-semibold text-purple-900 mt-2">
                  {typeof project.progress === "number" ? `${project.progress}%` : "0%"}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Team Members
                </p>
                <p className="text-lg font-semibold text-green-900 mt-2">
                  {project.team?.length || 0}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <div>
                  <p className="font-medium">Start Date</p>
                  <p>{project.startDate ? new Date(project.startDate).toLocaleDateString() : "Not set"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <div>
                  <p className="font-medium">End Date</p>
                  <p>{project.endDate ? new Date(project.endDate).toLocaleDateString() : "Not set"}</p>
                </div>
              </div>
            </div>

            {project.team && project.team.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Team</h3>
                <div className="flex flex-wrap gap-2">
                  {project.team.map((member) => (
                    <span
                      key={member._id}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                    >
                      {member.name || member.email || "Team Member"}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Project Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Total Videos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.totalVideos ?? 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Duration</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatDuration(stats?.totalDuration)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Storage Used</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatFileSize(stats?.totalSize)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Project Videos</CardTitle>
            <p className="text-sm text-gray-500">
              Videos associated with this project
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/videos")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New Video
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
              <p className="text-gray-500">Upload a video or associate existing videos with this project.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {videos.map((video) => (
                <Card
                  key={video._id}
                  className="border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/dashboard/videos/${video._id}`)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      {video.thumbnail ? (
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {formatDuration(video.duration)}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate" title={video.title}>
                        {video.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Uploaded {video.uploadedAt ? new Date(video.uploadedAt).toLocaleDateString() : "--"}
                      </p>
                    </div>
                    {video.tags && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {video.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                        {video.tags.length > 3 && (
                          <span className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md">
                            +{video.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showEditModal && project && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[80]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Edit Project</h3>
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
                  Name
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Project name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Describe the project"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Progress (%)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.progress}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        progress: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                      }))
                    }
                  />
               </div>
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-100">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEditModal(false)}
                disabled={savingProject}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleSaveProject}
                disabled={savingProject}
              >
                {savingProject ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
