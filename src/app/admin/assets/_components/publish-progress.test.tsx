import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PublishProgress } from "./publish-progress";

afterEach(() => {
  vi.useRealTimers();
});

it("spreads estimated deployment progress over a minute", () => {
  vi.useFakeTimers();
  render(<PublishProgress />);
  const progress = screen.getByRole("progressbar", {
    name: "Deployment progress",
  });

  expect(screen.getByText(/Checking asset completeness/)).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(6000));
  expect(Number(progress.getAttribute("aria-valuenow"))).toBeLessThan(10);

  act(() => vi.advanceTimersByTime(24000));
  expect(progress).toHaveAttribute("aria-valuenow", "46");
  expect(
    screen.getByText(/Deploying ERC-3643 token suite/),
  ).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(15000));
  expect(
    screen.getByText(/Binding the token to the asset/),
  ).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(15000));
  expect(progress).toHaveAttribute("aria-valuenow", "92");
});

it("waits below completion when deployment takes longer than a minute", () => {
  vi.useFakeTimers();
  const { unmount } = render(<PublishProgress />);

  act(() => vi.advanceTimersByTime(120000));

  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "92",
  );
  expect(screen.getByText(/Estimated progress/)).toBeInTheDocument();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
