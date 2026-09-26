"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BattXLogo } from "@/components/ui/battx-logo";
import { useTranslations } from 'next-intl';

export default function SignUpPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 8) {
      setError(t('passwordTooShort'));
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('signUpFailed'));
        toast({
          variant: "destructive",
          title: t('signUpFailed'),
          description: data.error || "Please try again",
        });
        return;
      }

      // Auto sign-in after successful registration
      const signInResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created, but auto sign-in failed. Please sign in manually.");
        router.push("/auth/signin");
        return;
      }

      toast({
        variant: "success",
        title: t('accountCreated'),
        description: t('accountCreatedDesc'),
      });
      router.push("/dashboard");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = () => {
    const p = formData.password;
    if (p.length === 0) return null;
    if (p.length < 8) return { label: "Too short", color: "text-destructive" };
    const hasNumber = /\d/.test(p);
    const hasLetter = /[a-zA-Z]/.test(p);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(p);
    const score = [hasNumber, hasLetter, hasSpecial].filter(Boolean).length;
    if (score === 3) return { label: "Strong", color: "text-success" };
    if (score === 2) return { label: "Good", color: "text-info" };
    return { label: "Weak", color: "text-warning" };
  };

  const strength = passwordStrength();

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card level={3} className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BattXLogo width={80} height={80} priority />
          </div>
          <CardTitle className="text-heading-2">{t('createAccountTitle')}</CardTitle>
          <CardDescription>{t('signUpDescription')}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('name')}</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                required
                disabled={isLoading}
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={8}
              />
              {strength && (
                <p className={`text-caption ${strength.color}`}>
                  Strength: {strength.label}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={8}
              />
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-caption text-success flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 text-danger">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p className="text-body-sm">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('signingUp') : t('signUpButton')}
            </Button>

            <div className="text-center text-caption text-muted-foreground">
              {t('alreadyHaveAccount')}{" "}
              <a href="/auth/signin" className="text-primary hover:underline font-medium">
                {t('signInButton')}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
