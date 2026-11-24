import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PublishProgress } from "./publish-progress";

afterEach(() => {
  vi.useRealTimers();
});

it("reports a pending synchronous request without invented progress", () => {
  vi.useFakeTimers();
  render(<PublishProgress />);

  expect(screen.getByRole("status")).toHaveTextContent(
    "Publication request in progress",
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "Publication is not confirmed until the server responds",
  );
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

  act(() => vi.advanceTimersByTime(60000));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Publication request in progress",
  );
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});

it("does not declare completion when the request takes longer than a minute", () => {
  vi.useFakeTimers();
  const { unmount } = render(<PublishProgress />);

  act(() => vi.advanceTimersByTime(120000));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Publication is not confirmed until the server responds",
  );
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
