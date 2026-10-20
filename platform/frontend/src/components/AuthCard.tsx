import Link from "next/link";
import type { ReactNode } from "react";
import { IconCheckCircle, LogoMark } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

const POINTS = [
  { title: "Vetted domain experts", body: "Doctors, lawyers and engineers score your model outputs against a calibrated rubric." },
  { title: "Measured quality", body: "Gold checks, inter-annotator agreement and reviewer QA on every project." },
  { title: "Audit-ready datasets", body: "Versioned, frozen exports with full provenance for training and evaluation." },
];

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside
        className="relative hidden overflow-hidden px-12 py-12 text-on-primary lg:flex lg:flex-col"
        style={{ background: "linear-gradient(150deg, var(--primary-hover) 0%, var(--primary) 55%, color-mix(in oklab, var(--primary) 70%, var(--accent)) 100%)" }}
      >
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]">
          <defs>
            <pattern id="auth-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-grid)" />
        </svg>
        <Link href="/" className="relative flex items-center gap-3 text-lg font-semibold tracking-tight">
          <span className="rounded-[10px] ring-1 ring-on-primary/30">
            <LogoMark size={34} />
          </span>
          Infollion Evaluate
        </Link>
        <div className="relative mt-auto max-w-lg">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">Expert-verified evaluation and training data for AI</h2>
          <p className="mt-4 text-base leading-relaxed opacity-85">
            Commission rigorous human evaluations of your models, run by credentialed specialists and checked by Infollion quality staff.
          </p>
          <ul className="mt-10 flex flex-col gap-5">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <IconCheckCircle size={20} className="mt-0.5 shrink-0 opacity-90" />
                <div>
                  <p className="font-medium">{p.title}</p>
                  <p className="text-sm leading-relaxed opacity-80">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs opacity-70">Infollion Research Services</p>
      </aside>

      <main className="flex min-w-0 flex-col bg-bg px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-fg lg:invisible">
            <LogoMark size={28} />
            Infollion <span className="font-medium text-fg-muted">Evaluate</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <p className="mb-6 text-sm text-fg-muted lg:hidden">Expert-verified evaluation and training data for AI.</p>
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-fg-muted">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 border-t border-line pt-6 text-sm text-fg-muted">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
