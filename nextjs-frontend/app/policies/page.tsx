// app/policies/page.tsx
"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";

type Policy = {
  id: string;
  title: string;
  category: string;
  description: string;
};

const POLICIES: Policy[] = [
  {
    id: "policy-mri-preauth",
    title: "MRI & Advanced Imaging Prior Authorization",
    category: "Utilization Management",
    description:
      "Defines when MRI, CT, and PET scans require prior authorization based on modality, body part, and billed amount thresholds.",
  },
  {
    id: "policy-oon",
    title: "Out-of-Network Provider Coverage",
    category: "Network & Benefits",
    description:
      "Explains coverage rules and member cost-sharing when services are rendered by out-of-network providers.",
  },
  {
    id: "policy-doc-req",
    title: "Clinical Documentation Requirements",
    category: "Medical Policy",
    description:
      "Outlines minimum documentation for high-cost imaging, elective surgeries, and chronic condition management claims.",
  },
  {
    id: "policy-non-covered",
    title: "Non-Covered Services",
    category: "Benefits",
    description:
      "Lists common services and procedures that are excluded from coverage under standard benefit plans.",
  },
];

export default function PoliciesPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return POLICIES;
    return POLICIES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-slate-50">
          Policies & RAG Grounding
        </h2>
        <p className="text-xs text-slate-400">
          View and search the policy documents that ground explanations and suggested next steps.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Search by title, category, or description..."
          className="h-8 text-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-slate-400 col-span-full">
            No policies match this search.
          </p>
        ) : (
          filtered.map((p) => (
            <Card
              key={p.id}
              className="border-slate-800 bg-slate-950/70 p-4 space-y-1"
            >
              <p className="text-xs font-semibold text-slate-100">
                {p.title}
              </p>
              <p className="text-[11px] font-medium text-emerald-300">
                {p.category}
              </p>
              <p className="text-[11px] text-slate-300">
                {p.description}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
