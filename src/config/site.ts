import {
  Activity,
  Album,
  BarChart3,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  DoorOpen,
  Fingerprint,
  History,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  MessageSquareText,
  MonitorSmartphone,
  Radar,
  RefreshCcwDot,
  ScanFace,
  Settings,
  ShieldCheck,
  Target,
  UserCog,
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

/** The two portals: regular users and the separate admin console. */
export type Portal = "user" | "admin";

export const userNav: NavSection[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Attendance", href: "/attendance", icon: CalendarCheck },
      { title: "Leave", href: "/leave", icon: CalendarRange },
      { title: "Announcements", href: "/announcements", icon: Megaphone },
    ],
  },
  {
    title: "Identity",
    items: [{ title: "My identity", href: "/identity", icon: Fingerprint }],
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
      { title: "Activity", href: "/activity", icon: Activity, comingInPhase: 6 },
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

export const adminNav: NavSection[] = [
  {
    title: "Console",
    items: [
      { title: "Admin dashboard", href: "/admin", icon: ShieldCheck },
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { title: "Kiosk mode", href: "/admin/kiosk", icon: MonitorSmartphone },
    ],
  },
  {
    title: "People",
    items: [
      { title: "Users", href: "/admin/users", icon: UserCog },
      { title: "Approvals", href: "/admin/approvals", icon: ClipboardCheck },
      { title: "Change requests", href: "/admin/change-requests", icon: RefreshCcwDot },
    ],
  },
  {
    title: "Attendance",
    items: [
      { title: "Attendance report", href: "/admin/attendance", icon: CalendarCheck },
      { title: "Absence reviews", href: "/admin/reviews", icon: MessageSquareText },
      { title: "Leave requests", href: "/admin/leaves", icon: CalendarRange },
    ],
  },
  {
    title: "Workspace",
    items: [
      { title: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { title: "Audit log", href: "/admin/audit", icon: History },
      { title: "Workspace settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

/** Navigation for a portal. */
export function navFor(portal: Portal): NavSection[] {
  return portal === "admin" ? adminNav : userNav;
}

/** Where each portal starts. */
export const portalHome: Record<Portal, string> = { user: "/dashboard", admin: "/admin" };

export const brandIcon = ScanFace;

/** Flat lookup used by breadcrumbs and the command palette. */
export const navItems: NavItem[] = [...userNav, ...adminNav].flatMap((section) => section.items);
