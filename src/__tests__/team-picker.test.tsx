import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TeamPicker } from "../components/team-picker";

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, width, height, className }: { src: string; alt: string; width: number; height: number; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} className={className} />
  ),
}));

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockUpdate = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: mockUpdate }),
}));

const teams = [
  { id: "1", name: "Team Alpha", abbreviation: "ALP", primaryColor: "#ff0000", logoUrl: "https://example.com/alpha.png" },
  { id: "2", name: "Team Beta", abbreviation: "BET", primaryColor: "#00ff00", logoUrl: null },
  { id: "3", name: "Team Gamma", abbreviation: "GAM", primaryColor: "#0000ff", logoUrl: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
});

describe("TeamPicker", () => {
  it("renders all teams as buttons with abbreviations", () => {
    render(<TeamPicker teams={teams} />);
    for (const team of teams) {
      expect(screen.getByRole("button", { name: new RegExp(team.abbreviation) })).toBeDefined();
    }
    // The abbreviation span appears in all buttons
    expect(screen.getAllByText("ALP").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("BET").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("GAM").length).toBeGreaterThanOrEqual(1);
  });

  it("shows team logo (img) when logoUrl is provided", () => {
    render(<TeamPicker teams={teams} />);
    const img = screen.getByAltText("Team Alpha") as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toContain("alpha.png");
  });

  it("shows abbreviation fallback div when logoUrl is null", () => {
    render(<TeamPicker teams={teams} />);
    // BET and GAM have no logo — their fallback div shows the abbreviation
    // The abbreviation appears once in the fallback div and once in the span
    const betElements = screen.getAllByText("BET");
    expect(betElements.length).toBe(2); // fallback div + span
  });

  it("pre-selects the team matching selectedTeamId", () => {
    render(<TeamPicker teams={teams} selectedTeamId="2" />);
    const betButton = screen.getByRole("button", { name: /BET/ });
    expect(betButton.className).toContain("ring-2");
  });

  it("on click: calls fetch with correct teamId, calls session update, calls router.push when redirectTo is set", async () => {
    render(<TeamPicker teams={teams} redirectTo="/dashboard" />);
    const alphaButton = screen.getByRole("button", { name: /ALP/ });
    fireEvent.click(alphaButton);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/user/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: "1" }),
    }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("on click without redirectTo: calls router.refresh instead", async () => {
    render(<TeamPicker teams={teams} />);
    const betButton = screen.getByRole("button", { name: /BET/ });
    fireEvent.click(betButton);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
