import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Kbd";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Contract viewer",
    items: [
      ["J / K", "Next / previous clause"],
      ["H", "Toggle High-risk only"],
      ["/", "Search the contract (Enter / Shift+Enter next / previous hit, Esc clear)"],
    ],
  },
  {
    title: "Redline editor",
    items: [
      ["J / K", "Next / previous redline"],
      ["A", "Accept change"],
      ["R", "Reject change"],
      ["E", "Edit change"],
      ["Ctrl/⌘ + Enter", "Save edit or post comment"],
      ["Esc", "Cancel edit"],
    ],
  },
  { title: "Anywhere", items: [["?", "Show this list"]] },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Single-key shortcuts work when focus is not in a text field. Turn them off in Settings. Browser find (Ctrl+F) cannot see off-screen contract text; use / instead."
    >
      {GROUPS.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h3 className="mb-2 text-sm font-semibold">{g.title}</h3>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {g.items.map(([k, v]) => (
              <div key={k + v} className="contents">
                <dt>
                  <Kbd>{k}</Kbd>
                </dt>
                <dd className="text-fg-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Dialog>
  );
}
