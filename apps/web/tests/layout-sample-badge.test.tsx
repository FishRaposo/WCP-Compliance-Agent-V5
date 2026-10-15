import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, renderHook, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../src/utils/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/utils/api-client")>()),
  IS_MOCK: true,
}));

import Layout from "../src/components/Layout";
import { useMediaQuery } from "../src/hooks/useMediaQuery";

type Listener = () => void;

function stubMatchMedia(initial: boolean) {
  const listeners = new Set<Listener>();
  const media = {
    matches: initial,
    media: "",
    addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
    removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => Object.assign(media, { media: query })),
  );
  return {
    set(next: boolean) {
      media.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout>
        <p>page content</p>
      </Layout>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Sample data badge placement", () => {
  it("renders one badge, in the sidebar, on desktop", () => {
    stubMatchMedia(true);
    renderLayout();

    expect(screen.getAllByText("Sample data", { exact: true })).toHaveLength(1);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getByText("Sample data", { exact: true })).toBeInTheDocument();
  });

  it("renders one badge, in the content area, on mobile", () => {
    stubMatchMedia(false);
    renderLayout();

    expect(screen.getAllByText("Sample data", { exact: true })).toHaveLength(1);
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).queryByText("Sample data", { exact: true })).toBeNull();
    expect(
      within(screen.getByRole("main")).getByText("Sample data", { exact: true }),
    ).toBeInTheDocument();
  });

  it("useMediaQuery follows media query changes", () => {
    const media = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    act(() => media.set(true));
    expect(result.current).toBe(true);
  });
});
