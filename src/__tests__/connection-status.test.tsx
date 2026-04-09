import { render, screen, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { ConnectionStatus } from "../components/connection-status";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ConnectionStatus", () => {
  it('shows "Updated just now" when lastUpdated is recent', () => {
    const now = new Date();
    render(<ConnectionStatus lastUpdated={now} failCount={0} onRefresh={vi.fn()} />);
    expect(screen.getByText(/updated just now/i)).toBeInTheDocument();
  });

  it('shows "Updated Xs ago" after time passes', async () => {
    const now = new Date();
    render(<ConnectionStatus lastUpdated={now} failCount={0} onRefresh={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(screen.getByText(/updated \d+s ago/i)).toBeInTheDocument();
  });

  it('shows amber "Connection lost" banner when failCount >= 3', () => {
    render(<ConnectionStatus lastUpdated={null} failCount={3} onRefresh={vi.fn()} />);
    expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
  });

  it("shows Refresh button when connection lost", () => {
    render(<ConnectionStatus lastUpdated={null} failCount={3} onRefresh={vi.fn()} />);
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("calls onRefresh when Refresh button clicked", () => {
    const onRefresh = vi.fn();
    render(<ConnectionStatus lastUpdated={null} failCount={3} onRefresh={onRefresh} />);
    screen.getByRole("button", { name: /refresh/i }).click();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("returns null when no lastUpdated and failCount < 3", () => {
    const { container } = render(
      <ConnectionStatus lastUpdated={null} failCount={0} onRefresh={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});
