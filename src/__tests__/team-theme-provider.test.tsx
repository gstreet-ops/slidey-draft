import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TeamThemeProvider } from "../components/team-theme-provider";

vi.mock("next-auth/react");

import { useSession } from "next-auth/react";

const mockUseSession = vi.mocked(useSession);

const baseUser = {
  id: "u1",
  email: "u@example.com",
  role: "user" as const,
  status: "active" as const,
};

describe("TeamThemeProvider", () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty("--team-primary");
    document.documentElement.style.removeProperty("--team-secondary");
    document.documentElement.style.removeProperty("--accent-primary");
    document.documentElement.style.removeProperty("--accent-secondary");
    document.documentElement.style.removeProperty("--accent-text");
  });

  it("sets accent + team CSS variables when session has a favoriteTeam", () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          ...baseUser,
          favoriteTeam: {
            id: "t1",
            name: "Pittsburgh Steelers",
            abbreviation: "PIT",
            primaryColor: "#FFB612",
            secondaryColor: "#101820",
            logoUrl: null,
          },
        },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TeamThemeProvider><div>child</div></TeamThemeProvider>);

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--team-primary")).toBe("#FFB612");
    expect(root.style.getPropertyValue("--team-secondary")).toBe("#101820");
    expect(root.style.getPropertyValue("--accent-primary")).toBe("#FFB612");
    // PIT has textOnPrimary=black per team-themes lookup
    expect(root.style.getPropertyValue("--accent-text")).toBe("black");
  });

  it("removes team variables and falls back to default accent when no favoriteTeam", () => {
    document.documentElement.style.setProperty("--team-primary", "#FF0000");
    document.documentElement.style.setProperty("--team-secondary", "#0000FF");

    mockUseSession.mockReturnValue({
      data: {
        user: { ...baseUser, favoriteTeam: null },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });

    render(<TeamThemeProvider><div>child</div></TeamThemeProvider>);

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--team-primary")).toBe("");
    expect(root.style.getPropertyValue("--team-secondary")).toBe("");
    expect(root.style.getPropertyValue("--accent-primary")).toBe("#FFB612");
  });

  it("uses default accent when session is loading", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });

    render(<TeamThemeProvider><div>child</div></TeamThemeProvider>);

    const root = document.documentElement;
    expect(root.style.getPropertyValue("--accent-primary")).toBe("#FFB612");
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
