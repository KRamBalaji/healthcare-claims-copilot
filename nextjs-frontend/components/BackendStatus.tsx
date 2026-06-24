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

    const id = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const styles =
    status === "ok"
      ? { dot: "bg-emerald-500", wrapper: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      : status === "down"
      ? { dot: "bg-red-500", wrapper: "bg-red-50 text-red-700 border-red-200" }
      : { dot: "bg-slate-400", wrapper: "bg-slate-50 text-slate-600 border-slate-200" };

  const label =
    status === "ok"
      ? "API: healthy"
      : status === "down"
      ? "API: down"
      : "API: checking";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-all ${styles.wrapper}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {label}
    </span>
  );
}