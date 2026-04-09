import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OnTheClock } from "../components/on-the-clock";

const makeDraftOrder = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `slot${i + 1}`,
    pickNumber: i + 1,
    teamId: `team${i + 1}`,
    teamName: `Team ${i + 1}`,
    teamAbbreviation: `T${i + 1}`,
    teamPrimaryColor: "#123456",
    teamLogoUrl: null,
  }));

describe("OnTheClock", () => {
  it('shows "ON THE CLOCK" for the current team', () => {
    const draftOrder = makeDraftOrder(5);
    render(<OnTheClock draftOrder={draftOrder} results={[]} />);
    expect(screen.getByText(/on the clock/i)).toBeInTheDocument();
    expect(screen.getByText("Team 1")).toBeInTheDocument();
  });

  it("shows previous pick with player name when results exist", () => {
    const draftOrder = makeDraftOrder(5);
    const results = [{ pickNumber: 1, playerName: "Caleb Williams", playerPosition: "QB", teamAbbreviation: "T1" }];
    render(<OnTheClock draftOrder={draftOrder} results={results} />);
    expect(screen.getByText("Caleb Williams")).toBeInTheDocument();
  });

  it('shows "UP NEXT" with next team', () => {
    const draftOrder = makeDraftOrder(5);
    render(<OnTheClock draftOrder={draftOrder} results={[]} />);
    expect(screen.getByText(/up next/i)).toBeInTheDocument();
    expect(screen.getByText("Team 2")).toBeInTheDocument();
  });

  it('shows "DRAFT COMPLETE" when all picks are in', () => {
    const draftOrder = makeDraftOrder(32);
    const results = Array.from({ length: 32 }, (_, i) => ({
      pickNumber: i + 1,
      playerName: `Player ${i + 1}`,
      playerPosition: "QB",
      teamAbbreviation: `T${i + 1}`,
    }));
    render(<OnTheClock draftOrder={draftOrder} results={results} />);
    expect(screen.getByText(/draft complete/i)).toBeInTheDocument();
    expect(screen.getByText(/all 32 picks are in/i)).toBeInTheDocument();
  });

  it('shows caller "nailed it!" badge from previousPickContext', () => {
    const draftOrder = makeDraftOrder(5);
    const results = [{ pickNumber: 1, playerName: "Caleb Williams", playerPosition: "QB", teamAbbreviation: "T1" }];
    const previousPickContext = [
      { userName: "Alice", matchType: "exact", pointsAwarded: 10 },
    ];
    render(<OnTheClock draftOrder={draftOrder} results={results} previousPickContext={previousPickContext} />);
    expect(screen.getByText(/alice nailed it!/i)).toBeInTheDocument();
  });

  it("shows close caller badge from previousPickContext", () => {
    const draftOrder = makeDraftOrder(5);
    const results = [{ pickNumber: 1, playerName: "Caleb Williams", playerPosition: "QB", teamAbbreviation: "T1" }];
    const previousPickContext = [
      { userName: "Bob", matchType: "close", pointsAwarded: 5 },
    ];
    render(<OnTheClock draftOrder={draftOrder} results={results} previousPickContext={previousPickContext} />);
    expect(screen.getByText(/bob close/i)).toBeInTheDocument();
  });
});
