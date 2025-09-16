"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Users,
  Video,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  BarChart3,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface AnalyticsData {
  projectMetrics: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
    avgCompletionTime: string;
    successRate: string;
  };
  teamMetrics: {
    totalMembers: number;
    activeMembers: number;
    avgProjectsPerMember: number;
    avgResponseTime: string;
    productivityScore: string;
  };
  videoMetrics: {
    totalVideos: number;
    videosThisMonth: number;
    avgVideoLength: string;
    processingTime: string;
    qualityScore: string;
  };
  monthlyData: Array<{
    month: string;
    projects: number;
    videos: number;
    teamMembers: number;
  }>;
  projectStatusData: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  teamPerformance: Array<{
    name: string;
    projects: number;
    videos: number;
    rating: number;
  }>;
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchAnalytics();
    }
  }, [session]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/analytics");
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        toast.error("Failed to fetch analytics data");
      }
    } catch (error) {
      toast.error("Error loading analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Unable to load analytics data</p>
      </div>
    );
  }

  const { projectMetrics, teamMetrics, videoMetrics, monthlyData, projectStatusData, teamPerformance } = analytics;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Analytics & Insights
        </h1>
        <p className="text-gray-600 mt-2">
          Track performance metrics and gain insights into your video editing
          operations
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Project Success Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {projectMetrics.successRate}
            </div>
            <p className="text-xs text-green-600">+2.1% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Team Productivity
            </CardTitle>
            <Users className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {teamMetrics.productivityScore}
            </div>
            <p className="text-xs text-blue-600">+0.3 from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Video Quality Score
            </CardTitle>
            <Video className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {videoMetrics.qualityScore}
            </div>
            <p className="text-xs text-purple-600">+0.2 from last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Projects Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Projects Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Projects</span>
                <span className="font-semibold">
                  {projectMetrics.totalProjects}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <span className="font-semibold text-blue-600">
                  {projectMetrics.activeProjects}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">
                  {projectMetrics.completedProjects}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">On Hold</span>
                <span className="font-semibold text-yellow-600">
                  {projectMetrics.onHoldProjects}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Completion</span>
                <span className="font-semibold">
                  {projectMetrics.avgCompletionTime}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Team Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Members</span>
                <span className="font-semibold">
                  {teamMetrics.totalMembers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active</span>
                <span className="font-semibold text-green-600">
                  {teamMetrics.activeMembers}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Avg Projects/Member
                </span>
                <span className="font-semibold">
                  {teamMetrics.avgProjectsPerMember}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Response Time</span>
                <span className="font-semibold">
                  {teamMetrics.avgResponseTime}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Productivity</span>
                <span className="font-semibold text-blue-600">
                  {teamMetrics.productivityScore}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Video Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Video className="h-5 w-5" />
              <span>Video Production</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Videos</span>
                <span className="font-semibold">
                  {videoMetrics.totalVideos}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="font-semibold text-blue-600">
                  {videoMetrics.videosThisMonth}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Length</span>
                <span className="font-semibold">
                  {videoMetrics.avgVideoLength}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Processing Time</span>
                <span className="font-semibold">
                  {videoMetrics.processingTime}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Quality Score</span>
                <span className="font-semibold text-green-600">
                  {videoMetrics.qualityScore}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((data, index) => (
                <div
                  key={data.month}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm font-medium text-gray-600">
                    {data.month}
                  </span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">
                        {data.projects} projects
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600">
                        {data.videos} videos
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Project Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {projectStatusData.map((data) => (
                <div key={data.status} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-600">
                      {data.status}
                    </span>
                    <span className="text-sm text-gray-500">
                      {data.count} projects
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        data.status === "Completed"
                          ? "bg-green-500"
                          : data.status === "Active"
                          ? "bg-blue-500"
                          : "bg-yellow-500"
                      }`}
                      style={{ width: `${data.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Team Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium text-gray-700">
                    Team Member
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Projects
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Videos
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Rating
                  </th>
                  <th className="text-left py-2 font-medium text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((member, index) => (
                  <tr key={member.name} className="border-b">
                    <td className="py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <span className="font-medium text-gray-900">
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600">{member.projects}</td>
                    <td className="py-3 text-gray-600">{member.videos}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          member.rating >= 9
                            ? "bg-green-100 text-green-800"
                            : member.rating >= 8
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {member.rating}/10
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          index < 3
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {index < 3 ? "Top Performer" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Positive Trends</h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Project success rate increased by 2.1%
                    </p>
                    <p className="text-xs text-gray-500">
                      Improved project management and team coordination
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Team productivity score improved
                    </p>
                    <p className="text-xs text-gray-500">
                      Better resource allocation and workflow optimization
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Areas for Improvement
              </h4>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Video processing time
                    </p>
                    <p className="text-xs text-gray-500">
                      Consider upgrading hardware or optimizing workflows
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Project completion time
                    </p>
                    <p className="text-xs text-gray-500">
                      Review project planning and milestone setting
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
