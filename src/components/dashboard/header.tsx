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
  Menu,
} from "lucide-react";
import { toast } from "sonner";

interface SearchSuggestion {
  id: string;
  type: string;
  title: string;
  description: string;
}

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
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
    <header className="bg-white shadow-sm border-b border-neutral-100 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile hamburger menu */}
          <button
            className="lg:hidden btn-ghost p-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </button>
          
          {/* Search */}
          <div ref={searchRef} className="relative">
            <form onSubmit={handleSearch}>
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
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
                className="input-modern pl-11 w-48 sm:w-64 lg:w-80"
              />
            </form>

            {/* Search Suggestions */}
            {showSuggestions && (suggestions.length > 0 || loading) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <div className="loading-spinner mx-auto"></div>
                  </div>
                ) : (
                  suggestions.map((suggestion) => {
                    const Icon = getSuggestionIcon(suggestion.type);
                    return (
                      <div
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex items-center space-x-3 p-3 hover:bg-neutral-50 cursor-pointer border-b border-neutral-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                      >
                        <Icon className="h-4 w-4 text-neutral-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {suggestion.title}
                          </p>
                          <p className="text-xs text-neutral-500 truncate">
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
                    className="p-3 text-center text-sm text-brand-600 hover:bg-brand-50 cursor-pointer border-t border-neutral-100 rounded-b-xl font-medium"
                  >
                    View all results for &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <button className="relative btn-ghost p-2">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-neutral-900">
                {session?.user?.name}
              </p>
              <p className="text-xs text-neutral-500">Member</p>
            </div>
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-sm">
              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
