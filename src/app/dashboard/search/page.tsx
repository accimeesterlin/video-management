"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  Video,
  Users,
  Building2,
  ClipboardList,
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Play,
  Eye,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  type: "video" | "project" | "company" | "team";
  title: string;
  description: string;
  metadata: Record<string, any>;
  relevance: number;
}

export default function SearchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(query);
  const [filter, setFilter] = useState<string>("all");

  const filters = [
    { id: "all", label: "All", icon: Search },
    { id: "video", label: "Videos", icon: Video },
    { id: "project", label: "Projects", icon: ClipboardList },
    { id: "company", label: "Companies", icon: Building2 },
    { id: "team", label: "Team", icon: Users },
  ];

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchTerm)}&filter=${filter}`);
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        toast.error("Failed to perform search");
      }
    } catch (error) {
      toast.error("Search error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
      performSearch(searchQuery);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case "video":
        router.push(`/dashboard/videos/${result.id}`);
        break;
      case "project":
        router.push(`/dashboard/projects/${result.id}`);
        break;
      case "company":
        router.push(`/dashboard/companies/${result.id}`);
        break;
      case "team":
        router.push(`/dashboard/team`);
        break;
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "video": return Video;
      case "project": return ClipboardList;
      case "company": return Building2;
      case "team": return Users;
      default: return Search;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case "video": return "text-red-600 bg-red-100";
      case "project": return "text-blue-600 bg-blue-100";
      case "company": return "text-green-600 bg-green-100";
      case "team": return "text-purple-600 bg-purple-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const formatMetadata = (result: SearchResult) => {
    switch (result.type) {
      case "video":
        return (
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {result.metadata.duration && (
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {Math.floor(result.metadata.duration / 60)}:{(result.metadata.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
            {result.metadata.uploadedAt && (
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(result.metadata.uploadedAt).toLocaleDateString()}
              </span>
            )}
            {result.metadata.uploadedBy && (
              <span className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                {result.metadata.uploadedBy}
              </span>
            )}
          </div>
        );
      case "project":
        return (
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {result.metadata.createdAt && (
              <span className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(result.metadata.createdAt).toLocaleDateString()}
              </span>
            )}
            {result.metadata.status && (
              <span className={`px-2 py-1 rounded-full text-xs ${
                result.metadata.status === 'completed' ? 'bg-green-100 text-green-800' :
                result.metadata.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {result.metadata.status}
              </span>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const filteredResults = filter === "all" ? results : results.filter(r => r.type === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Search Results</h1>
            {query && (
              <p className="text-gray-600 mt-1">
                {filteredResults.length} results for "{query}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects, videos, team members..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button type="submit" disabled={loading} className="px-6">
              {loading ? "Searching..." : "Search"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filterOption) => {
          const Icon = filterOption.icon;
          const isActive = filter === filterOption.id;
          const count = filterOption.id === "all" ? results.length : results.filter(r => r.type === filterOption.id).length;
          
          return (
            <Button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id)}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className={`${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {filterOption.label}
              {count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  isActive ? "bg-blue-700" : "bg-gray-200 text-gray-700"
                }`}>
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Results */}
      {loading ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-16 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Searching...</p>
          </CardContent>
        </Card>
      ) : filteredResults.length === 0 ? (
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="py-16 text-center">
            <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {query ? "No results found" : "Start searching"}
            </h3>
            <p className="text-gray-500">
              {query 
                ? `No results found for "${query}". Try adjusting your search terms.`
                : "Enter a search term to find projects, videos, and team members."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredResults.map((result) => {
            const Icon = getResultIcon(result.type);
            const colorClass = getResultColor(result.type);
            
            return (
              <Card
                key={result.id}
                className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleResultClick(result)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {result.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {result.description}
                          </p>
                          <div className="mt-3">
                            {formatMetadata(result)}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${colorClass}`}>
                            {result.type}
                          </span>
                          {result.type === "video" && (
                            <Button size="sm" variant="outline">
                              <Play className="h-4 w-4 mr-1" />
                              Play
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}