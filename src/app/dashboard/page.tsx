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
        <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
          <Sparkles className="h-4 w-4" />
          <span>Welcome to Video Editor Pro</span>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome back, {session?.user?.name || "User"}! 👋
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Manage your video editing projects, collaborate with your team, and
          track progress all in one place.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-modern group hover:scale-105 transition-transform duration-200">
          <CardHeader className="pb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Companies
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Manage your companies and teams
            </p>
            <Button asChild className="w-full btn-primary">
              <Link href="/dashboard/companies">
                <Building2 className="h-4 w-4 mr-2" />
                Manage Companies
              </Link>
            </Button>
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
            <Button asChild className="w-full btn-primary">
              <Link href="/dashboard/projects">
                <ClipboardList className="h-4 w-4 mr-2" />
                Manage Projects
              </Link>
            </Button>
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
            <Button asChild className="w-full btn-primary">
              <Link href="/dashboard/videos">
                <Video className="h-4 w-4 mr-2" />
                Manage Videos
              </Link>
            </Button>
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
            <Button asChild className="w-full btn-primary">
              <Link href="/dashboard/team">
                <Users className="h-4 w-4 mr-2" />
                Manage Team
              </Link>
            </Button>
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
                <Button asChild size="sm" className="btn-primary">
                  <Link href="/dashboard/companies">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Company
                  </Link>
                </Button>
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
                <Button asChild size="sm" className="btn-primary">
                  <Link href="/dashboard/team">
                    <Users className="h-4 w-4 mr-2" />
                    Invite Members
                  </Link>
                </Button>
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
                <Button asChild size="sm" className="btn-primary">
                  <Link href="/dashboard/projects">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Create Project
                  </Link>
                </Button>
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
            <Button asChild className="btn-primary">
              <Link href="/dashboard/companies">Get Started</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
