// app/layout.tsx
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { BackendStatus } from "../components/BackendStatus";

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
      <body className={`${GeistSans.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 border-r bg-card">
            <div className="p-4 border-b">
              <h1 className="text-lg font-semibold">
                Claims Copilot
              </h1>
              <p className="text-xs text-muted-foreground">
                Internal dashboard
              </p>
            </div>
            <nav className="p-4 space-y-2 text-sm">
              <div className="font-medium text-muted-foreground">
                Sections
              </div>
              <Link
                href="/"
                className="block rounded px-2 py-1 bg-muted"
              >
                Triage
              </Link>
              <Link
                href="/agent"
                className="block rounded px-2 py-1 hover:bg-muted"
              >
                Agent View
              </Link>
              <Link
                href="/policies"
                className="block rounded px-2 py-1 hover:bg-muted"
              >
                Policies
              </Link>
            </nav>
          </aside>

          {/* Main content */}
          <div className="flex-1 flex flex-col">
            <header className="h-14 border-b flex items-center justify-between px-4">
              <div className="text-sm text-muted-foreground">
                Healthcare Claims Triage &amp; Explanation Copilot
              </div>
              <div className="text-xs text-muted-foreground">
                Environment: <span className="font-medium">Dev</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  Dev
                </span>
                <BackendStatus />
              </div>
            </header>
            <main className="flex-1 p-4">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}