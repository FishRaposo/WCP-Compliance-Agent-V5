// vite.config.ts
import { defineConfig } from "file:///C:/Users/vinic/OneDrive/Keystone%20Projects/WCP-Compliance-Agent-V5/node_modules/.pnpm/vitest@2.1.9_@types+node@22.19.17_jsdom@25.0.1/node_modules/vitest/dist/config.js";
import react from "file:///C:/Users/vinic/OneDrive/Keystone%20Projects/WCP-Compliance-Agent-V5/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@6.4.2_@types+node@22.19.17_jiti@1.21.7_tsx@4.21.0_/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\vinic\\OneDrive\\Keystone Projects\\WCP-Compliance-Agent-V5\\apps\\web";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL ?? "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/setupTests.ts"],
    include: ["tests/**/*.test.{ts,tsx}"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFx2aW5pY1xcXFxPbmVEcml2ZVxcXFxLZXlzdG9uZSBQcm9qZWN0c1xcXFxXQ1AtQ29tcGxpYW5jZS1BZ2VudC1WNVxcXFxhcHBzXFxcXHdlYlwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcdmluaWNcXFxcT25lRHJpdmVcXFxcS2V5c3RvbmUgUHJvamVjdHNcXFxcV0NQLUNvbXBsaWFuY2UtQWdlbnQtVjVcXFxcYXBwc1xcXFx3ZWJcXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL3ZpbmljL09uZURyaXZlL0tleXN0b25lJTIwUHJvamVjdHMvV0NQLUNvbXBsaWFuY2UtQWdlbnQtVjUvYXBwcy93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZXN0L2NvbmZpZ1wiO1xuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgIFwiQFwiOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcIi4vc3JjXCIpLFxuICAgIH0sXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgcHJveHk6IHtcbiAgICAgIFwiL2FwaVwiOiB7XG4gICAgICAgIHRhcmdldDogcHJvY2Vzcy5lbnYuVklURV9BUElfVVJMID8/IFwiaHR0cDovL2xvY2FsaG9zdDozMDAwXCIsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbiAgdGVzdDoge1xuICAgIGVudmlyb25tZW50OiBcImpzZG9tXCIsXG4gICAgc2V0dXBGaWxlczogW1wiLi9zcmMvc2V0dXBUZXN0cy50c1wiXSxcbiAgICBpbmNsdWRlOiBbXCJ0ZXN0cy8qKi8qLnRlc3Que3RzLHRzeH1cIl0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa2EsU0FBUyxvQkFBb0I7QUFDL2IsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUEsRUFDakIsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLFFBQ04sUUFBUSxRQUFRLElBQUksZ0JBQWdCO0FBQUEsUUFDcEMsY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLE1BQU07QUFBQSxJQUNKLGFBQWE7QUFBQSxJQUNiLFlBQVksQ0FBQyxxQkFBcUI7QUFBQSxJQUNsQyxTQUFTLENBQUMsMEJBQTBCO0FBQUEsRUFDdEM7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
