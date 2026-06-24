// components/AppSidebar.tsx
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  IconActivityHeartbeat,
  IconFileDescription,
  IconGauge,
  IconHelp,
  IconReportAnalytics,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

import { Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";

const data = {
  user: {
    name: "Claims Copilot",
    email: "agent@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Triage",
      url: "/",
      icon: IconGauge,
    },
    {
      title: "Agent View",
      url: "/agent",
      icon: IconUsers,
    },
    {
      title: "Policies",
      url: "/policies",
      icon: IconFileDescription,
    },
  ],
  navSecondary: [
    {
      title: "Reports (future)",
      url: "#",
      icon: IconReportAnalytics,
    },
    {
      title: "Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
  ],
};

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="border-r border-transparent" {...props}>
      {/* Header Panel */}
      <SidebarHeader className="bg-[#111827] text-white border-b border-white/5 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-transparent active:bg-transparent">
              <Link href="/" className="flex items-center gap-2">
                <IconActivityHeartbeat className="text-[#34d399] size-5" />
                <span className="text-sm font-medium tracking-wide text-white">
                  Claims Copilot
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Panel Content */}
      <SidebarContent className="bg-[#111827] px-2 py-3 flex flex-col justify-between gap-4">
        {/* Navigation Section */}
        <SidebarMenu className="space-y-0.5">
          {data.navMain.map((item) => {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  className={`text-xs transition-all duration-150 h-8.5 px-2.5 rounded-md ${
                    isActive 
                      ? "bg-[#34d399]/12 text-[#34d399] font-medium" 
                      : "text-[#9ca3af] hover:bg-white/[0.06] hover:text-[#e5e7eb]"
                  }`}
                >
                  <Link href={item.url}>
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Bottom Menu Area */}
        <SidebarMenu className="mt-auto border-t border-white/5 pt-2 space-y-0.5">
          {data.navSecondary.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild className="text-[11px] text-[#6b7280] hover:text-[#9ca3af] hover:bg-transparent">
                <a href={item.url}>
                  <item.icon className="size-3.5" />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      {/* Footer Area */}
      <SidebarFooter className="bg-[#111827] border-t border-white/5 p-3">
        <div className="flex items-center gap-2 text-xs">
          <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-blue-700 text-[10px] font-medium text-blue-200 shrink-0">
            HC
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden">
            <span className="font-medium text-slate-200 text-[11px] truncate">{data.user.name}</span>
            <span className="text-[10px] text-[#6b7280] truncate">
              {data.user.email}
            </span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}