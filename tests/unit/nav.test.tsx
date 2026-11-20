import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StatCard } from "@/components/shared/stat-card";
import { isActive } from "@/components/layout/nav-links";
import { navItems } from "@/config/site";
import { Users } from "lucide-react";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

describe("isActive", () => {
  it("matches the exact route and nested routes", () => {
    expect(isActive("/people", "/people")).toBe(true);
    expect(isActive("/people/abc", "/people")).toBe(true);
  });

  it("does not match routes that only share a prefix", () => {
    expect(isActive("/peoples", "/people")).toBe(false);
  });
});

describe("navigation config", () => {
  it("has unique hrefs", () => {
    const hrefs = navItems.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="People enrolled" value={3} icon={Users} />);
    expect(screen.getByText("People enrolled")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
