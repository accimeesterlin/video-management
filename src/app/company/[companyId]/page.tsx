"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Globe,
  MapPin,
  Play,
  Upload,
  Video,
} from "lucide-react";

interface CompanyProfile {
  _id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  size?: string;
  founded?: string;
  location?: string;
  logo?: string;
  createdAt?: string;
}

interface CompanyVideo {
  _id: string;
  title: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
  url?: string;
  uploadedAt?: string;
  tags?: string[];
}

interface CompanyResponse {
  company: CompanyProfile;
  videos: CompanyVideo[];
  stats: {
    totalVideos: number;
    totalDuration: number;
  };
}

const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function CompanyPublicPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [data, setData] = useState<CompanyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/companies/${companyId}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ error: "Company not found" }));
          setError(payload.error || "Company not found");
          return;
        }
        const payload = await response.json();
        setData(payload);
      } catch (fetchError) {
        setError("Failed to load company profile");
      } finally {
        setLoading(false);
      }
    };

    if (companyId) {
      fetchCompany();
    }
  }, [companyId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md text-center">
          <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Company Unavailable
          </h1>
          <p className="text-gray-600 mb-6">{error || "We couldn't find this company."}</p>
          <Button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700 text-white">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const { company, videos, stats } = data;

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center text-3xl font-bold">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  company.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-semibold flex items-center gap-3">
                  {company.name}
                  {company.website && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(company.website, "_blank", "noopener,noreferrer")}
                      className="text-white border-white hover:bg-white/10"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Visit Website
                    </Button>
                  )}
                </h1>
                {company.description && (
                  <p className="mt-3 text-white/80 max-w-2xl">
                    {company.description}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/80">
                  {company.industry && (
                    <span>Industry: <strong>{company.industry}</strong></span>
                  )}
                  {company.size && (
                    <span>Company Size: <strong>{company.size}</strong></span>
                  )}
                  {company.founded && (
                    <span>Founded: <strong>{company.founded}</strong></span>
                  )}
                  {company.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {company.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/videos")}
              className="text-white border-white hover:bg-white/10"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Video
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Total Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{stats.totalVideos}</p>
              <p className="text-sm text-gray-500">Public videos available</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Total Watch Time</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{formatDuration(stats.totalDuration)}</p>
              <p className="text-sm text-gray-500">Combined duration</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle>Joined</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">
                {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : "--"}
              </p>
              <p className="text-sm text-gray-500">Onboarded</p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Videos</CardTitle>
          </CardHeader>
          <CardContent>
            {videos.length === 0 ? (
              <div className="py-12 text-center">
                <Video className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-lg font-medium text-gray-900">No public videos yet</h2>
                <p className="text-gray-500 mt-2">
                  Check back soon to see published content from this company.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <Card
                    key={video._id}
                    className="border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
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
                          {video.uploadedAt ? new Date(video.uploadedAt).toLocaleDateString() : "--"}
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
                      <Button
                        className="w-full"
                        onClick={() => router.push(`/shared/video/${video._id}`)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Watch
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
