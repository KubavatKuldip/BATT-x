"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wifi, WifiOff, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorialHeaderProps {
  connectionStatus?: 'connected' | 'disconnected' | 'pairing' | 'offline';
  recordStatus?: 'sealed' | 'broken';
}

export function EditorialHeader({
  connectionStatus = 'connected',
  recordStatus = 'sealed'
}: EditorialHeaderProps) {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-sm"
      style={{
        background: 'color-mix(in srgb, hsl(var(--bg)) 88%, transparent)',
        borderBottom: '1px solid hsl(var(--rule))',
      }}
    >
      <div className="max-w-[1240px] mx-auto px-8 flex items-center gap-5 py-3.5">
        {/* Wordmark */}
        <Link href="/dashboard" className="flex items-baseline gap-2.5 shrink-0">
          <strong className="text-lg font-bold tracking-tight">
            BATT<b style={{ color: 'hsl(var(--accent))' }}>-x</b>
          </strong>
          <span
            className="font-mono text-[10px] pl-2.5 border-l"
            style={{
              color: 'hsl(var(--ink-4))',
              letterSpacing: '0.06em',
              borderColor: 'hsl(var(--rule))',
            }}
          >
            UNIT 0042 · ATHER 450X
          </span>
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-3.5 shrink-0">
          {/* Connection pill */}
          <div
            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium tracking-wide py-1.5 px-3 rounded-full border transition-all"
            style={{
              borderColor: 'hsl(var(--rule))',
              background: 'hsl(var(--paper))',
              color: 'hsl(var(--ink-2))',
            }}
          >
            {connectionStatus === 'connected' ? (
              <>
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: 'hsl(var(--ok))' }}
                />
                <span>Record sealed</span>
              </>
            ) : (
              <>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'hsl(var(--danger))' }}
                />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Settings link */}
          <Link
            href="/settings"
            className="p-2 rounded-lg hover:bg-rule-soft transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" style={{ color: 'hsl(var(--ink-3))' }} />
          </Link>

          {/* Theme toggle */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
