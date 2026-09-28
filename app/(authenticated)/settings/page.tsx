"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Bell,
  Globe,
  Smartphone,
  HardDrive,
  Shield,
  Wifi,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Users,
  Wrench,
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@/hooks/use-toast";
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Mode selection state (rider vs technician)
  const [userMode, setUserMode] = useState<'rider' | 'technician'>('rider');

  const [notifications, setNotifications] = useState({
    push: true,
    email: false,
    sms: true,
  });

  const [thresholds, setThresholds] = useState({
    tempMax: 65,
    tempMin: 0,
    gasMax: 80,
    voltageMax: 54,
    voltageMin: 40,
    currentMax: 15,
  });

  const handleSaveThresholds = () => {
    toast({
      title: `✓ ${t('thresholdsUpdated')}`,
      description: t('thresholdsSaved'),
    });
  };

  const handleCheckUpdates = () => {
    toast({
      title: t('checkingUpdates'),
      description: "This may take a moment",
    });

    setTimeout(() => {
      toast({
        variant: "success",
        title: `✓ ${t('upToDate')}`,
        description: t('latestVersion', { version: 'v1.2.3' }),
      });
    }, 2000);
  };

  const handleLanguageChange = (newLocale: string) => {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      router.refresh();
    });
  };

  const handleModeChange = (mode: 'rider' | 'technician') => {
    setUserMode(mode);
    toast({
      title: `✓ Mode switched to ${mode === 'rider' ? 'Rider' : 'Technician'}`,
      description: mode === 'rider'
        ? 'Focused on daily monitoring and alerts'
        : 'Advanced diagnostics and safety features enabled',
    });

    // Navigate to appropriate page based on mode
    router.push(mode === 'rider' ? '/dashboard' : '/safety');
  };

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <div className="max-w-[1240px] mx-auto px-8 py-12 space-y-16">
        {/* Editorial Header */}
        <div className="space-y-10">
          <div className="eyebrow">Settings & Configuration</div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 items-end pb-7 border-b border-rule">
            <div className="space-y-3.5">
              <div className="font-mono text-[11px] text-ink-4 tracking-wide uppercase">
                PREFERENCES · THRESHOLDS · MODE
              </div>
            </div>
            <div>
              <h2 className="h-section">
                Adjust how BATT-x <em className="font-serif italic font-normal" style={{ color: 'hsl(var(--accent))' }}>works for you.</em>
              </h2>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <section>
          <div className="mb-7">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Interface Mode</h3>
            <p className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
              Choose between rider-focused monitoring or technician-level diagnostics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button
              onClick={() => handleModeChange('rider')}
              className={`paper-surface-hover rounded-lg border p-8 text-left transition-all ${
                userMode === 'rider' ? 'border-accent' : 'border-rule'
              }`}
              style={{
                background: userMode === 'rider'
                  ? 'color-mix(in srgb, hsl(var(--accent)) 5%, hsl(var(--paper)))'
                  : 'hsl(var(--paper))',
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="p-3 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                  <Users className="w-6 h-6" style={{ color: 'hsl(var(--accent))' }} />
                </div>
                {userMode === 'rider' && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--accent))' }}>
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              <h4 className="text-[20px] font-medium tracking-tight leading-tight mb-2.5">
                For Riders
              </h4>
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
                Daily monitoring dashboard with live sensor readings, alerts, and battery health. Perfect for everyday use and peace of mind.
              </p>
            </button>

            <button
              onClick={() => handleModeChange('technician')}
              className={`paper-surface-hover rounded-lg border p-8 text-left transition-all ${
                userMode === 'technician' ? 'border-accent' : 'border-rule'
              }`}
              style={{
                background: userMode === 'technician'
                  ? 'color-mix(in srgb, hsl(var(--accent)) 5%, hsl(var(--paper)))'
                  : 'hsl(var(--paper))',
              }}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="p-3 rounded-lg border border-rule" style={{ background: 'hsl(var(--bg))' }}>
                  <Wrench className="w-6 h-6" style={{ color: 'hsl(var(--accent))' }} />
                </div>
                {userMode === 'technician' && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--accent))' }}>
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              <h4 className="text-[20px] font-medium tracking-tight leading-tight mb-2.5">
                For Technicians
              </h4>
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
                Advanced diagnostics, safety protocols, emergency procedures, and detailed event logs. Full access to system configuration and insurance reporting.
              </p>
            </button>
          </div>
        </section>

        {/* Device Information */}
        <section>
          <div className="mb-7">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Device Information</h3>
            <p className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
              Hardware details and firmware status for this unit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="paper-surface-hover rounded-lg border border-rule p-6">
              <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Device Model</div>
              <div className="font-mono text-[18px] font-light">BATT-X Pro v2</div>
            </div>
            <div className="paper-surface-hover rounded-lg border border-rule p-6">
              <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Serial Number</div>
              <div className="font-mono text-[18px] font-light">BX-2024-A7K9</div>
            </div>
            <div className="paper-surface-hover rounded-lg border border-rule p-6">
              <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>Firmware Version</div>
              <div className="flex items-center gap-2.5">
                <div className="font-mono text-[18px] font-light">v1.2.3</div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{
                  background: 'color-mix(in srgb, hsl(var(--ok)) 8%, hsl(var(--paper)))',
                  color: 'hsl(var(--ok))'
                }}>LATEST</span>
              </div>
            </div>
            <div className="paper-surface-hover rounded-lg border border-rule p-6">
              <div className="smallcaps mb-3" style={{ color: 'hsl(var(--ink-3))' }}>SD Storage</div>
              <div className="font-mono text-[18px] font-light">2.4 GB / 32 GB</div>
            </div>
          </div>

          <Button
            onClick={handleCheckUpdates}
            variant="outline"
            className="mt-5 font-mono text-[12px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check for Updates
          </Button>
        </section>

        {/* Notifications */}
        <section>
          <div className="mb-7">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Notifications</h3>
            <p className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
              Configure how you receive alerts and safety notifications.
            </p>
          </div>

          <div className="space-y-3">
            <div className="paper-surface-hover rounded-lg border border-rule p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg" style={{ background: 'hsl(var(--bg))' }}>
                  <Bell className="w-5 h-5" style={{ color: 'hsl(var(--ink-3))' }} />
                </div>
                <div>
                  <div className="text-[15px] font-medium mb-0.5">Push Notifications</div>
                  <div className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Instant alerts for critical events
                  </div>
                </div>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, push: checked }))
                }
              />
            </div>

            <div className="paper-surface-hover rounded-lg border border-rule p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg" style={{ background: 'hsl(var(--bg))' }}>
                  <Globe className="w-5 h-5" style={{ color: 'hsl(var(--ink-3))' }} />
                </div>
                <div>
                  <div className="text-[15px] font-medium mb-0.5">Email Alerts</div>
                  <div className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Receive detailed reports via email
                  </div>
                </div>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, email: checked }))
                }
              />
            </div>

            <div className="paper-surface-hover rounded-lg border border-rule p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg" style={{ background: 'hsl(var(--bg))' }}>
                  <Smartphone className="w-5 h-5" style={{ color: 'hsl(var(--ink-3))' }} />
                </div>
                <div>
                  <div className="text-[15px] font-medium mb-0.5">SMS for SOS</div>
                  <div className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                    Emergency contacts notified via SMS
                  </div>
                </div>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, sms: checked }))
                }
              />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <div className="mb-7">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Appearance</h3>
            <p className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
              Customize the interface theme.
            </p>
          </div>

          <div className="paper-surface-hover rounded-lg border border-rule p-5 flex items-center justify-between">
            <div>
              <div className="text-[15px] font-medium mb-0.5">Theme</div>
              <div className="text-[13px]" style={{ color: 'hsl(var(--ink-3))' }}>
                Switch between light, dark, or system preference
              </div>
            </div>
            <ThemeToggle />
          </div>
        </section>

        {/* Language */}
        <section>
          <div className="mb-7">
            <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Language</h3>
            <p className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
              Choose your preferred interface language.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { code: 'en', label: 'English' },
              { code: 'hi', label: 'हिन्दी (Hindi)' }
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                disabled={isPending}
                className="w-full paper-surface-hover rounded-lg border border-rule p-5 flex items-center justify-between transition-colors disabled:opacity-50"
              >
                <span className="text-[15px] font-medium">{lang.label}</span>
                {locale === lang.code && (
                  <CheckCircle className="w-5 h-5" style={{ color: 'hsl(var(--ok))' }} />
                )}
                {locale !== lang.code && (
                  <ChevronRight className="w-5 h-5" style={{ color: 'hsl(var(--ink-4))' }} />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Alert Thresholds (Technician Mode Only) */}
        {userMode === 'technician' && (
          <section>
            <div className="mb-7 flex items-start justify-between">
              <div>
                <h3 className="text-[22px] font-medium tracking-tight leading-tight mb-2">Alert Thresholds</h3>
                <p className="text-[14.5px] leading-relaxed" style={{ color: 'hsl(var(--ink-2))' }}>
                  Configure safety cutoff thresholds for sensors.
                </p>
              </div>
              <span className="font-mono text-[10px] px-2.5 py-1 rounded border border-rule" style={{ color: 'hsl(var(--ink-3))' }}>
                TECHNICIAN ONLY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="tempMax" className="smallcaps block mb-2">Temperature Max (°C)</Label>
                <Input
                  id="tempMax"
                  type="number"
                  value={thresholds.tempMax}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, tempMax: Number(e.target.value) }))
                  }
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="gasMax" className="smallcaps block mb-2">Gas Max (ppm)</Label>
                <Input
                  id="gasMax"
                  type="number"
                  value={thresholds.gasMax}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, gasMax: Number(e.target.value) }))
                  }
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="voltageMax" className="smallcaps block mb-2">Voltage Max (V)</Label>
                <Input
                  id="voltageMax"
                  type="number"
                  value={thresholds.voltageMax}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, voltageMax: Number(e.target.value) }))
                  }
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="voltageMin" className="smallcaps block mb-2">Voltage Min (V)</Label>
                <Input
                  id="voltageMin"
                  type="number"
                  value={thresholds.voltageMin}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, voltageMin: Number(e.target.value) }))
                  }
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="currentMax" className="smallcaps block mb-2">Current Max (A)</Label>
                <Input
                  id="currentMax"
                  type="number"
                  value={thresholds.currentMax}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, currentMax: Number(e.target.value) }))
                  }
                  className="font-mono"
                />
              </div>
            </div>

            <Button onClick={handleSaveThresholds} className="mt-5 font-mono text-[12px]">
              Save Thresholds
            </Button>
          </section>
        )}

        {/* Footer */}
        <footer className="pt-11 border-t border-rule">
          <div className="flex items-center justify-between flex-wrap gap-8">
            <div className="flex gap-5 flex-wrap font-mono text-[10.5px] tracking-wide" style={{ color: 'hsl(var(--ink-4))' }}>
              <span>BATT-x · Settings</span>
              <span className="opacity-40">·</span>
              <span>Version 1.0.4</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
