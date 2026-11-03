import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { KycVerification } from "@/lib/api/types";
import UsersPage from "./page";

vi.mock("@/lib/auth/session-context", () => ({
  useSession: () => ({ user: { id: 99 } }),
}));

const { filings } = vi.hoisted(() => ({ filings: [] as KycVerification[] }));

vi.mock("@/lib/api/hooks", () => ({
  useKycList: () => ({ data: filings }),
  useUpdateUserRole: () => ({ reset: vi.fn() }),
}));

it("displays actual account roles in the directory instead of Unchanged", () => {
  filings.splice(
    0,
    filings.length,
    ...(["USER", "MANAGER", "ADMIN", undefined] as const).map((role, i) => ({
      id: i + 1,
      user_id: i + 1,
      user_role: role,
      declared_full_name: `Account ${i + 1}`,
      declared_country_code: "LU",
      email: `account${i + 1}@example.test`,
      status: "approved",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    })),
  );
  render(<UsersPage />);

  for (const [i, label] of [
    "Investor",
    "Manager",
    "Administrator",
    "Unavailable",
  ].entries()) {
    const row = screen.getByText(`Account ${i + 1}`).closest("tr");
    expect(row).not.toBeNull();
    expect(
      within(row as HTMLTableRowElement).getByText(label),
    ).toBeInTheDocument();
  }
  expect(screen.queryByText("Unchanged")).not.toBeInTheDocument();
});
