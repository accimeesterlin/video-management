"use client";

import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Users,
  Video,
  ClipboardList,
  BarChart3,
  Settings,
  LogOut,
  Tag,
  Zap,
  X,
} from "lucide-react";

const navigationGroups = [
  {
    name: "Overview",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
    ]
  },
  {
    name: "Content Management",
    items: [
      { name: "Videos", href: "/dashboard/videos", icon: Video },
      { name: "Projects", href: "/dashboard/projects", icon: ClipboardList },
      { name: "Tags", href: "/dashboard/tags", icon: Tag },
    ]
  },
  {
    name: "Organization",
    items: [
      { name: "Companies", href: "/dashboard/companies", icon: Building2 },
      { name: "Team", href: "/dashboard/team", icon: Users },
    ]
  },
  {
    name: "System",
    items: [
      { name: "Integrations", href: "/dashboard/integrations", icon: Zap },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
    ]
  }
];

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`flex flex-col w-64 bg-white shadow-sm border-r border-gray-100 h-screen fixed left-0 top-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
        <h1 className="text-lg lg:text-xl font-bold text-gray-900">Video Management</h1>
        <button
          className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-6">
        {navigationGroups.map((group) => (
          <div key={group.name}>
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              {group.name}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon
                      className={`h-5 w-5 mr-3 ${
                        isActive ? "text-blue-600" : "text-gray-400"
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200"
        >
          <LogOut className="h-5 w-5 mr-3 text-gray-400" />
          Sign Out
        </button>
      </div>
    </div>
    </>
  );
}
