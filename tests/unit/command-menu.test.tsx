import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { CommandMenu } from "@/components/layout/command-menu";
import { useUiStore } from "@/stores/ui-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

beforeAll(() => {
  // cmdk relies on browser APIs that jsdom doesn't implement.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => {};
});

describe("CommandMenu", () => {
  it("renders the search input and navigation items when open", () => {
    useUiStore.setState({ commandOpen: true });
    render(<CommandMenu portal="user" />);

    expect(screen.getByPlaceholderText("Type a command or search…")).toBeInTheDocument();
    expect(screen.getByText("Start live scan")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
