import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { RiskBadge } from "@/features/risk/RiskBadge";
import { IDS } from "./fixtures";
import { renderApp } from "./render";
import { server } from "./server";

const c = `/contracts/${IDS.contract}`;

describe("RiskBadge", () => {
  it.each(["High", "Medium", "Low"] as const)("%s shows an icon and a text label", (level) => {
    const { container } = render(<RiskBadge level={level} />);
    expect(screen.getByText(level)).toBeVisible();
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it("needs-human without a level reads as 'Needs review'", () => {
    render(<RiskBadge level={null} needsHuman />);
    expect(screen.getByText("Needs review")).toBeVisible();
  });
});

describe("redline decisions", () => {
  it("accept is optimistic and rolls back when the server fails", async () => {
    server.use(
      http.post("*/api/v1/redlines/:redline_id/accept", async () => {
        await delay(300);
        return HttpResponse.json({ title: "Boom", status: 500 }, { status: 500 });
      }),
    );
    renderApp(`${c}/redlines`, "rita");
    const accept = await screen.findByRole("button", { name: "Accept change" });
    const before = accept.getAttribute("aria-pressed");
    expect(before).toBe("false");

    await userEvent.click(accept);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Accept change" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Accept change" })).toHaveAttribute(
        "aria-pressed",
        "false",
      ),
    );
  });
});

describe("lawyer approval", () => {
  it("reject requires a comment before confirming", async () => {
    renderApp(`${c}/approval`, "larry");
    const form = (await screen.findByRole("heading", { name: "Decision", level: 2 })).closest(
      "section",
    );
    if (!form) throw new Error("decision section missing");
    await userEvent.click(within(form).getByRole("radio", { name: "Reject" }));
    await userEvent.click(within(form).getByRole("button", { name: "Reject package" }));

    expect(await within(form).findByText("A comment is required to reject.")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reviewers never see the decision form", async () => {
    renderApp(`${c}/approval`, "rita");
    await screen.findAllByRole("heading", { level: 2 });
    expect(screen.queryByRole("button", { name: "Approve package" })).toBeNull();
  });
});
