"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@/hooks/use-toast";
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-heading-1">{t('title')}</h1>
          <p className="text-body text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>

        {/* Device Information */}
        <Card level={2}>
          <CardHeader>
            <CardTitle>{t('deviceInfo')}</CardTitle>
            <CardDescription>{t('deviceInfoDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="clay-inset p-4 rounded-lg space-y-1">
                <p className="text-caption text-muted-foreground">{t('deviceModel')}</p>
                <p className="text-body font-semibold">BATT-X Pro v2</p>
              </div>
              <div className="clay-inset p-4 rounded-lg space-y-1">
                <p className="text-caption text-muted-foreground">{t('serialNumber')}</p>
                <p className="text-body font-semibold">BX-2024-A7K9</p>
              </div>
              <div className="clay-inset p-4 rounded-lg space-y-1">
                <p className="text-caption text-muted-foreground">{t('firmwareVersion')}</p>
                <div className="flex items-center gap-2">
                  <p className="text-body font-semibold">v1.2.3</p>
                  <Badge variant="success">Latest</Badge>
                </div>
              </div>
              <div className="clay-inset p-4 rounded-lg space-y-1">
                <p className="text-caption text-muted-foreground">{t('sdStorage')}</p>
                <p className="text-body font-semibold">2.4 GB / 32 GB</p>
              </div>
            </div>

            <Button onClick={handleCheckUpdates} variant="outline" className="w-full sm:w-auto">
              <RefreshCw className="w-4 h-4" />
              {t('checkUpdates')}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card level={2}>
          <CardHeader>
            <CardTitle>{t('notifications')}</CardTitle>
            <CardDescription>{t('notificationsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-body font-medium">{t('pushNotifications')}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {t('pushDescription')}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.push}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, push: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-body font-medium">{t('emailAlerts')}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {t('emailDescription')}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.email}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, email: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-body font-medium">{t('smsForSOS')}</p>
                  <p className="text-body-sm text-muted-foreground">
                    {t('smsDescription')}
                  </p>
                </div>
              </div>
              <Switch
                checked={notifications.sms}
                onCheckedChange={(checked) =>
                  setNotifications((prev) => ({ ...prev, sms: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card level={2}>
          <CardHeader>
            <CardTitle>{t('appearance')}</CardTitle>
            <CardDescription>{t('appearanceDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <div>
                <p className="text-body font-medium">{t('theme')}</p>
                <p className="text-body-sm text-muted-foreground">
                  {t('themeDescription')}
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Alert Thresholds */}
        <Card level={2}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{t('alertThresholds')}</CardTitle>
                <CardDescription>{t('thresholdsDescription')}</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1">
                <Shield className="w-3 h-3" />
                {t('adminOnly')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tempMax">{t('tempMax')}</Label>
                <Input
                  id="tempMax"
                  type="number"
                  value={thresholds.tempMax}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, tempMax: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tempMin">{t('tempMin')}</Label>
                <Input
                  id="tempMin"
                  type="number"
                  value={thresholds.tempMin}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, tempMin: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voltageMax">{t('voltageMax')}</Label>
                <Input
                  id="voltageMax"
                  type="number"
                  value={thresholds.voltageMax}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, voltageMax: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="voltageMin">{t('voltageMin')}</Label>
                <Input
                  id="voltageMin"
                  type="number"
                  value={thresholds.voltageMin}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, voltageMin: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gasMax">{t('gasMax')}</Label>
                <Input
                  id="gasMax"
                  type="number"
                  value={thresholds.gasMax}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, gasMax: Number(e.target.value) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentMax">{t('currentMax')}</Label>
                <Input
                  id="currentMax"
                  type="number"
                  value={thresholds.currentMax}
                  onChange={(e) =>
                    setThresholds((prev) => ({ ...prev, currentMax: Number(e.target.value) }))
                  }
                />
              </div>
            </div>

            <Button onClick={handleSaveThresholds} className="w-full sm:w-auto">
              {t('saveThresholds')}
            </Button>
          </CardContent>
        </Card>

        {/* Language */}
        <Card level={2}>
          <CardHeader>
            <CardTitle>{t('language')}</CardTitle>
            <CardDescription>{t('selectLanguage')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { code: 'en', label: t('english') },
                { code: 'hi', label: t('hindi') }
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  disabled={isPending}
                  className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50"
                >
                  <span className="text-body font-medium">{lang.label}</span>
                  {locale === lang.code && <CheckCircle className="w-5 h-5 text-success" />}
                  {locale !== lang.code && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
