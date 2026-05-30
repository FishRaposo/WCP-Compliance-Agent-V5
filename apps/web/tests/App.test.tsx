import { describe, expect, it, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../src/App";

describe("App routing", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows login page when no token is present", () => {
    render(<App />);
    expect(screen.getByText(/Sign in to access the Davis-Bacon audit command center/i)).toBeInTheDocument();
  });

  it("does not show sidebar when unauthenticated", () => {
    render(<App />);
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Analyze")).not.toBeInTheDocument();
  });
});
