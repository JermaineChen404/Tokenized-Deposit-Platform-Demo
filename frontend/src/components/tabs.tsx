"use client";

import { cn } from "@/lib/utils";

const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "banking", label: "Banking" },
  { id: "compliance", label: "Compliance" },
  { id: "admin", label: "Administration" },
  { id: "governance", label: "Governance" },
  { id: "validators", label: "Validators" },
  { id: "bridge", label: "Bridge" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

type TabsProps = {
  active: TabId;
  onChange: (id: TabId) => void;
  isAdmin: boolean;
};

export function Tabs({ active, onChange, isAdmin }: TabsProps) {
  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "admin" || tab.id === "compliance" || tab.id === "governance") {
      return isAdmin;
    }
    return true;
  });

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-900">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.id
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
