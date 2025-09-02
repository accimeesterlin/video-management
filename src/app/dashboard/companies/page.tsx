"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  Globe,
  X,
  Save,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

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

export default function CompaniesPage() {
  const { data: session } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    size: "",
    location: "",
  });

  // Fetch companies on component mount
  useEffect(() => {
    if (session) {
      fetchCompanies();
    }
  }, [session]);

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/companies");
      if (response.ok) {
        const data = await response.json();
        setCompanies(data);
      } else {
        toast.error("Failed to fetch companies");
      }
    } catch (error) {
      toast.error("Error fetching companies");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Company created successfully");
        setShowCreateModal(false);
        setFormData({
          name: "",
          description: "",
          website: "",
          industry: "",
          size: "",
          location: "",
        });
        fetchCompanies();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to create company");
      }
    } catch (error) {
      toast.error("Error creating company");
    }
  };

  const handleEditCompany = async () => {
    if (!editingCompany) return;

    try {
      const response = await fetch(`/api/companies/${editingCompany._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Company updated successfully");
        setShowEditModal(false);
        setEditingCompany(null);
        setFormData({
          name: "",
          description: "",
          website: "",
          industry: "",
          size: "",
          location: "",
        });
        fetchCompanies();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to update company");
      }
    } catch (error) {
      toast.error("Error updating company");
    }
  };

  const handleDeleteCompany = async (companyId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this company? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Company deleted successfully");
        fetchCompanies();
      } else {
        const error = await response.json();
        toast.error(error.message || "Failed to delete company");
      }
    } catch (error) {
      toast.error("Error deleting company");
    }
  };

  const openEditModal = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      description: company.description || "",
      website: company.website || "",
      industry: company.industry || "",
      size: company.size || "",
      location: company.location || "",
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      website: "",
      industry: "",
      size: "",
      location: "",
    });
    setEditingCompany(null);
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
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-2">
            Manage your companies and their teams
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Company
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Building2 className="h-4 w-4 mr-2 text-blue-500" />
              Total Companies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {companies.length}
            </div>
            <p className="text-sm text-gray-500 mt-1">Active companies</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2 text-green-500" />
              Total Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {companies.reduce(
                (sum, company) => sum + company.members.length,
                0
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Across all companies</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-purple-500" />
              Recently Added
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {
                companies.filter((c) => {
                  const created = new Date(c.createdAt);
                  const now = new Date();
                  const diffDays =
                    (now.getTime() - created.getTime()) / (1000 * 3600 * 24);
                  return diffDays <= 7;
                }).length
              }
            </div>
            <p className="text-sm text-gray-500 mt-1">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Grid */}
      {companies.length === 0 ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-16 text-center">
            <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No companies yet
            </h3>
            <p className="text-gray-500 mb-6">
              Get started by creating your first company
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Company
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Card
              key={company._id}
              className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {company.name}
                      </h3>
                      {company.industry && (
                        <p className="text-sm text-gray-500">
                          {company.industry}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(company)}
                      className="text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCompany(company._id)}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {company.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {company.description}
                  </p>
                )}

                <div className="space-y-3">
                  {company.website && (
                    <div className="flex items-center text-sm text-gray-500">
                      <Globe className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">{company.website}</span>
                    </div>
                  )}

                  {company.location && (
                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{company.location}</span>
                    </div>
                  )}

                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="h-4 w-4 mr-2 text-gray-400" />
                    <span>
                      {company.members.length} member
                      {company.members.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span>
                      Created {new Date(company.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Company Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Create New Company
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
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter company name"
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
                  placeholder="Brief description of your company"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Technology"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Size
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) =>
                      setFormData({ ...formData, size: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select size</option>
                    <option value="1-10 employees">1-10 employees</option>
                    <option value="11-25 employees">11-25 employees</option>
                    <option value="26-50 employees">26-50 employees</option>
                    <option value="51-100 employees">51-100 employees</option>
                    <option value="100+ employees">100+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., New York, NY"
                  />
                </div>
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
                onClick={handleCreateCompany}
                disabled={!formData.name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3"
              >
                <Save className="h-4 w-4 mr-2" />
                Create Company
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Company Modal */}
      {showEditModal && editingCompany && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">
                Edit Company
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
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter company name"
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
                  placeholder="Brief description of your company"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) =>
                      setFormData({ ...formData, industry: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Technology"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Size
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) =>
                      setFormData({ ...formData, size: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select size</option>
                    <option value="1-10 employees">1-10 employees</option>
                    <option value="11-25 employees">11-25 employees</option>
                    <option value="26-50 employees">26-50 employees</option>
                    <option value="51-100 employees">51-100 employees</option>
                    <option value="100+ employees">100+ employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., New York, NY"
                  />
                </div>
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
                onClick={handleEditCompany}
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
