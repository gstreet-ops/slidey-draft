import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TeamThemeProvider } from "../components/team-theme-provider";

vi.mock("next-auth/react");

import { useSession } from "next-auth/react";

const mockUseSession = vi.mocked(useSession);

describe("TeamThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty("--team-primary");
    document.documentElement.style.removeProperty("--team-secondary");
    document.documentElement.style.removeProperty("--slidey");
  });

  it("sets CSS variables when session has a favoriteTeam", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          favoriteTeam: {
            primaryColor: "#FF0000",
            secondaryColor: "#0000FF",
          },
        },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TeamThemeProvider><div>child</div></TeamThemeProvider>);

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--team-primary")).toBe("#FF0000");
    expect(root.style.getPropertyValue("--team-secondary")).toBe("#0000FF");
    expect(root.style.getPropertyValue("--slidey")).toBe("#FF0000");
  });

  it("removes team variables and sets default slidey when no favoriteTeam", () => {
    // Pre-set some values to ensure they get removed
    document.documentElement.style.setProperty("--team-primary", "#FF0000");
    document.documentElement.style.setProperty("--team-secondary", "#0000FF");

    mockUseSession.mockReturnValue({
      data: {
        user: { favoriteTeam: null },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TeamThemeProvider><div>child</div></TeamThemeProvider>);

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--team-primary")).toBe("");
    expect(root.style.getPropertyValue("--team-secondary")).toBe("");
    expect(root.style.getPropertyValue("--slidey")).toBe("#FFB612");
  });

  it("uses default slidey color when session is loading", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    render(<TeamThemeProvider><div>child</div></TeamThemeProvider>);

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--slidey")).toBe("#FFB612");
  });

  it("renders children correctly", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    render(<TeamThemeProvider><div data-testid="child">Hello</div></TeamThemeProvider>);

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
