"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Search,
  User,
  Video,
  ClipboardList,
  Building2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

interface SearchSuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
}

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        fetchSuggestions(searchQuery);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const fetchSuggestions = async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query)}`
      );
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.results.slice(0, 5)); // Show top 5 suggestions
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      router.push(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setShowSuggestions(false);
    setSearchQuery(suggestion.title);

    switch (suggestion.type) {
      case "video":
        router.push(`/dashboard/videos/${suggestion.id}`);
        break;
      case "project":
        router.push(`/dashboard/projects/${suggestion.id}`);
        break;
      case "company":
        router.push(`/dashboard/companies/${suggestion.id}`);
        break;
      case "team":
        router.push(`/dashboard/team`);
        break;
      default:
        router.push(
          `/dashboard/search?q=${encodeURIComponent(suggestion.title)}`
        );
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case "video":
        return Video;
      case "project":
        return ClipboardList;
      case "company":
        return Building2;
      case "team":
        return Users;
      default:
        return Search;
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 px-6 py-4 header-consistent">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div ref={searchRef} className="relative">
            <form onSubmit={handleSearch}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Search projects, videos, team..."
                className="pl-10 pr-4 py-2 w-80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </form>

            {/* Search Suggestions */}
            {showSuggestions && (suggestions.length > 0 || loading) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : (
                  suggestions.map((suggestion) => {
                    const Icon = getSuggestionIcon(suggestion.type);
                    return (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <Icon className="h-4 w-4 text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {suggestion.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {suggestion.type} • {suggestion.description}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* View All Results */}
                {suggestions.length > 0 && (
                  <div
                    onClick={() => {
                      setShowSuggestions(false);
                      router.push(
                        `/dashboard/search?q=${encodeURIComponent(searchQuery)}`
                      );
                    }}
                    className="p-3 text-center text-sm text-blue-600 hover:bg-blue-50 cursor-pointer border-t border-gray-100"
                  >
                    View all results for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-50 rounded-lg">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-500 capitalize">User</p>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
