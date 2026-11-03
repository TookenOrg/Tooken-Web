import {
  Blocks,
  Building2,
  FileCheck2,
  Heart,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import type { NavSection } from "./app-shell";

export const INVESTOR_NAV: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Investing",
    items: [
      { label: "Marketplace", href: "/explore", icon: Store },
      { label: "My orders", href: "/orders", icon: ReceiptText },
      { label: "Watchlist", href: "/favorites", icon: Heart },
    ],
  },
  {
    title: "Account",
    items: [
      {
        label: "Identity verification",
        href: "/verification",
        icon: ShieldCheck,
        visible: (s) => s.isInvestor,
      },
      { label: "Profile", href: "/profile", icon: UserRound },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Back office",
        href: "/admin",
        icon: Landmark,
        visible: (s) => s.isStaff,
      },
    ],
  },
];

export const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Origination",
    items: [
      { label: "Issuers", href: "/admin/issuers", icon: Landmark },
      { label: "Assets", href: "/admin/assets", icon: Building2 },
    ],
  },
  {
    title: "Distribution",
    items: [{ label: "Orders", href: "/admin/orders", icon: ReceiptText }],
  },
  {
    title: "Compliance",
    items: [
      {
        label: "KYC reviews",
        href: "/admin/compliance",
        icon: FileCheck2,
        visible: (s) => s.isAdmin,
      },
    ],
  },
  {
    title: "Infrastructure",
    items: [
      {
        label: "Blockchain platform",
        href: "/admin/platform",
        icon: Blocks,
        visible: (s) => s.isAdmin,
      },
    ],
  },
  {
    title: "Shortcuts",
    items: [
      { label: "Marketplace", href: "/explore", icon: Store },
      { label: "Profile", href: "/profile", icon: UserRound },
    ],
  },
];
