"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BattXLogo } from "@/components/ui/battx-logo";
import { useTranslations } from 'next-intl';

function SignInForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t('invalidCredentials'));
        toast({
          variant: "destructive",
          title: t('loginFailed'),
          description: t('invalidCredentials'),
        });
        return;
      }

      toast({
        variant: "success",
        title: t('loginSuccess'),
        description: t('welcomeBack'),
      });

      // Force a hard refresh so the middleware re-evaluates auth
      window.location.href = callbackUrl;
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@battx.com");
    setPassword("demo123");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card level={3} className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BattXLogo width={80} height={80} priority />
          </div>
          <CardTitle className="text-heading-2">{t('welcomeTitle')}</CardTitle>
          <CardDescription>{t('signInDescription')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="demo@battx.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
                aria-describedby={error ? "signin-error" : undefined}
                aria-invalid={!!error}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="demo123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
                aria-describedby={error ? "signin-error" : undefined}
                aria-invalid={!!error}
              />
            </div>

            {error && (
              <div
                id="signin-error"
                role="alert"
                className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 text-danger"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <p className="text-body-sm">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  {t('signingIn')}
                </>
              ) : (
                t('signInButton')
              )}
            </Button>

            <button
              type="button"
              onClick={fillDemo}
              disabled={isLoading}
              className="w-full p-3 rounded-lg bg-muted text-center hover:bg-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <p className="text-caption text-slate-700 dark:text-slate-300">
                Demo: <span className="font-mono">demo@battx.com</span> / <span className="font-mono">demo123</span>
              </p>
              <p className="text-caption text-primary mt-0.5">Click to fill</p>
            </button>

            <div className="text-center text-caption text-muted-foreground">
              {t('newToBattX')}{" "}
              <a href="/auth/signup" className="text-primary hover:underline font-medium">
                {t('signUpButton')}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
      </div>
    }>
      <SignInForm />
    </Suspense>
  );
}
