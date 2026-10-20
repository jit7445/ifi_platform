import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };
}

/** Original product mark: an evaluation check inside a rounded diamond of four facets. */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false" className={className}>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="var(--primary)" />
      <path d="M16 6.5 25.5 16 16 25.5 6.5 16Z" fill="none" stroke="var(--on-primary)" strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="m11 16.2 3.4 3.4 6.8-7.2" fill="none" stroke="var(--on-primary)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="25.5" cy="16" r="2.2" fill="var(--accent)" />
    </svg>
  );
}

export const IconFolder = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4.4l2 2.2h8.6A1.5 1.5 0 0 1 21 9.7v8.8a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z" />
  </svg>
);
export const IconChart = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />
  </svg>
);
export const IconScroll = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM9 9h6M9 13h6M9 17h3" />
  </svg>
);
export const IconQueue = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 12h16M4 18h10" />
    <circle cx="19" cy="18" r="1.5" />
  </svg>
);
export const IconUsers = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8.5" r="3.5" />
    <path d="M2.5 20c.6-3.4 3.3-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 5.2a3.5 3.5 0 0 1 0 6.6M18.5 14.8c1.6.8 2.7 2.6 3 5.2" />
  </svg>
);
export const IconCheckBadge = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 14.4 4.6 17.3 4.5 18.2 7.3 20.5 9 19.6 11.8 20.5 14.6 18.2 16.3 17.3 19.1 14.4 19 12 20.6 9.6 19 6.7 19.1 5.8 16.3 3.5 14.6 4.4 11.8 3.5 9 5.8 7.3 6.7 4.5 9.6 4.6Z" />
    <path d="m8.8 12 2.2 2.2 4.2-4.4" />
  </svg>
);
export const IconScale = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4v16M7 20h10M5 7h14M5 7l-2.5 6a3 3 0 0 0 5 0ZM19 7l-2.5 6a3 3 0 0 0 5 0Z" />
  </svg>
);
export const IconBriefcase = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" />
  </svg>
);
export const IconUser = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20.5c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5" />
  </svg>
);
export const IconLock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </svg>
);
export const IconMenu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);
export const IconX = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconSun = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </svg>
);
export const IconMoon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
);
export const IconMonitor = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);
export const IconChevronDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconChevronLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);
export const IconArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconCheckCircle = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
  </svg>
);
export const IconAlert = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0ZM12 9.5v4M12 17h.01" />
  </svg>
);
export const IconInfo = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const IconXCircle = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </svg>
);
export const IconInbox = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 13.5 5.6 5.4A2 2 0 0 1 7.5 4h9a2 2 0 0 1 1.9 1.4L21 13.5V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5" />
  </svg>
);
export const IconClock = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconCloudCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 18.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 9.6a4.5 4.5 0 0 1-.5 8.9Z" />
    <path d="m9.5 13.5 2 2 3.5-3.7" />
  </svg>
);
export const IconLogout = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M9 16l-4-4 4-4M5 12h11" />
  </svg>
);
export const IconPlay = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 5.5v13l11-6.5Z" />
  </svg>
);
export const IconSparkle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
  </svg>
);
export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconTarget = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);
export const IconRefresh = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 11a8 8 0 0 0-14.7-4.3M4 4v4h4M4 13a8 8 0 0 0 14.7 4.3M20 20v-4h-4" />
  </svg>
);
