"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Plus,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  XCircle,
  X,
  Save,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface Project {
  _id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  startDate: string;
  endDate: string;
  team: string[];
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    assignee: string;
    dueDate: string;
  }>;
}

export default function ProjectsPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "Active",
    progress: 0,
    startDate: "",
    endDate: "",
    team: "",
  });

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session]);

  const fetchProjects = async () => {
    try {
      const response = await fetch("/api/projects");
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        toast.error("Failed to fetch projects");
      }
    } catch (error) {
      toast.error("Error fetching projects");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
        }),
      });

      if (response.ok) {
        toast.success("Project created successfully");
        setShowCreateModal(false);
        setFormData({
          name: "",
          description: "",
          status: "Active",
          progress: 0,
          startDate: "",
          endDate: "",
          team: "",
        });
        fetchProjects();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create project");
      }
    } catch (error) {
      toast.error("Error creating project");
    }
  };

  const handleEditProject = async () => {
    if (!editingProject || !formData.name.trim()) return;

    try {
      const response = await fetch(`/api/projects/${editingProject._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description,
          status: formData.status,
          progress: formData.progress,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          team: formData.team ? formData.team.split(',').map(t => t.trim()).filter(t => t) : [],
        }),
      });

      if (response.ok) {
        toast.success("Project updated successfully");
        setShowEditModal(false);
        setEditingProject(null);
        setFormData({
          name: "",
          description: "",
          status: "Active",
          progress: 0,
          startDate: "",
          endDate: "",
          team: "",
        });
        fetchProjects(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update project");
      }
    } catch (error) {
      toast.error("Error updating project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Project deleted successfully");
        if (selectedProject?._id === projectId) {
          setSelectedProject(null);
        }
        fetchProjects();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete project");
      }
    } catch (error) {
      toast.error("Error deleting project");
    }
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      description: project.description,
      status: project.status,
      progress: project.progress,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      team: project.team?.join(', ') || "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      status: "Active",
      progress: 0,
      startDate: "",
      endDate: "",
      team: "",
    });
    setEditingProject(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "On Hold":
        return "bg-yellow-100 text-yellow-800";
      case "Completed":
        return "bg-blue-100 text-blue-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "In Progress":
        return <Play className="h-4 w-4 text-blue-600" />;
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "On Hold":
        return <Pause className="h-4 w-4 text-orange-600" />;
      case "Cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
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
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-2">
            Manage your video editing projects and track progress
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-3 rounded-lg font-medium shadow-sm w-full sm:w-auto"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Project
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <ClipboardList className="h-4 w-4 mr-2 text-blue-500" />
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {projects.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">All projects</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Play className="h-4 w-4 mr-2 text-green-500" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {projects.filter((p) => p.status === "Active").length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Currently running</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Pause className="h-4 w-4 mr-2 text-yellow-500" />
              On Hold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {projects.filter((p) => p.status === "On Hold").length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Paused projects</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-blue-500" />
              Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {projects.length > 0
                ? Math.round(
                    projects.reduce((sum, p) => sum + p.progress, 0) /
                      projects.length
                  )
                : 0}
              %
            </div>
            <p className="text-sm text-gray-500 mt-1">Overall completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-16 text-center">
            <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No projects yet
            </h3>
            <p className="text-gray-500 mb-6">
              Create your first project to get started
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Projects List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              All Projects
            </h2>
            {projects.map((project) => (
              <Card
                key={project._id}
                className={`border-0 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer ${
                  selectedProject?._id === project._id
                    ? "ring-2 ring-blue-500"
                    : ""
                }`}
                onClick={() => setSelectedProject(project)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {project.name}
                      </h3>
                      <div className="flex items-center justify-between sm:justify-end space-x-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${getStatusColor(
                            project.status
                          )}`}
                        >
                          {project.status}
                        </span>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(project);
                            }}
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1 h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProject(project._id);
                            }}
                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2">
                      {project.description}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm text-gray-500 gap-2 sm:gap-0">
                      <span className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {project.team.length} members
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(project.startDate).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{project.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Project Details */}
          <div className="space-y-6">
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                  Project Details
                  {selectedProject && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(selectedProject)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedProject ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {selectedProject.name}
                      </h3>
                      <div className="flex items-center space-x-3 mb-4">
                        <span
                          className={`px-3 py-1 text-sm rounded-full ${getStatusColor(
                            selectedProject.status
                          )}`}
                        >
                          {selectedProject.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {selectedProject.progress}% complete
                        </span>
                      </div>
                      <p className="text-gray-600">
                        {selectedProject.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          Start Date
                        </h4>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(
                            selectedProject.startDate
                          ).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          End Date
                        </h4>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(
                            selectedProject.endDate
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">
                        Team Members
                      </h4>
                      <div className="flex items-center text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        {selectedProject.team.length} members
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">
                        Progress
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Overall Progress</span>
                          <span>{selectedProject.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${selectedProject.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {selectedProject.tasks &&
                      selectedProject.tasks.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">
                            Recent Tasks
                          </h4>
                          <div className="space-y-2">
                            {selectedProject.tasks.slice(0, 3).map((task) => (
                              <div
                                key={task.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center space-x-3">
                                  {getTaskStatusIcon(task.status)}
                                  <span className="text-sm font-medium">
                                    {task.title}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Due{" "}
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a project
                    </h3>
                    <p className="text-gray-600">
                      Click on a project from the list to view details
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Create New Project
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
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
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter project name"
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
                  placeholder="Describe your project"
                />
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                variant="outline"
                className="flex-1 py-3 border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={!formData.name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit Project
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

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter project name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
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
                  placeholder="Describe your project"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Progress: {formData.progress}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) =>
                    setFormData({ ...formData, progress: parseInt(e.target.value) })
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Members (comma-separated names)
                </label>
                <input
                  type="text"
                  value={formData.team}
                  onChange={(e) =>
                    setFormData({ ...formData, team: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe, Jane Smith, Bob Johnson"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Enter team member names separated by commas
                </p>
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
                onClick={handleEditProject}
                disabled={!formData.name.trim()}
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
