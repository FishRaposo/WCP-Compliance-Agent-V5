import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface AnalyticsLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

const tabs = [
  { label: "Overview", href: "/analytics/overview" },
  { label: "Compliance", href: "/analytics/compliance" },
  { label: "Wages", href: "/analytics/wages" },
  { label: "LLM Cost", href: "/analytics/llm" },
];

export default function AnalyticsLayout({ title, description, children }: AnalyticsLayoutProps) {
  const location = useLocation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>

      <div className="flex gap-1 border-b pb-2">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            to={tab.href}
            className={`px-3 py-1.5 text-sm rounded-t-md transition-colors ${
              location.pathname.startsWith(tab.href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {children}
    </div>
  );
}
