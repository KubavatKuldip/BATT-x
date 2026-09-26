"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bell,
  TrendingUp,
  MapPin,
  Settings,
  Shield,
  LogOut,
  LogIn,
  Users,
  ChevronDown,
  Cpu,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card } from "@/components/ui/card";
import { BattXLogo } from "@/components/ui/battx-logo";
import { LanguageSelector } from "@/components/language-selector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from 'next-intl';

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
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
    { name: t('settings'), href: "/settings", icon: Settings },
  ];

  const adminNavigation = [
    { name: t('adminPanel'), href: "/admin", icon: Users },
  ];

  const showAdmin =
    role === "ADMIN" || role === "SUPER_ADMIN" || role === "FLEET_MANAGER";
  const navigation = showAdmin
    ? [...baseNavigation, ...adminNavigation]
    : baseNavigation;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:z-50">
      <Card level={1} className="flex flex-col flex-1 min-h-0 rounded-none border-r">
        {/* Logo */}
        <div className="flex items-center gap-3 h-16 px-6 border-b border-border">
          <BattXLogo width={40} height={40} priority />
          <div>
            <h1 className="text-lg font-bold">BATT-X</h1>
            <p className="text-xs text-muted-foreground">Battery Safety Monitor</p>
          </div>
        </div>

        {/* Navigation. aria-label distinguishes the two <nav> landmarks
            (sidebar + bottom-nav) so screen-reader users can jump between them. */}
        <nav aria-label="Primary" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-clay-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-clay-xs"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Language</span>
            <LanguageSelector />
          </div>

          {status === "authenticated" && session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Account menu for ${session.user.name || session.user.email}`}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm"
                  aria-hidden="true"
                >
                  {(session.user.name || session.user.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium truncate">
                    {session.user.name || "User"}
                  </p>
                  <p className="text-caption text-muted-foreground truncate">
                    {role || "CONSUMER"}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">{t('settings')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/safety">{t('safety')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                  {tCommon('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/auth/signin"
              className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium">{tCommon('signIn')}</span>
            </Link>
          )}
        </div>
      </Card>
    </aside>
  );
}
