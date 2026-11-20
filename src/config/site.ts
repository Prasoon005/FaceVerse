import {
  Activity,
  Album,
  DoorOpen,
  LayoutDashboard,
  type LucideIcon,
  Radar,
  ScanFace,
  Settings,
  Target,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";

export const siteConfig = {
  name: "FaceVerse",
  description:
    "Multi-modal identity & recognition platform — face, voice and multi-face recognition that runs on your device.",
  author: { name: "Prasoon Katiyar", github: "https://github.com/Prasoon005" },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Phase in which the page gets its real implementation (shown as a badge until then). */
  comingInPhase?: number;
};

export type NavSection = { title: string; items: NavItem[] };

export const appNav: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Activity", href: "/activity", icon: Activity, comingInPhase: 6 },
    ],
  },
  {
    title: "Recognition",
    items: [
      { title: "Live", href: "/live", icon: Radar },
      { title: "People", href: "/people", icon: Users },
      { title: "Enroll", href: "/enroll", icon: UserPlus },
    ],
  },
  {
    title: "Modules",
    items: [
      { title: "Visitors", href: "/visitors", icon: DoorOpen, comingInPhase: 4 },
      { title: "Albums", href: "/albums", icon: Album, comingInPhase: 5 },
      { title: "Tools", href: "/tools", icon: Wrench, comingInPhase: 7 },
      { title: "Focus", href: "/focus", icon: Target, comingInPhase: 7 },
    ],
  },
  {
    title: "Settings",
    items: [{ title: "Settings", href: "/settings", icon: Settings }],
  },
];

export const brandIcon = ScanFace;

/** Flat lookup used by breadcrumbs and the command palette. */
export const navItems: NavItem[] = appNav.flatMap((section) => section.items);
