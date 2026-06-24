// components/AppHeader.tsx
"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { BackendStatus } from "./BackendStatus";

export function AppHeader() {
  return (
    <header className="flex h-11 items-center justify-between border-b border-slate-200/80 bg-white px-4 shrink-0 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <SidebarTrigger className="-ml-1 text-slate-500 hover:bg-slate-100" />
        <span className="font-medium">
          Healthcare Claims Triage &amp; Explanation Copilot
        </span>
      </div>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="rounded bg-[#064e3b] text-[#6ee7b7] text-[10px] px-2 py-0.5 font-medium">
          Dev
        </span>
        <BackendStatus />
      </div>
    </header>
  );
}