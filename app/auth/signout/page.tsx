"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import { BattXLogo } from "@/components/ui/battx-logo";

export default function SignOutPage() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut({ callbackUrl: "/auth/signin" });
    } catch (error) {
      console.error("Sign out error:", error);
      setIsSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card level={3} className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <BattXLogo width={80} height={80} priority />
          </div>
          <CardTitle className="text-heading-2">Sign out of BATT-X?</CardTitle>
          <CardDescription>
            You can sign back in anytime with your credentials.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <Button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full"
            variant="destructive"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing out...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Yes, sign me out
              </>
            )}
          </Button>

          <Button
            onClick={() => window.history.back()}
            disabled={isSigningOut}
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
