"use client";

import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Users,
  Video,
  ClipboardList,
  Plus,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <div className="inline-flex items-center space-x-2 bg-brand-50 text-brand-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          <span>Welcome to VideoFlow</span>
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-neutral-900 mb-4 tracking-tight">
          Welcome back, {session?.user?.name || "User"}!
        </h1>
        <p className="text-xl text-neutral-600 max-w-2xl mx-auto leading-relaxed">
          Manage your video editing projects, collaborate with your team, and
          track progress all in one place.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-interactive group">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center group-hover:bg-brand-200 transition-colors duration-200">
              <Building2 className="h-6 w-6 text-brand-600" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              Companies
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Manage your companies and teams
            </p>
            <Link href="/dashboard/companies">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-lg shadow-sm transition-all duration-200">
                <Building2 className="h-4 w-4 mr-2" />
                Manage Companies
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-modern group hover:scale-105 transition-transform duration-200">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <ClipboardList className="h-6 w-6 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Projects
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Create and manage video projects
            </p>
            <Link href="/dashboard/projects">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-3 rounded-lg shadow-sm transition-all duration-200">
                <ClipboardList className="h-4 w-4 mr-2" />
                Manage Projects
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-modern group hover:scale-105 transition-transform duration-200">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <Video className="h-6 w-6 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Videos</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload and organize video content
            </p>
            <Link href="/dashboard/videos">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-3 rounded-lg shadow-sm transition-all duration-200">
                <Video className="h-4 w-4 mr-2" />
                Manage Videos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="card-modern group hover:scale-105 transition-transform duration-200">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-200 transition-colors">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Team</h3>
            <p className="text-sm text-gray-600 mb-4">
              Manage team members and roles
            </p>
            <Link href="/dashboard/team">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-3 rounded-lg shadow-sm transition-all duration-200">
                <Users className="h-4 w-4 mr-2" />
                Manage Team
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="card-modern">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">
                  Create Your First Company
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Start by creating a company to organize your team and
                  projects.
                </p>
                <Link href="/dashboard/companies">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-all duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Company
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-semibold text-sm">2</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">
                  Invite Team Members
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Add team members to collaborate on your video projects.
                </p>
                <Link href="/dashboard/team">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-all duration-200"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Invite Members
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-purple-600 font-semibold text-sm">3</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-2">
                  Start Your First Project
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Create a project and start uploading videos for editing.
                </p>
                <Link href="/dashboard/projects">
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm transition-all duration-200"
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Create Project
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="card-modern">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-900 flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-gray-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No activity yet
            </h3>
            <p className="text-gray-600 mb-4">
              Your recent activity will appear here once you start using the
              platform.
            </p>
            <Link href="/dashboard/companies">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg shadow-sm transition-all duration-200">
                Get Started
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
