// app/policies/page.tsx
"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { 
  Home, 
  ChevronRight, 
  Files, 
  Tag, 
  Database, 
  RefreshCw, 
  Search, 
  Scan, 
  Network, 
  ClipboardX, 
  Ban, 
  ArrowRight, 
  Terminal 
} from "lucide-react";

type Policy = {
  id: string;
  title: string;
  category: string;
  catKey: "util" | "net" | "med" | "ben";
  description: string;
  chunks: string;
  date: string;
  icon: React.ComponentType<{ className?: string }>;
  iconStyles: string;
  badgeStyles: string;
};

const POLICIES: Policy[] = [
  {
    id: "policy-mri-preauth",
    title: "MRI & Advanced Imaging Prior Authorization",
    category: "Utilization management",
    catKey: "util",
    description: "Defines when MRI, CT, and PET scans require prior authorization based on modality, body part, and billed amount thresholds.",
    chunks: "312 chunks",
    date: "Jan 2024",
    icon: Scan,
    iconStyles: "bg-[#ecfdf5] text-[#059669]",
    badgeStyles: "bg-[#ecfdf5] text-[#059669]",
  },
  {
    id: "policy-oon",
    title: "Out-of-Network Provider Coverage",
    category: "Network & benefits",
    catKey: "net",
    description: "Explains coverage rules and member cost-sharing when services are rendered by out-of-network providers.",
    chunks: "288 chunks",
    date: "Jan 2024",
    icon: Network,
    iconStyles: "bg-[#eff6ff] text-[#2563eb]",
    badgeStyles: "bg-[#eff6ff] text-[#2563eb]",
  },
  {
    id: "policy-doc-req",
    title: "Clinical Documentation Requirements",
    category: "Medical policy",
    catKey: "med",
    description: "Outlines minimum documentation for high-cost imaging, elective surgeries, and chronic condition management claims.",
    chunks: "364 chunks",
    date: "Jan 2024",
    icon: ClipboardX,
    iconStyles: "bg-[#fdf4ff] text-[#9333ea]",
    badgeStyles: "bg-[#fdf4ff] text-[#9333ea]",
  },
  {
    id: "policy-non-covered",
    title: "Non-Covered Services",
    category: "Benefits",
    catKey: "ben",
    description: "Lists common services and procedures that are excluded from coverage under standard benefit plans.",
    chunks: "240 chunks",
    date: "Jan 2024",
    icon: Ban,
    iconStyles: "bg-[#fff7ed] text-[#c2410c]",
    badgeStyles: "bg-[#fff7ed] text-[#c2410c]",
  },
];

const CATEGORIES = [
  { id: "all", label: "All", styles: "bg-slate-900 text-white border-transparent" },
  { id: "util", label: "Utilization management", styles: "bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]" },
  { id: "net", label: "Network & benefits", styles: "bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]" },
  { id: "med", label: "Medical policy", styles: "bg-[#fdf4ff] text-[#9333ea] border-[#e9d5ff]" },
  { id: "ben", label: "Benefits", styles: "bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]" },
];

export default function PoliciesPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Filter policies based on BOTH search query and category chip selection
  const filtered = useMemo(() => {
    let result = POLICIES;
    
    if (activeCategory !== "all") {
      result = result.filter((p) => p.catKey === activeCategory);
    }

    const q = query.toLowerCase().trim();
    if (!q) return result;

    return result.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [query, activeCategory]);

  return (
    <div className="w-full font-sans max-w-5xl mx-auto space-y-6">
      
      {/* Page Header Area */}
      <div>
        <div className="flex items-center gap-1.5 text-[#9ca3af] text-[11px] mb-2">
          <Home className="w-3 h-3" />
          <ChevronRight className="w-3 h-3" />
          <span>Policies</span>
        </div>
        <h1 className="text-2xl font-medium text-[#111827] mb-1">Policy library</h1>
        <p className="text-xs text-[#6b7280]">Browse and audit the documents grounding explanations and suggested next steps</p>
      </div>

      {/* Metric Stats Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 shadow-sm">
          <Files className="w-4 h-4 text-[#6b7280]" />
          <div>
            <div className="text-base font-medium text-[#111827] leading-none">4</div>
            <div className="text-[10px] text-[#9ca3af] mt-1">Documents</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 shadow-sm">
          <Tag className="w-4 h-4 text-[#6b7280]" />
          <div>
            <div className="text-base font-medium text-[#111827] leading-none">4</div>
            <div className="text-[10px] text-[#9ca3af] mt-1">Categories</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 shadow-sm">
          <Database className="w-4 h-4 text-[#6b7280]" />
          <div>
            <div className="text-base font-medium text-[#111827] leading-none">1,204</div>
            <div className="text-[10px] text-[#9ca3af] mt-1">RAG chunks</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center gap-3 shadow-sm">
          <RefreshCw className="w-4 h-4 text-[#6b7280]" />
          <div>
            <div className="text-base font-medium text-[#111827] leading-none">Jan 2024</div>
            <div className="text-[10px] text-[#9ca3af] mt-1">Last synced</div>
          </div>
        </div>
      </div>

      {/* Styled Input Row */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] w-3.5 h-3.5" />
        <Input 
          type="text" 
          placeholder="Search by title, category, or description…" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-xs bg-white text-[#111827] h-9 focus-visible:ring-[#34d399]/20 focus-visible:border-[#6ee7b7]"
        />
      </div>

      {/* Interactive Category Chips */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 border rounded-full text-[11px] font-medium transition-all hover:opacity-80 ${
              activeCategory === cat.id 
                ? cat.styles 
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Active Section Label Counter */}
      <div className="text-[10px] font-medium text-[#9ca3af] tracking-wider uppercase">
        ALL POLICIES ({filtered.length})
      </div>

      {/* Policy Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.length === 0 ? (
          <p className="text-[11px] text-slate-400 col-span-full py-4 bg-white border border-dashed border-slate-200 rounded-xl text-center">
            No active policy documents match this query parameters.
          </p>
        ) : (
          filtered.map((policy) => {
            const Icon = policy.icon;
            return (
              <div 
                key={policy.id} 
                className="bg-white border border-slate-200 rounded-xl p-4 transition-all hover:border-[#6ee7b7] hover:shadow-sm flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${policy.iconStyles}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[13px] font-medium text-[#111827] leading-tight mb-1 truncate">
                      {policy.title}
                    </h3>
                    <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded ${policy.badgeStyles}`}>
                      {policy.category}
                    </span>
                  </div>
                </div>
                
                <p className="text-[11px] text-[#6b7280] line-clamp-2 leading-relaxed flex-1">
                  {policy.description}
                </p>
                
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                  <div className="text-[10px] text-[#9ca3af] flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    {policy.chunks} · {policy.date}
                  </div>
                  <button className="flex items-center gap-1 text-[11px] font-medium text-[#059669] bg-[#ecfdf5] px-2.5 py-1 rounded-md transition-colors hover:bg-[#a7f3d0]">
                    View
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Action Block - Bottom Terminal Section */}
      <div className="bg-[#111827] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#34d399]/12 rounded-md flex items-center justify-center">
            <Terminal className="w-4 h-4 text-[#34d399]" />
          </div>
          <div>
            <h3 className="text-[13px] font-medium text-white">RAG playground</h3>
            <p className="text-[11px] text-[#6b7280]">Test which policy chunks get retrieved for any claim query</p>
          </div>
        </div>
        <button className="bg-[#34d399] text-[#064e3b] px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 self-start sm:self-auto transition-opacity hover:opacity-90">
          Open playground
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

    </div>
  );
}