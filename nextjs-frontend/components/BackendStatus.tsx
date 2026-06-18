// components/BackendStatus.tsx
"use client";

import { useEffect, useState } from "react";

type Status = "unknown" | "ok" | "down";

export function BackendStatus() {
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("http://localhost:8000/health");
        if (!cancelled) {
          setStatus(res.ok ? "ok" : "down");
        }
      } catch {
        if (!cancelled) {
          setStatus("down");
        }
      }
    }

    check();

    // optional: re-check every 30s in dev
    const id = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const color =
    status === "ok"
      ? "bg-emerald-400"
      : status === "down"
      ? "bg-red-400"
      : "bg-slate-500";

  const label =
    status === "ok"
      ? "API: healthy"
      : status === "down"
      ? "API: down"
      : "API: checking";

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5 text-[10px] text-slate-300">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}