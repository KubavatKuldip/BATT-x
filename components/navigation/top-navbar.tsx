"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const role = (session?.user as any)?.role;

  // Check if in demo mode
  const isDemoMode = searchParams.get('demo') === 'true';

  const baseNavigation = [
    { name: t('dashboard'), href: "/dashboard", icon: LayoutDashboard },
    { name: t('devices'), href: "/devices", icon: Cpu },
    { name: t('alerts'), href: "/alerts", icon: Bell },
    { name: t('analytics'), href: "/analytics", icon: TrendingUp },
    { name: t('location'), href: "/location", icon: MapPin },
    { name: t('safety'), href: "/safety", icon: Shield },
  ];

  const showAdmin =
    role === "ADMIN" || role === "SUPER_ADMIN" || role === "FLEET_MANAGER";

  // Add demo parameter to all links if in demo mode
  const addDemoParam = (href: string) => {
    return isDemoMode ? `${href}?demo=true` : href;
  };

  // Handle demo logout
  const handleDemoLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('battx_demo_mode');
      window.location.href = '/auth/signin';
    }
  };

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-sm"
      style={{
        background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
        borderBottom: '1px solid var(--line-2)',
      }}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href={addDemoParam("/dashboard")} className="flex items-center gap-3 shrink-0 transition-opacity hover:opacity-80">
            <BattXLogo width={36} height={36} priority />
            <span className="text-lg font-bold tracking-tight hidden sm:inline" style={{ fontFamily: 'var(--font-display)', letterSpacing: '-.03em' }}>
              BATT<span style={{ color: 'var(--ember)' }}>-x</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1 flex-1 px-8">
            {baseNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={addDemoParam(item.href)}
                  aria-current={isActive ? "page" : undefined}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={isActive ? {
                    background: '#FF5A1F',
                    color: '#fff',
                    boxShadow: '0 2px 10px rgba(255,90,31,.28)'
                  } : {
                    color: 'hsl(var(--ink-2))',
                    background: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'hsl(var(--bg-3))';
                      e.currentTarget.style.color = 'hsl(var(--ink))';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'hsl(var(--ink-2))';
                    }
                  }}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {showAdmin && (
              <Link
                href={addDemoParam("/admin")}
                aria-current={pathname === "/admin" ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  pathname === "/admin"
                    ? "shadow-sm"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                style={pathname === "/admin" ? {
                  background: 'var(--ember)',
                  color: '#fff'
                } : {
                  color: 'hsl(var(--ink-2))'
                }}
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                <span>{t('adminPanel')}</span>
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Demo mode indicator + logout */}
            {isDemoMode && (
              <>
                <span
                  className="pill pill--ember hidden md:inline-flex"
                  style={{
                    background: '#FFEDE5',
                    color: '#E0450C',
                    border: 'none'
                  }}
                >
                  <span className="dot dot--pulse"></span> Demo Mode
                </span>
                <button
                  onClick={handleDemoLogout}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '.55rem',
                    padding: '.5rem .9rem',
                    borderRadius: '999px',
                    fontSize: '.82rem',
                    fontWeight: '550',
                    border: '1px solid #E2DACF',
                    color: '#15161A',
                    background: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all .22s cubic-bezier(.22,.75,.28,1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#FF5A1F';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E2DACF';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Exit Demo</span>
                </button>
              </>
            )}

            {/* Theme toggle - desktop only */}
            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            {/* User menu - only for real authenticated users */}
            {session?.user && !isDemoMode ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm"
                    style={{
                      background: 'var(--ember-soft)',
                      color: 'var(--ember)'
                    }}
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

      <style jsx>{`
        .pill {
          display: inline-flex;
          align-items: center;
          gap: .42rem;
          padding: .26rem .68rem;
          border-radius: 999px;
          font-family: var(--font-mono);
          font-size: .67rem;
          font-weight: 600;
          letter-spacing: .07em;
          text-transform: uppercase;
        }

        .pill--ember {
          background: var(--ember-soft);
          color: var(--ember-2);
          border: none;
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }

        .dot--pulse {
          animation: pulse 1.6s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .4; transform: scale(.75); }
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .55rem;
          border-radius: 999px;
          font-weight: 550;
          transition: transform .22s cubic-bezier(.22,.75,.28,1), background .22s, border-color .22s;
          white-space: nowrap;
          border: 1px solid transparent;
          cursor: pointer;
        }

        .btn:hover {
          transform: translateY(-1px);
          border-color: var(--ember) !important;
        }

        .btn:active {
          transform: translateY(1px) scale(.985);
        }
      `}</style>
    </header>
  );
}
