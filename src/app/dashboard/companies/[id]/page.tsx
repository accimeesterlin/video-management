"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Edit,
  ArrowLeft,
  Globe,
  MapPin,
  Calendar,
  Mail,
  User,
  UserPlus,
  X,
  Send,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";

interface Company {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  location?: string;
  members: Array<{
    userId: { _id: string; name: string; email: string };
    role: string;
    joinedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "MEMBER",
    message: "",
  });

  useEffect(() => {
    if (session && params.id) {
      fetchCompany(params.id as string);
    }
  }, [session, params.id]);

  const fetchCompany = async (companyId: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCompany(data);
      } else {
        toast.error("Failed to fetch company details");
        router.push("/dashboard/companies");
      }
    } catch (error) {
      toast.error("Error fetching company details");
      router.push("/dashboard/companies");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = () => {
    // Navigate to edit page or open modal
    router.push(`/dashboard/companies/${params.id}/edit`);
  };

  const handleInviteMember = () => {
    setShowInviteModal(true);
  };

  const handleSendInvite = async () => {
    if (!inviteData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    setInviting(true);
    try {
      const response = await fetch(`/api/companies/${params.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteData.email.trim(),
          role: inviteData.role,
          message: inviteData.message,
        }),
      });

      if (response.ok) {
        toast.success("Invitation sent successfully");
        setShowInviteModal(false);
        setInviteData({ email: "", role: "MEMBER", message: "" });
        // Optionally refresh company data to show pending invites
        fetchCompany(params.id as string);
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to send invitation");
      }
    } catch (error) {
      toast.error("Error sending invitation");
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-16">
        <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Company not found
        </h3>
        <p className="text-gray-500 mb-6">
          The company you're looking for doesn't exist or has been deleted.
        </p>
        <Link href="/dashboard/companies">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Companies
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/companies">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-gray-600 mt-2">Company Details</p>
          </div>
        </div>
        <Button 
          onClick={handleEditCompany}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Company
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Company Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2 text-blue-600" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{company.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {company.industry && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Industry</h4>
                    <p className="text-gray-600">{company.industry}</p>
                  </div>
                )}

                {company.size && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Company Size</h4>
                    <p className="text-gray-600">{company.size}</p>
                  </div>
                )}

                {company.location && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      {company.location}
                    </div>
                  </div>
                )}

                {company.website && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Website</h4>
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-gray-400" />
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-2" />
                  Created on {new Date(company.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-600" />
                  Team Members ({company.members.length})
                </div>
                <Button 
                  onClick={handleInviteMember}
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Invite Member
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.members.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-900 mb-2">No team members</h4>
                  <p className="text-gray-500 mb-4">
                    Start by inviting team members to join this company.
                  </p>
                  <Button 
                    onClick={handleInviteMember}
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Invite Member
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {company.members.map((member, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border border-gray-100 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {member.userId.name}
                          </h5>
                          <div className="flex items-center text-sm text-gray-500">
                            <Mail className="h-3 w-3 mr-1" />
                            {member.userId.email}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {member.role}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Joined {new Date(member.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Team Members</span>
                <span className="font-semibold">{company.members.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Created</span>
                <span className="font-semibold">
                  {new Date(company.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last Updated</span>
                <span className="font-semibold">
                  {new Date(company.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-gray-400 mb-2">No recent activity</div>
                <p className="text-sm text-gray-500">
                  Activity will appear here as your team collaborates
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invite Team Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Invite Team Member
              </h3>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteData({ email: "", role: "MEMBER", message: "" });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, email: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, role: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={inviteData.message}
                  onChange={(e) =>
                    setInviteData({ ...inviteData, message: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add a personal message to the invitation"
                />
              </div>
            </div>

            <div className="flex space-x-3 p-6 border-t border-gray-100">
              <Button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteData({ email: "", role: "MEMBER", message: "" });
                }}
                variant="outline"
                className="flex-1 py-3 border-gray-200 text-gray-700 hover:bg-gray-50"
                disabled={inviting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={inviting || !inviteData.email.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 disabled:opacity-50"
              >
                {inviting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}