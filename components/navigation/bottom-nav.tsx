"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bell,
  TrendingUp,
  MapPin,
  Settings,
  Shield,
  Cpu
} from "lucide-react";
import { useTranslations } from 'next-intl';

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  const navigation = [
    { name: t('dashboard'), href: "/dashboard", icon: LayoutDashboard },
    { name: t('devices'), href: "/devices", icon: Cpu },
    { name: t('alerts'), href: "/alerts", icon: Bell },
    { name: t('analytics'), href: "/analytics", icon: TrendingUp },
    { name: t('location'), href: "/location", icon: MapPin },
    { name: t('safety'), href: "/safety", icon: Shield },
  ];

  return (
    <nav
      aria-label="Primary, mobile"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-clay-lg"
    >
      <div className="grid grid-cols-6 h-16">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                aria-hidden="true"
                className={cn(
                  "h-5 w-5",
                  isActive && "drop-shadow-[0_0_8px_hsl(var(--primary))]"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
