import { CalendarDays, CreditCard, UserRound, Users } from "lucide-react";
import { Link, useLocation } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "~/components/ui/sidebar";
import { LogOut } from "lucide-react";

const navItems = [
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Users", href: "/users", icon: Users, disabled: true },
  { label: "Customers", href: "/customers", icon: UserRound, disabled: true },
  { label: "Transactions", href: "/transactions", icon: CreditCard, disabled: true },
];

export default function AppSidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      className="[&_[data-slot=sidebar-inner]]:overflow-hidden [&_[data-slot=sidebar-inner]]:rounded-xl [&_[data-slot=sidebar-inner]]:border [&_[data-slot=sidebar-inner]]:border-white/10 [&_[data-slot=sidebar-inner]]:shadow-sm"
    >
      <SidebarHeader className="px-3 py-2" />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href !== "#" &&
                  (pathname === item.href || pathname.startsWith(`${item.href}/`));

                return (
                  <SidebarMenuItem key={item.label}>
                    {item.disabled ? (
                      <SidebarMenuButton
                        disabled
                        tooltip={`${item.label} (soon)`}
                        className="cursor-not-allowed opacity-60"
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    ) : (
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.label}
                      >
                        <Link to={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              className="text-white/80 hover:text-white"
            >
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
