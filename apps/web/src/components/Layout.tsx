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

  const handleLogout = () => {
    localStorage.removeItem("wcp_token");
    localStorage.removeItem("wcp_user");
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#030303] text-foreground">
      {/* Premium Sidebar Navigation */}
      <nav className="hidden md:flex w-64 bg-[#070709] border-r border-white/5 px-4 py-8 flex-col shrink-0 relative z-20" aria-label="Main navigation">
        <div className="px-3 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-premium flex items-center justify-center shadow-lg shadow-purple-500/10 shrink-0">
            <ShieldCheck className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">WCP Compliance</h1>
            <p className="text-[10px] text-gray-500 font-semibold tracking-wider uppercase">Audit Suite v5.0</p>
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 relative group ${
                    isMainActive
                      ? "bg-gradient-premium text-white shadow-lg shadow-purple-500/5"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 transition-transform group-hover:scale-105 ${isMainActive ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
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
                          className={`flex items-center py-1.5 px-3 rounded-lg text-[11px] font-medium tracking-wide transition-all duration-150 ${
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
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">{user.role}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start text-xs font-semibold h-8 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/5 px-2" 
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
      <main className="flex-1 overflow-auto bg-[#030303] p-8 md:p-10 relative">
        {/* Subtle grid pattern overlay for high-fidelity background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
        <div className="relative z-10 animate-in fade-in duration-300">
          {children}
        </div>
      </main>
    </div>
  );
}

