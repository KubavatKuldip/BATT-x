"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, AlertCircle, RefreshCw } from "lucide-react";
import { Suspense } from "react";
import { BattXLogo } from "@/components/ui/battx-logo";

const ERROR_MAP: Record<string, { title: string; description: string; icon: any }> = {
  Configuration: {
    title: "Server Configuration Error",
    description: "There's a problem with the server configuration. Please contact support.",
    icon: AlertCircle,
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You don't have permission to sign in. Contact your administrator.",
    icon: ShieldAlert,
  },
  Verification: {
    title: "Verification Failed",
    description: "The verification link is invalid or has expired.",
    icon: AlertCircle,
  },
  Default: {
    title: "Authentication Error",
    description: "An unexpected error occurred during sign in. Please try again.",
    icon: AlertCircle,
  },
};

function ErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error") || "Default";
  const config = ERROR_MAP[error] || ERROR_MAP.Default;
  const Icon = config.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card level={3} className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-destructive/10">
              <Icon className="w-12 h-12 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-heading-2">{config.title}</CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <Button onClick={() => router.push("/auth/signin")} className="w-full">
            <RefreshCw className="w-4 h-4" />
            Try signing in again
          </Button>
          <Button onClick={() => router.push("/")} variant="outline" className="w-full">
            Go to home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <BattXLogo width={80} height={80} className="animate-pulse" />
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
