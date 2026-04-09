import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TriviaCard } from "../components/trivia-card";

const mockQuestion = {
  id: "q1",
  question: "Who won the 2023 NFL Draft first pick?",
  optionA: "Bryce Young",
  optionB: "CJ Stroud",
  optionC: "Will Anderson",
  optionD: "Anthony Richardson",
  category: "nfl_draft",
  difficulty: "medium",
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("TriviaCard", () => {
  it('renders "Start Trivia" button initially', () => {
    render(<TriviaCard poolId="pool1" />);
    expect(screen.getByRole("button", { name: /start trivia/i })).toBeInTheDocument();
  });

  it('shows "15 seconds per question" description', () => {
    render(<TriviaCard poolId="pool1" />);
    expect(screen.getByText(/15 seconds per question/i)).toBeInTheDocument();
  });

  it("shows question text after clicking Start", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => mockQuestion,
    } as Response);

    render(<TriviaCard poolId="pool1" />);
    fireEvent.click(screen.getByRole("button", { name: /start trivia/i }));

    await waitFor(() => {
      expect(screen.getByText(mockQuestion.question)).toBeInTheDocument();
    });

    expect(screen.getByText("Bryce Young")).toBeInTheDocument();
  });

  it("shows correct feedback after selecting correct answer", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => mockQuestion,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ correct: true, correctOption: "a", pointsAwarded: 5 }),
      } as Response);

    render(<TriviaCard poolId="pool1" />);
    fireEvent.click(screen.getByRole("button", { name: /start trivia/i }));

    await waitFor(() => {
      expect(screen.getByText(mockQuestion.question)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Bryce Young"));

    await waitFor(() => {
      expect(screen.getByText(/correct!/i)).toBeInTheDocument();
    });
  });

  it("shows wrong feedback after selecting wrong answer", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        json: async () => mockQuestion,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ correct: false, correctOption: "a", pointsAwarded: 0 }),
      } as Response);

    render(<TriviaCard poolId="pool1" />);
    fireEvent.click(screen.getByRole("button", { name: /start trivia/i }));

    await waitFor(() => {
      expect(screen.getByText(mockQuestion.question)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("CJ Stroud"));

    await waitFor(() => {
      expect(screen.getByText(/wrong!/i)).toBeInTheDocument();
    });
  });

  it('shows "All trivia complete!" when noMoreQuestions returned', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ noMoreQuestions: true }),
    } as Response);

    render(<TriviaCard poolId="pool1" />);
    fireEvent.click(screen.getByRole("button", { name: /start trivia/i }));

    await waitFor(() => {
      expect(screen.getByText(/all trivia complete!/i)).toBeInTheDocument();
    });
  });
});
