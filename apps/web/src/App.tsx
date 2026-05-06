import { BrowserRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Decisions from "./pages/Decisions";
import ReviewQueue from "./pages/ReviewQueue";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import { Skeleton } from "@/components/ui/skeleton";

const AnalyticsOverview = lazy(() => import("./pages/analytics/Overview"));
const AnalyticsCompliance = lazy(() => import("./pages/analytics/Compliance"));
const AnalyticsWages = lazy(() => import("./pages/analytics/Wages"));
const AnalyticsLLM = lazy(() => import("./pages/analytics/LLM"));

function PageLoader() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-6">Page not found</p>
      <button
        onClick={() => navigate("/")}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
      >
        Go Home
      </button>
    </div>
  );
}

function isAuthenticated(): boolean {
  return Boolean(localStorage.getItem("wcp_token"));
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isAuthenticated() ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/analyze" element={<Analyze />} />
                    <Route path="/decisions" element={<Decisions />} />
                    <Route path="/review" element={<ReviewQueue />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/analytics/overview" element={<Suspense fallback={<PageLoader />}><AnalyticsOverview /></Suspense>} />
                    <Route path="/analytics/compliance" element={<Suspense fallback={<PageLoader />}><AnalyticsCompliance /></Suspense>} />
                    <Route path="/analytics/wages" element={<Suspense fallback={<PageLoader />}><AnalyticsWages /></Suspense>} />
                    <Route path="/analytics/llm" element={<Suspense fallback={<PageLoader />}><AnalyticsLLM /></Suspense>} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
