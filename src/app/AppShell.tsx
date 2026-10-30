import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  FileText,
  FlaskConical,
  Keyboard,
  Menu,
  Moon,
  Rows3,
  Scale,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { devTokenProvider } from "@/auth/auth";
import { useMe } from "@/auth/useMe";
import { useSession } from "@/auth/useSession";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useRouteFocus } from "@/hooks/useRouteFocus";
import { cn } from "@/lib/cn";
import { useAnnouncer } from "@/stores/announcer";
import { useUiStore } from "@/stores/ui";
import { SettingsDialog } from "./SettingsDialog";
import { ShortcutsDialog } from "./ShortcutsDialog";

export const DISCLAIMER = "This tool assists legal review and does not constitute legal advice.";

const NAV = [
  { to: "/contracts", label: "Contracts", icon: FileText },
  { to: "/playbook", label: "Playbook", icon: BookOpen },
  { to: "/eval", label: "Evaluation", icon: FlaskConical },
];

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex h-control items-center gap-2 rounded-md px-3 text-base text-fg-muted hover:bg-sunken hover:text-fg",
    isActive && "bg-sunken font-medium text-fg",
  );

export function AppShell() {
  const s = useSession();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { theme, setTheme, density, setDensity } = useUiStore();
  const message = useAnnouncer((a) => a.message);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useRouteFocus();
  useHotkeys({ "?": () => setShortcutsOpen(true) });

  const signOut = () => {
    devTokenProvider.signOut(qc);
    navigate("/login");
  };

  const nav = (
    <ul className="flex flex-col gap-1 md:flex-row">
      {NAV.map(({ to, label, icon: Icon }) => (
        <li key={to}>
          <NavLink to={to} className={navClass} onClick={() => setMenuOpen(false)}>
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-fg">
      <a
        href="#main"
        className="sr-only z-toast rounded-md bg-surface px-3 py-2 text-fg shadow-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to main content
      </a>
      <header
        data-print-hide
        className="sticky top-0 z-sticky h-12 border-b border-border bg-surface"
      >
        <div className="mx-auto flex h-full max-w-screen-2xl items-center gap-3 px-3 md:px-6">
          <NavLink
            to="/contracts"
            className="inline-flex items-center gap-2 text-md font-semibold text-fg"
          >
            <Scale aria-hidden="true" className="size-4 text-primary" />
            Risk Reviewer
          </NavLink>
          {import.meta.env.VITE_AUTH_MODE !== "oidc" ? (
            <span className="hidden rounded-sm border border-border-strong px-1.5 text-xs text-fg-muted sm:inline">
              Dev mode
            </span>
          ) : null}
          {s ? (
            <nav aria-label="Primary" className="ml-4 hidden md:block">
              {nav}
            </nav>
          ) : null}
          <div className="ml-auto flex items-center gap-1">
            <IconButton
              icon={theme === "dark" ? Sun : Moon}
              label={theme === "dark" ? "Use light theme" : "Use dark theme"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            />
            <IconButton
              icon={Rows3}
              label={density === "compact" ? "Use comfortable density" : "Use compact density"}
              onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
              className="hidden sm:inline-flex"
            />
            <IconButton
              icon={Keyboard}
              label="Keyboard shortcuts"
              shortcut="?"
              onClick={() => setShortcutsOpen(true)}
            />
            <IconButton icon={Settings} label="Settings" onClick={() => setSettingsOpen(true)} />
            {s && me.data ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-control items-center gap-2 rounded-md px-2 text-base text-fg hover:bg-sunken"
                  >
                    <UserRound aria-hidden="true" className="size-4" />
                    <span className="hidden sm:inline">{me.data.name}</span>
                    <span className="sr-only sm:hidden">Account: {me.data.name}</span>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    className="z-dropdown min-w-48 rounded-lg border border-border bg-raised p-1 text-fg shadow-2"
                  >
                    <DropdownMenu.Label className="px-2 py-1.5 text-sm">
                      <span className="block font-medium">{me.data.name}</span>
                      <span className="text-fg-muted">Roles: {me.data.roles.join(", ")}</span>
                    </DropdownMenu.Label>
                    <DropdownMenu.Separator className="my-1 h-px bg-border" />
                    <DropdownMenu.Item
                      onSelect={signOut}
                      className="cursor-pointer rounded-md px-2 py-1.5 text-base outline-none data-[highlighted]:bg-sunken"
                    >
                      Sign out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : null}
            {s ? (
              <Dialog
                open={menuOpen}
                onOpenChange={setMenuOpen}
                title="Menu"
                trigger={
                  <button
                    type="button"
                    aria-label="Open menu"
                    className="inline-flex h-control w-control items-center justify-center rounded-md hover:bg-sunken md:hidden"
                  >
                    <Menu aria-hidden="true" className="size-5" />
                  </button>
                }
              >
                <nav aria-label="Primary (mobile)">{nav}</nav>
              </Dialog>
            ) : null}
          </div>
        </div>
      </header>
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-screen-2xl min-w-0 flex-1 flex-col px-3 py-4 outline-none md:px-6 md:py-6"
      >
        <Outlet />
      </main>
      <footer className="border-t border-border bg-surface px-3 py-3 text-xs text-fg-muted md:px-6">
        {DISCLAIMER}
      </footer>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </div>
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
