"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Battery, WifiOff, RefreshCw, Bell, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from 'next-intl';

export default function OfflinePage() {
  const t = useTranslations('offline');
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card level={3} className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-2xl bg-warning/10">
              <WifiOff className="w-12 h-12 text-warning" />
            </div>
          </div>
          <CardTitle className="text-heading-2">{t('title')}</CardTitle>
          <CardDescription>
            {isOnline
              ? t('connectionRestored')
              : t('description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <p className="text-caption font-semibold text-muted-foreground uppercase">
              {t('canDo')}
            </p>
            <ul className="space-y-2 text-body-sm">
              <li className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary shrink-0" />
                <span>{t('viewReadings')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-destructive shrink-0" />
                <span>{t('triggerSOS')}</span>
              </li>
              <li className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-success shrink-0" />
                <span>{t('viewHistory')}</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="w-4 h-4" />
              {t('retry')}
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">{t('viewCached')}</Link>
            </Button>
          </div>

          <p className="text-caption text-muted-foreground text-center">
            {t('syncNote')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
