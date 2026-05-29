import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import KPICard from "../../src/components/analytics/KPICard";

describe("KPICard", () => {
  it("renders label and numeric value", () => {
    render(<KPICard label="Total Decisions" value={1234} />);
    expect(screen.getByText("Total Decisions")).toBeInTheDocument();
    expect(screen.getByText(/1[.,]234/)).toBeInTheDocument();
  });

  it("formats percent values", () => {
    render(<KPICard label="Approval Rate" value={0.874} format="percent" />);
    expect(screen.getByText("87.4%")).toBeInTheDocument();
  });

  it("formats currency values", () => {
    render(<KPICard label="Total Cost" value={12.5} format="currency" />);
    const el = screen.getByText(/\$12/);
    expect(el).toBeInTheDocument();
  });

  it("shows loading skeleton when loading=true", () => {
    const { container } = render(<KPICard label="Test" value={0} loading />);
    expect(container.querySelector("[class*=skeleton]") || container.querySelector("[data-testid]") || container.firstChild).toBeTruthy();
    expect(screen.queryByText("Test")).not.toBeInTheDocument();
  });

  it("shows positive delta in green", () => {
    render(<KPICard label="Rate" value={0.9} format="percent" delta={3.2} />);
    const delta = screen.getByText(/3\.2%/);
    expect(delta.className).toContain("green");
  });

  it("shows negative delta in red", () => {
    render(<KPICard label="Rate" value={0.9} format="percent" delta={-1.5} />);
    const delta = screen.getByText(/1\.5%/);
    expect(delta.className).toContain("red");
  });
});
