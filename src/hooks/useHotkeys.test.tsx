import { fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUiStore } from "@/stores/ui";
import { isEditableTarget, useHotkeys } from "./useHotkeys";

function Harness({ onJ }: { onJ: () => void }) {
  useHotkeys({ j: onJ });
  return (
    <div>
      <label>
        Search <input />
      </label>
      <label>
        Note <textarea />
      </label>
      <button type="button">Go</button>
    </div>
  );
}

describe("useHotkeys", () => {
  afterEach(() => useUiStore.getState().setShortcutsEnabled(true));

  it("fires outside editable fields", () => {
    const onJ = vi.fn();
    const { getByRole } = render(<Harness onJ={onJ} />);
    fireEvent.keyDown(getByRole("button"), { key: "j" });
    expect(onJ).toHaveBeenCalledTimes(1);
  });

  it("is suppressed in inputs/textareas and with modifiers", () => {
    const onJ = vi.fn();
    const { getByLabelText, getByRole } = render(<Harness onJ={onJ} />);
    fireEvent.keyDown(getByLabelText("Search"), { key: "j" });
    fireEvent.keyDown(getByLabelText("Note"), { key: "j" });
    fireEvent.keyDown(getByRole("button"), { key: "j", ctrlKey: true });
    expect(onJ).not.toHaveBeenCalled();
  });

  it("is disabled by the Settings toggle (WCAG 2.1.4)", () => {
    useUiStore.getState().setShortcutsEnabled(false);
    const onJ = vi.fn();
    const { getByRole } = render(<Harness onJ={onJ} />);
    fireEvent.keyDown(getByRole("button"), { key: "j" });
    expect(onJ).not.toHaveBeenCalled();
  });

  it("isEditableTarget recognizes editable elements", () => {
    const div = document.createElement("div");
    div.setAttribute("role", "textbox");
    expect(isEditableTarget(div)).toBe(true);
    const cb = document.createElement("input");
    cb.type = "checkbox";
    expect(isEditableTarget(cb)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
