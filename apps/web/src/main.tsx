import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

if (import.meta.env.VITE_MOCK_API === "true" && !localStorage.getItem("wcp_user")) {
  localStorage.setItem(
    "wcp_user",
    JSON.stringify({
      user_id: "demo-user",
      email: "portfolio@example.com",
      role: "admin",
    }),
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
