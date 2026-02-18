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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`flex flex-col w-64 bg-white shadow-lg border-r border-neutral-200 h-screen fixed left-0 top-0 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo/Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-neutral-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900">VideoFlow</h1>
          </div>
          <button
            className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-8">
          {navigationGroups.map((group, groupIndex) => (
            <div key={group.name}>
              <h3 className="px-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
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
                      className={`${isActive ? 'nav-link-active' : 'nav-link'}`}
                    >
                      <item.icon
                        className={`h-5 w-5 mr-3 ${
                          isActive ? "text-brand-600" : "text-neutral-400"
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

        {/* Sign Out */}
        <div className="p-4 border-t border-neutral-100">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="nav-link w-full justify-start text-neutral-600 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
