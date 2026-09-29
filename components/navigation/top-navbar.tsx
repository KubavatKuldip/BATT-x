"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Settings, LogOut, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BattXLogo } from "@/components/ui/battx-logo";
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Bell,
  TrendingUp,
  MapPin,
  Shield,
  Cpu,
  Users
} from "lucide-react";

export function TopNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const role = (session?.user as any)?.role;

  const baseNavigation = [
    { name: t('dashboard'), href: "/dashboard", icon: LayoutDashboard },
    { name: t('alerts'), href: "/alerts", icon: Bell },
    { name: t('analytics'), href: "/analytics", icon: TrendingUp },
    { name: t('location'), href: "/location", icon: MapPin },
    { name: t('safety'), href: "/safety", icon: Shield },
    { name: t('devices'), href: "/devices/pairing", icon: Cpu },
  ];

  const showAdmin =
    role === "ADMIN" || role === "SUPER_ADMIN" || role === "FLEET_MANAGER";

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-sm"
      style={{
        background: 'color-mix(in srgb, hsl(var(--bg)) 92%, transparent)',
        borderBottom: '1px solid hsl(var(--rule))',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
            <BattXLogo width={36} height={36} priority />
            <span className="text-lg font-bold tracking-tight hidden sm:inline">
              BATT<span style={{ color: 'hsl(var(--accent))' }}>-X</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1 flex-1 px-8">
            {baseNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {showAdmin && (
              <Link
                href="/admin"
                aria-current={pathname === "/admin" ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  pathname === "/admin"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                <span>{t('adminPanel')}</span>
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Theme toggle - desktop only */}
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* User menu */}
            {session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm"
                    aria-hidden="true"
                  >
                    {(session.user.name || session.user.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <span className="hidden md:inline text-sm font-medium">
                    {session.user.name || "User"}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:inline" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm font-medium truncate">
                      {session.user.name || session.user.email}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {role || 'CONSUMER'}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings className="h-4 w-4 mr-2" />
                      {t('settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {tCommon('signOut') || 'Sign Out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
