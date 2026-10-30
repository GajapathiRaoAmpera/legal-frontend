import { Dialog } from "@/components/ui/Dialog";
import { useUiStore } from "@/stores/ui";

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { shortcutsEnabled, setShortcutsEnabled, density, setDensity } = useUiStore();
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Settings">
      <div className="flex flex-col gap-4 text-base">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={shortcutsEnabled}
            onChange={(e) => setShortcutsEnabled(e.target.checked)}
          />
          Enable single-key keyboard shortcuts (J, K, H, /, A, R, E)
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={density === "compact"}
            onChange={(e) => setDensity(e.target.checked ? "compact" : "comfortable")}
          />
          Compact density
        </label>
      </div>
    </Dialog>
  );
}
