// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { AppSidebar } from "../components/AppSidebar";
import { AppHeader } from "../components/AppHeader";
import {
  SidebarProvider,
  SidebarInset,
} from "../components/ui/sidebar";

export const metadata: Metadata = {
  title: "Healthcare Claims Copilot",
  description: "Claims triage & explanation copilot (ML + RAG)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.className} min-h-screen bg-[#f8fafc] text-slate-900 antialiased`}
      >
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="flex flex-1 flex-col bg-[#f8fafc]">
              <AppHeader />
              <main className="flex-1 p-5 md:p-6 max-w-7xl w-full mx-auto overflow-y-auto">
                {children}
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </body>
    </html> 
  );
}