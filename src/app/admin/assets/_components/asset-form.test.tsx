import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { AssetForm } from "./asset-form";
import { emptyAssetValues } from "./asset-payload";

const state = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: state.push }),
}));
vi.mock("@/lib/api/hooks", () => ({
  useIssuers: () => ({
    data: [{ id: 1, name: "Issuer", legal_form: "SA", status: "active" }],
    isLoading: false,
    isSuccess: true,
    isError: false,
    refetch: vi.fn(),
  }),
}));

function validDraft() {
  const values = emptyAssetValues();
  values.title = "Example asset";
  values.estate_type_id = "1";
  values.issuer_id = "1";
  values.address.street = "1 High Street";
  values.address.postal_code = "1234";
  values.address.city = "Luxembourg";
  return values;
}

beforeEach(() => {
  state.push.mockReset();
  window.history.replaceState({}, "", "/admin/assets/new");
});

it("summarizes validation errors, associates them and focuses linked fields", async () => {
  const user = userEvent.setup();
  render(
    <AssetForm
      mode="create"
      defaultValues={emptyAssetValues()}
      onSubmit={vi.fn()}
      cancelHref="/admin/assets"
    />,
  );
  await user.click(screen.getByRole("button", { name: "Create draft" }));
  const summaryLink = await screen.findByRole("link", {
    name: /Postal code: Enter the postal code/,
  });
  const name = screen.getByLabelText(/Asset name/);
  expect(name).toHaveAttribute("aria-describedby", "title-error");
  await waitFor(() => expect(name).toHaveFocus());
  await user.click(summaryLink);
  await waitFor(() =>
    expect(screen.getByLabelText(/Postal code/)).toHaveFocus(),
  );
  await user.click(screen.getByRole("link", { name: /Issuer: Select/ }));
  await waitFor(() =>
    expect(screen.getByRole("combobox", { name: /Issuer/ })).toHaveFocus(),
  );
});

it("opens advanced fields and focuses their validation error", async () => {
  const user = userEvent.setup();
  const values = validDraft();
  Object.assign(values.configuration, {
    total_shares: "100",
    price_per_share: "10",
    currency_code: "EUR",
    payment_frequency: "4",
    payment_frequency_type_id: "5",
    entry_fee_rate: "101",
  });
  const submit = vi.fn();
  render(
    <AssetForm
      mode="create"
      defaultValues={values}
      onSubmit={submit}
      cancelHref="/admin/assets"
    />,
  );
  await user.click(screen.getByRole("button", { name: "Create draft" }));
  const fee = screen.getByLabelText("Entry fee");
  await waitFor(() => expect(fee.closest("details")).toHaveAttribute("open"));
  await waitFor(() => expect(fee).toHaveFocus());
  expect(fee).toHaveAttribute(
    "aria-describedby",
    "configuration-entry_fee_rate-error",
  );
  expect(submit).not.toHaveBeenCalled();
});

it("warns only for actual changes and allows leaving after reverting", async () => {
  const user = userEvent.setup();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  render(
    <AssetForm
      mode="edit"
      defaultValues={validDraft()}
      onSubmit={vi.fn()}
      cancelHref="/admin/assets"
    />,
  );
  const description = screen.getByLabelText("Description");
  await user.type(description, "Changed");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  await user.click(screen.getByRole("link", { name: "Cancel" }));
  expect(confirm).toHaveBeenCalledOnce();
  expect(state.push).not.toHaveBeenCalled();

  await user.clear(description);
  const cleanUnload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(cleanUnload);
  expect(cleanUnload.defaultPrevented).toBe(false);
  await user.click(screen.getByRole("link", { name: "Cancel" }));
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/admin/assets"));
  expect(confirm).toHaveBeenCalledOnce();
  confirm.mockRestore();
});

it("protects browser back and does not prompt after a successful save", async () => {
  const user = userEvent.setup();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const submit = vi.fn().mockResolvedValue("/admin/assets/99");
  render(
    <AssetForm
      mode="create"
      defaultValues={validDraft()}
      onSubmit={submit}
      cancelHref="/admin/assets"
    />,
  );
  await user.type(screen.getByLabelText("Description"), "Changed");
  window.history.back();
  await waitFor(() => expect(confirm).toHaveBeenCalledOnce());
  expect(window.location.pathname).toBe("/admin/assets/new");
  expect(screen.getByLabelText("Description")).toHaveValue("Changed");

  await user.click(screen.getByRole("button", { name: "Create draft" }));
  await waitFor(() =>
    expect(state.push).toHaveBeenCalledWith("/admin/assets/99"),
  );
  expect(confirm).toHaveBeenCalledOnce();
  confirm.mockRestore();
});

it("does not silently discard a URL that has not been added", async () => {
  const user = userEvent.setup();
  const submit = vi.fn();
  render(
    <AssetForm
      mode="create"
      defaultValues={validDraft()}
      onSubmit={submit}
      cancelHref="/admin/assets"
    />,
  );
  await user.click(screen.getByText("Add an image by URL"));
  await user.type(
    screen.getByLabelText("Public image URL"),
    "https://example.test/a.jpg",
  );
  await user.click(screen.getByRole("button", { name: "Create draft" }));
  expect(
    await screen.findAllByText(/Add this image or clear the URL/),
  ).not.toHaveLength(0);
  await waitFor(() =>
    expect(screen.getByLabelText("Public image URL")).toHaveFocus(),
  );
  expect(submit).not.toHaveBeenCalled();
});

it("keeps locked fields readable while leaving price editable", () => {
  const values = validDraft();
  values.configuration.total_shares = "100";
  values.configuration.price_per_share = "10";
  values.configuration.max_shares_per_investor = "5";
  render(
    <AssetForm
      mode="edit"
      defaultValues={values}
      locks={{
        title: "Fixed by the token.",
        "configuration.total_shares": "Fixed share count.",
        "configuration.max_shares_per_investor": "Fixed cap.",
      }}
      onSubmit={vi.fn()}
      cancelHref="/admin/assets"
    />,
  );
  expect(screen.getByLabelText(/Asset name/)).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Total shares")).toHaveAttribute("readonly");
  expect(screen.getByLabelText("Max. shares per investor")).toHaveAttribute(
    "readonly",
  );
  expect(screen.getByLabelText("Price per share")).not.toHaveAttribute(
    "readonly",
  );
  expect(
    screen.getByRole("region", { name: "Asset form fields" }),
  ).not.toContainElement(screen.getByRole("button", { name: "Save changes" }));
  fireEvent.focus(screen.getByLabelText("Total shares"));
  expect(screen.getByLabelText("Total shares")).toHaveAttribute(
    "aria-describedby",
    "configuration-total_shares-hint",
  );
});
