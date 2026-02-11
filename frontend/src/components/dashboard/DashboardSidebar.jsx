import { Link, NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  Wallet,
  Target,
  TrendingUp,
  Building,
  Receipt,
  PieChart,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

// Minimal navigation for viva-friendly explanation
const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: TrendingUp, label: "Transactions", path: "/dashboard/transactions" },
  { icon: Wallet, label: "Budgets", path: "/dashboard/budgets" },
  { icon: Target, label: "Goals", path: "/dashboard/goals" },
  // { icon: Building, label: "Accounts", path: "/dashboard/accounts" },
  // { icon: Receipt, label: "Upload Bill", path: "/dashboard/upload-bill" },
  { icon: PieChart, label: "Reports", path: "/dashboard/reports" },
  { icon: User, label: "Profile", path: "/dashboard/profile" },
];

export function DashboardSidebar({ collapsed, onToggle }) {
  const location = useLocation();

  const NavItem = ({ icon: Icon, label, path }) => {
    const isActive = location.pathname === path;

    return (
      <NavLink
        to={path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
          isActive
            ? "bg-primary text-primary-foreground shadow-emerald"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}
      >
        <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-primary-foreground")} />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{label}</span>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-40 transition-all duration-300",
        collapsed ? "w-[70px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className={cn("h-16 flex items-center border-b border-sidebar-border px-4", collapsed ? "justify-center" : "justify-between")}>
        {!collapsed && (
          <Link to="/dashboard" reloadDocument className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-emerald flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-sidebar-foreground">WealthWise</span>
          </Link>
        )}
        {collapsed && (
          <Link to="/dashboard" reloadDocument className="w-9 h-9 rounded-xl gradient-emerald flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </Link>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <div className="px-3 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>
      </ScrollArea>

      {/* Footer - Removed duplicate logout, use Profile page logout instead */}

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        type="button"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}