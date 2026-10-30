import { screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { describe, expect, it } from "vitest";
import { IDS } from "./fixtures";
import { renderApp } from "./render";

const c = `/contracts/${IDS.contract}`;
const CASES: { route: string; user: "rita" | "larry" | "ada" | null; heading: RegExp }[] = [
  { route: "/login", user: null, heading: /sign in/i },
  { route: "/contracts", user: "rita", heading: /contracts/i },
  { route: c, user: "rita", heading: /./ },
  { route: `${c}/risks`, user: "rita", heading: /risk/i },
  { route: `${c}/redlines`, user: "rita", heading: /redline/i },
  { route: `${c}/approval`, user: "larry", heading: /approval|package/i },
  { route: "/playbook", user: "ada", heading: /playbook/i },
  { route: "/playbook/versions", user: "ada", heading: /versions/i },
  { route: "/eval", user: "ada", heading: /evaluation/i },
];

// Renders through the real route tree, so shell landmarks, the skip link and layouts are audited too.
describe("every screen has no axe violations", () => {
  it.each(CASES)("$route", async ({ route, user, heading }) => {
    const { container } = renderApp(route, user);
    await screen.findAllByRole("heading", { name: heading }, { timeout: 4000 });
    expect(await axe(container)).toHaveNoViolations();
  });
});
