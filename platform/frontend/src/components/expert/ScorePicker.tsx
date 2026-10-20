"use client";

import { useId } from "react";
import { cx } from "@/components/ui";
import { IconAlert } from "@/components/icons";
import type { Criterion, ScoreValue } from "@/lib/api";
import { scaleChoices } from "@/lib/workbench";

/** Radio group for one criterion on one output. Native radios keep arrow-key navigation. */
export function ScorePicker({
  criterion,
  label,
  value,
  onChange,
  error,
  disabled,
  highlight,
}: {
  criterion: Criterion;
  label: string;
  value: ScoreValue | null | undefined;
  onChange: (v: ScoreValue) => void;
  error?: string;
  disabled?: boolean;
  highlight?: boolean;
}) {
  const name = useId();
  const choices = scaleChoices(criterion);
  const selected = choices.find((ch) => ch.value === value);
  const first = choices[0];
  const last = choices[choices.length - 1];
  const showEnds = choices.length > 2 && (first?.anchor || last?.anchor);
  return (
    <fieldset
      className={cx("min-w-0", highlight && "rounded-lg bg-warning-subtle p-2 ring-1 ring-warning-line")}
      aria-invalid={error ? true : undefined}
    >
      <legend className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-fg-muted">
        {label}
        {highlight && (
          <span className="inline-flex items-center gap-1 font-medium text-warning">
            <IconAlert size={12} /> Disagreement
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {choices.map((ch) => {
          const checked = value === ch.value;
          return (
            <label
              key={String(ch.value)}
              title={ch.anchor}
              className={cx(
                "relative flex h-10 min-w-11 cursor-pointer select-none items-center justify-center rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                checked
                  ? "border-primary bg-primary text-on-primary shadow-card"
                  : cx("bg-surface text-fg hover:border-primary hover:bg-primary-subtle", error ? "border-danger" : "border-line-strong"),
                disabled && "cursor-not-allowed opacity-60 hover:border-line-strong hover:bg-surface",
              )}
            >
              <input
                type="radio"
                className="sr-only"
                name={name}
                value={String(ch.value)}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(ch.value)}
              />
              {ch.label}
              {ch.anchor && <span className="sr-only">: {ch.anchor}</span>}
            </label>
          );
        })}
      </div>
      {showEnds && (
        <div className="mt-1 flex justify-between gap-3 text-[11px] leading-tight text-fg-subtle" aria-hidden="true">
          <span className="max-w-[45%] truncate">{first?.anchor}</span>
          <span className="max-w-[45%] truncate text-right">{last?.anchor}</span>
        </div>
      )}
      {selected?.anchor && (
        <p className="mt-1.5 text-xs text-fg-muted" aria-hidden="true">
          <span className="font-semibold text-primary-text">{selected.label}:</span> {selected.anchor}
        </p>
      )}
      {error && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger" role="alert">
          <IconAlert size={13} />
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function AnchorList({ criterion }: { criterion: Criterion }) {
  const entries = Object.entries(criterion.anchors ?? {}).filter(([, t]) => t);
  if (!entries.length) return null;
  return (
    <details className="group mt-1.5">
      <summary className="cursor-pointer text-xs font-medium text-primary-text hover:underline">Scale guide</summary>
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1 rounded-lg bg-surface-sunken p-2.5 text-xs text-fg-muted">
        {entries.map(([k, t]) => (
          <div key={k} className="contents">
            <dt className="font-mono font-semibold text-fg">{k}</dt>
            <dd>{t}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
