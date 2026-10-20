"use client";

import { useEffect, useSyncExternalStore } from "react";
import { applyThemePreference, readThemePreference, type ThemePreference } from "@/lib/theme";
import { IconMonitor, IconMoon, IconSun } from "./icons";
import { cx } from "./ui";

const EVENT = "ifl-theme-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const OPTIONS: { id: ThemePreference; label: string; Icon: typeof IconSun }[] = [
  { id: "light", label: "Light theme", Icon: IconSun },
  { id: "dark", label: "Dark theme", Icon: IconMoon },
  { id: "system", label: "Match system theme", Icon: IconMonitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const pref = useSyncExternalStore(subscribe, readThemePreference, () => "system" as ThemePreference);

  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemePreference("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  return (
    <div role="radiogroup" aria-label="Colour theme" className={cx("inline-flex items-center rounded-lg border border-line bg-surface-sunken p-0.5", className)}>
      {OPTIONS.map(({ id, label, Icon }) => {
        const on = pref === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            onClick={() => {
              applyThemePreference(id);
              window.dispatchEvent(new Event(EVENT));
            }}
            className={cx(
              "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              on ? "bg-surface text-fg shadow-card" : "text-fg-subtle hover:text-fg",
            )}
          >
            <Icon size={15} />
          </button>
        );
      })}
    </div>
  );
}
