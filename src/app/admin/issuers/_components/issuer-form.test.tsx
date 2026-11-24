import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { IssuerForm, issuerToFormValues } from "./issuer-form";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});

afterAll(() => vi.unstubAllGlobals());

it("requires registration for Active but accepts a draft and a free legal form", async () => {
  const user = userEvent.setup();
  const submit = vi.fn();
  render(
    <IssuerForm
      mode="create"
      defaultValues={issuerToFormValues()}
      onSubmit={submit}
    />,
  );
  await user.type(screen.getByLabelText(/Legal name/), "Example vehicle");
  await user.type(screen.getByLabelText(/Legal form/), "GmbH & Co. KG");
  await user.click(screen.getByRole("button", { name: "Create issuer" }));
  expect(
    await screen.findAllByText("Required for an active issuer"),
  ).not.toHaveLength(0);
  expect(submit).not.toHaveBeenCalled();

  await user.click(screen.getByRole("radio", { name: /Draft/ }));
  await user.click(screen.getByRole("button", { name: "Create issuer" }));
  await waitFor(() =>
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({
        legal_form: "GmbH & Co. KG",
        registration_number: "",
        status_id: "1",
      }),
      expect.anything(),
    ),
  );
});

it("changes jurisdiction help without erasing the registration number", async () => {
  const user = userEvent.setup();
  render(
    <IssuerForm
      mode="create"
      defaultValues={issuerToFormValues()}
      onSubmit={vi.fn()}
    />,
  );
  const registration = screen.getByRole("textbox", {
    name: /Registration number/,
  });
  await user.type(registration, "B123456");
  fireEvent.keyDown(screen.getByRole("combobox", { name: /Jurisdiction/ }), {
    key: "ArrowDown",
  });
  fireEvent.click(await screen.findByRole("option", { name: "France" }));
  expect(registration).toHaveValue("B123456");
  expect(
    screen.getByText(/Registration number in the selected jurisdiction/),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/RCS number in Luxembourg/),
  ).not.toBeInTheDocument();
});

it("keeps a legacy active issuer without a registration number editable", async () => {
  const user = userEvent.setup();
  const submit = vi.fn();
  render(
    <IssuerForm
      mode="edit"
      defaultValues={issuerToFormValues({
        id: 1,
        name: "Legacy vehicle",
        legal_form: "SA",
        country_code: "LU",
        status_id: 2,
        status: "active",
      })}
      onSubmit={submit}
    />,
  );
  await user.type(screen.getByLabelText(/Legal name/), " updated");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(submit).toHaveBeenCalled());
});
