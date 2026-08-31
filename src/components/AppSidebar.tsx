import { useRouterState } from "@tanstack/react-router";
import { SafeLink } from "@/components/SafeLink";
import { CompanyLogo } from "@/components/CompanyLogo";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Upload,
  Settings,
  Truck,
  Layers,
  ClipboardList,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

type NavItem = { title: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Masters",
    items: [
      { title: "Customers", href: "/customers", icon: Users },
      { title: "Stock Groups", href: "/stock-groups", icon: Layers },
      { title: "Products", href: "/products", icon: Package },
      { title: "Transporters", href: "/transport-master", icon: Truck },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Voucher Register", href: "/delivery-challans", icon: FileText },
      {
        title: "Pending Register",
        href: "/material-movement/pending-register",
        icon: ClipboardList,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Stock with Party", href: "/reports/stock-with-party", icon: BarChart3 },
      { title: "Logistics Summary", href: "/insights/logistics-summary", icon: Truck },
    ],
  },
  {
    label: "System",
    items: [{ title: "Settings", href: "/settings", icon: Settings }],
  },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: settings } = useCompanySettings();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="no-print w-[17rem] shrink-0 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen sticky top-0 h-screen">
      <div className="h-20 flex items-center gap-3 px-6 border-b border-sidebar-border">
        <CompanyLogo
          src={settings?.companyLogo ?? null}
          className="size-10 rounded-xl"
          fallbackClassName="size-10 rounded-xl"
          iconSize={19}
        />
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold tracking-tight text-sidebar-accent-foreground">
            {settings?.companyName || "VLJ"}
          </p>
          <p className="text-[11px] tracking-[0.14em] uppercase text-sidebar-muted">
            Delivery Desk
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-eyebrow text-sidebar-muted">{group.label}</p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <SafeLink
                  key={item.href}
                  to={item.href}
                  className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <Icon
                    size={17}
                    className={
                      active
                        ? "text-sidebar-primary"
                        : "text-sidebar-muted group-hover:text-sidebar-primary"
                    }
                  />
                  <span className="truncate">{item.title}</span>
                </SafeLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <div className="flex items-center gap-3">
          <CompanyLogo
            src={settings?.companyLogo ?? null}
            className="size-9 rounded-full"
            fallbackClassName="size-9 rounded-full"
            iconSize={16}
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {settings?.companyName || "VLJ Jewellers"}
            </p>
            <p className="text-[11px] text-sidebar-muted">Version 1.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
