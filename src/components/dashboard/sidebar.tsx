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
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Companies", href: "/dashboard/companies", icon: Building2 },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Projects", href: "/dashboard/projects", icon: ClipboardList },
  { name: "Videos", href: "/dashboard/videos", icon: Video },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-white shadow-sm border-r border-gray-100">
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Video Editor Pro</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
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
  );
}
