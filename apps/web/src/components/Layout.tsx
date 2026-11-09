import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  BriefcaseBusiness,
  History,
  LayoutDashboard,
  LogOut,
  Settings,
  TableProperties,
  Upload,
  ShieldCheck,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import SampleDataBadge from "@/components/SampleDataBadge";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyze", label: "Analyze", icon: Upload },
  { href: "/decisions", label: "Decisions", icon: History },
  { href: "/review", label: "Review Queue", icon: AlertCircle },
  { href: "/contracts", label: "Contracts", icon: BriefcaseBusiness },
  { href: "/payrolls", label: "Payrolls", icon: TableProperties },
  { href: "/ingestion", label: "Ingestion", icon: Upload },
  {
    href: "/analytics/overview",
    label: "Analytics",
    icon: BarChart3,
    subItems: [
      { href: "/analytics/overview", label: "Overview" },
      { href: "/analytics/compliance", label: "Compliance" },
      { href: "/analytics/wages", label: "Wages" },
      { href: "/analytics/llm", label: "LLM Performance" }
    ]
  },
  { href: "/settings", label: "Settings", icon: Settings },
];

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("wcp_user") || "null");
  } catch {
    return null;
  }
}

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = getUser();
  // The sidebar is hidden below md, so the Sample data label moves into the content area there.
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleLogout = () => {
    localStorage.removeItem("wcp_token");
    localStorage.removeItem("wcp_user");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#0c1410] text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded focus:bg-[#f7f2e8] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#13251f]"
      >
        Skip to content
      </a>
      {/* Desktop audit ledger navigation */}
      <nav className="hidden md:flex w-64 bg-[#101a14] border-r border-white/10 px-4 py-8 flex-col shrink-0 relative z-20" aria-label="Main navigation">
        <div className="px-3 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ledger-accent flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold tracking-tight text-white">WCP Compliance</p>
              {isDesktop && <SampleDataBadge />}
            </div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider uppercase">Audit suite v5.0</p>
          </div>
        </div>

        <div className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isMainActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href.split('/').slice(0, 3).join('/')));

            return (
              <div key={item.href} className="space-y-1">
                <Link
                  to={item.href}
                  className={`flex min-h-[44px] items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 relative group ${
                    isMainActive
                      ? "bg-ledger-accent text-white shadow-lg shadow-purple-500/5"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-transform group-hover:scale-105 ${isMainActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
                  <span className="flex-1">{item.label}</span>
                </Link>

                {item.subItems && (pathname.startsWith("/analytics") || isMainActive) && (
                  <div className="pl-6 space-y-1 border-l border-white/5 ml-5 mt-1">
                    {item.subItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          to={sub.href}
                          className={`flex min-h-[44px] items-center py-2 px-3 rounded-lg text-xs font-medium tracking-wide transition-all duration-150 ${
                            isSubActive
                              ? "text-indigo-400 font-bold bg-white/5"
                              : "text-gray-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-auto">
          <Separator className="bg-white/5 mb-5" />
          {user && (
            <div className="px-3 py-2 rounded-xl bg-glass border-glass space-y-3 shadow-premium">
              <div>
                <p className="text-xs font-bold text-white truncate">{user.email}</p>
                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-0.5">{user.role}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs font-semibold h-11 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 px-2"
                onClick={handleLogout}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4 mr-2 shrink-0" aria-hidden="true" />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-auto bg-[#0c1410] p-5 md:p-10 relative">
        {/* Subtle ledger rule overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
        <div className="relative z-10 animate-in fade-in duration-300">
          {!isDesktop && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#111a15] p-3 md:hidden">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">WCP Compliance</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Audit suite v5.0</p>
                <SampleDataBadge />
              </div>
            </div>
            <details className="relative shrink-0">
              <summary className="flex min-h-[44px] min-w-[44px] cursor-pointer list-none items-center justify-center rounded-md border border-white/15 px-3 text-xs font-semibold text-gray-200 [&::-webkit-details-marker]:hidden">
                Menu
              </summary>
              <nav className="absolute right-0 top-full z-40 mt-2 w-60 rounded-lg border border-white/10 bg-[#111a15] p-2 shadow-xl" aria-label="Mobile navigation">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")}
                    className={`flex min-h-[44px] items-center rounded-md px-3 text-xs font-semibold ${
                      pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href.split('/').slice(0, 3).join('/')))
                        ? "bg-white/10 text-white"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </details>
          </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}

