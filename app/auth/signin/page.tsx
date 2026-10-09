"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Play, Thermometer, Wind, Activity, Shield } from "lucide-react";
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

  // NEW: Direct demo access without sign-in
  const goToDemoDirectly = () => {
    // Set demo mode flag in sessionStorage AND use URL parameter
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('battx_demo_mode', 'true');
      // Use query parameter that middleware can check
      window.location.href = '/dashboard?demo=true';
    }
  };

  return (
    <main className="auth">
      {/* ---- LEFT: Sign-in form ---- */}
      <div className="auth__left">
        <div className="auth__form">
          <div className="brand" style={{ justifyContent: 'center', marginBottom: '26px' }}>
            <svg className="brand__mark" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect width="40" height="40" rx="11" fill="var(--ember)"/>
              <rect x="8.5" y="13" width="19" height="14" rx="3.2" stroke="#fff" strokeWidth="2.1"/>
              <path d="M29 17.5v5" stroke="#fff" strokeWidth="2.6" strokeLinecap="round"/>
              <path d="M6.5 20h3.4l2.2-3.4 3 6.8 2.6-4.6 1.7 1.2h3.1" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="brand__text">BATT<span className="brand__x">-x</span></span>
          </div>

          <h1 className="h1" style={{ marginBottom: '8px', textAlign: 'center' }}>Sign in to BATT-x</h1>
          <p className="body" style={{ textAlign: 'center', marginBottom: '28px' }}>Access live telemetry, log verification and reports for your devices.</p>

          {/* Error message */}
          {error && (
            <div className="authmsg authmsg--err show">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="field">
              <label htmlFor="siEmail">Email</label>
              <input
                type="email"
                id="siEmail"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="field">
              <label htmlFor="siPass">Password</label>
              <input
                type="password"
                id="siPass"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <button className="btn btn--solid btn--block btn--lg" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="small" style={{ marginTop: '22px', textAlign: 'center' }}>
            Don't have an account? <a href="/auth/signup" style={{ color: 'var(--ember)', fontWeight: 600, textDecoration: 'none' }}>Create account</a>
          </p>
        </div>
      </div>

      {/* ---- RIGHT: Demo showcase (For Evaluators) ---- */}
      <div className="auth__right">
        <div style={{ maxWidth: '460px', position: 'relative' }}>
          <div className="demo-card" style={{ cursor: 'pointer' }} onClick={goToDemoDirectly}>
            <div className="demo-card__flag">For evaluators</div>
            <span className="pill pill--ember" style={{ marginBottom: '18px' }}>
              <span className="dot"></span> No account needed
            </span>
            <h2 className="h2" style={{ marginBottom: '14px' }}>Skip straight to the demo.</h2>
            <p className="body" style={{ marginBottom: '6px' }}>
              This drops you into the live dashboard with a running device. Inject a fault and watch
              the full sequence: warning → grace countdown → automatic cutoff → tamper-evident log.
            </p>
            <button className="btn btn--solid btn--lg btn--block" type="button">
              <Play className="w-4 h-4" />
              Enter demo dashboard
            </button>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3 className="h3" style={{ marginBottom: '16px' }}>What you'll see inside</h3>
            <div className="stack" style={{ gap: '14px' }}>
              <div className="row" style={{ alignItems: 'flex-start', gap: '12px', flexWrap: 'nowrap' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'var(--ok-soft)', color: 'var(--ok)', display: 'grid', placeItems: 'center', flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: '.7rem', fontWeight: 700 }}>1</div>
                <p className="small" style={{ color: 'hsl(var(--ink-2))' }}>Live temperature, gas, current and voltage readings updating every second.</p>
              </div>
              <div className="row" style={{ alignItems: 'flex-start', gap: '12px', flexWrap: 'nowrap' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'var(--ember-soft)', color: 'var(--ember)', display: 'grid', placeItems: 'center', flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: '.7rem', fontWeight: 700 }}>2</div>
                <p className="small" style={{ color: 'hsl(var(--ink-2))' }}>A 90-second grace countdown you can start with one button.</p>
              </div>
              <div className="row" style={{ alignItems: 'flex-start', gap: '12px', flexWrap: 'nowrap' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'var(--teal-soft)', color: 'var(--teal)', display: 'grid', placeItems: 'center', flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: '.7rem', fontWeight: 700 }}>3</div>
                <p className="small" style={{ color: 'hsl(var(--ink-2))' }}>A real HMAC-SHA256 log you can tamper with and watch fail verification.</p>
              </div>
              <div className="row" style={{ alignItems: 'flex-start', gap: '12px', flexWrap: 'nowrap' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'hsl(var(--bg-alt))', color: 'var(--ember)', display: 'grid', placeItems: 'center', flex: '0 0 auto', fontFamily: 'var(--font-mono)', fontSize: '.7rem', fontWeight: 700 }}>4</div>
                <p className="small" style={{ color: 'hsl(var(--ink-2))' }}>A connection panel to point the dashboard at real ESP32 hardware.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* ============================================================
           BATT-x — Design System from Reference HTML
           Warm paper / ember palette
           ============================================================ */

        /* Variables matching reference */
        :global(:root) {
          --ember: #FF5A1F;
          --ember-2: #E0450C;
          --ember-soft: #FFEDE5;
          --teal: #0E8F8A;
          --teal-soft: #E1F4F2;
          --ok: #16875A;
          --ok-soft: #E2F4EC;
          --warn: #C47900;
          --warn-soft: #FBF0DA;
          --crit: #CE2A2A;
          --crit-soft: #FCE9E9;
          --violet: #6D4AE0;

          --shadow-s: 0 1px 2px rgba(30,22,12,.06), 0 2px 8px rgba(30,22,12,.04);
          --shadow-m: 0 2px 6px rgba(30,22,12,.06), 0 12px 32px rgba(30,22,12,.08);
          --shadow-l: 0 8px 24px rgba(30,22,12,.09), 0 32px 72px rgba(30,22,12,.12);

          --r-xs: 8px;
          --r-s: 12px;
          --r-m: 18px;
          --r-l: 26px;
          --r-xl: 36px;

          --font-display: "Fraunces", Georgia, serif;
          --font-ui: "Inter Tight", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
          --ease: cubic-bezier(.22,.75,.28,1);

          --bg-3: #EFEAE2;
        }

        :global([data-theme="dark"]) {
          --ember-soft: #33201A;
          --teal-soft: #122B29;
          --ok-soft: #12291F;
          --warn-soft: #2C2415;
          --crit-soft: #2E1717;
          --bg-3: #221E1A;
        }

        /* Auth page layout */
        .auth {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        @media(max-width: 980px) {
          .auth { grid-template-columns: 1fr; }
        }

        .auth__left {
          display: grid;
          place-items: center;
          padding: 56px 24px;
        }

        .auth__form {
          width: 100%;
          max-width: 400px;
          position: relative;
        }

        /* Brand */
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 0 0 auto;
        }

        .brand__mark {
          width: 32px;
          height: 32px;
          flex: 0 0 auto;
        }

        .brand__text {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 1.32rem;
          letter-spacing: -.03em;
        }

        .brand__x {
          color: var(--ember);
        }

        /* Form elements */
        .field {
          margin-bottom: 15px;
        }

        .field label {
          display: block;
          font-size: .79rem;
          font-weight: 550;
          color: hsl(var(--ink-2));
          margin-bottom: 6px;
        }

        .field input {
          width: 100%;
          padding: .75rem .95rem;
          border-radius: 11px;
          border: 1px solid hsl(var(--rule));
          background: hsl(var(--paper));
          font-size: .93rem;
          transition: all .22s var(--ease);
          outline: none;
        }

        .field input:focus {
          border-color: var(--ember);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--ember) 16%, transparent);
        }

        .field input::placeholder {
          color: hsl(var(--ink-3));
          opacity: .7;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .55rem;
          padding: .78rem 1.35rem;
          border-radius: 999px;
          font-weight: 550;
          font-size: .92rem;
          letter-spacing: -.005em;
          transition: transform .22s var(--ease), background .22s var(--ease), box-shadow .22s var(--ease);
          white-space: nowrap;
          border: 1px solid transparent;
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .btn:active {
          transform: translateY(1px) scale(.985);
        }

        .btn--solid {
          background: var(--ember);
          color: #fff;
          box-shadow: 0 2px 10px rgba(255,90,31,.28);
        }

        .btn--solid:hover {
          background: var(--ember-2);
          box-shadow: 0 6px 22px rgba(255,90,31,.36);
          transform: translateY(-2px);
        }

        .btn--lg {
          padding: 1rem 1.7rem;
          font-size: 1rem;
        }

        .btn--block {
          width: 100%;
        }

        .btn[disabled] {
          opacity: .42;
          pointer-events: none;
        }

        /* Right column */
        .auth__right {
          background: hsl(var(--bg-alt));
          border-left: 1px solid hsl(var(--rule));
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 56px 48px;
          position: relative;
          overflow: hidden;
        }

        .auth__right::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(600px 380px at 70% 20%, color-mix(in srgb, var(--ember) 14%, transparent), transparent 70%);
          pointer-events: none;
        }

        @media(max-width: 980px) {
          .auth__right {
            border-left: 0;
            border-top: 1px solid hsl(var(--rule));
            padding: 44px 24px;
          }
        }

        /* Demo card */
        .demo-card {
          background: hsl(var(--paper));
          border: 2px solid var(--ember);
          border-radius: var(--r-l);
          padding: 28px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 12px 40px color-mix(in srgb, var(--ember) 18%, transparent);
          transition: transform .35s var(--ease), box-shadow .35s var(--ease);
        }

        .demo-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 22px 60px color-mix(in srgb, var(--ember) 26%, transparent);
        }

        .demo-card__flag {
          position: absolute;
          top: 0;
          right: 0;
          background: var(--ember);
          color: #fff;
          font-family: var(--font-mono);
          font-size: .6rem;
          letter-spacing: .14em;
          text-transform: uppercase;
          padding: 6px 14px;
          border-bottom-left-radius: 12px;
          font-weight: 600;
        }

        /* Pills */
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
          border: 1px solid transparent;
        }

        .pill--ember {
          background: var(--ember-soft);
          color: var(--ember-2);
        }

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
          flex: 0 0 auto;
        }

        /* Typography classes */
        .h1, .h2, .h3 {
          font-family: var(--font-display);
          font-weight: 500;
          letter-spacing: -.024em;
          margin: 0;
        }

        .h1 { font-size: clamp(2rem,4.4vw,3.4rem); line-height: 1.07; }
        .h2 { font-size: clamp(1.6rem,2.9vw,2.4rem); line-height: 1.13; }
        .h3 { font-family: var(--font-ui); font-weight: 600; font-size: clamp(1.05rem,1.6vw,1.28rem); line-height: 1.3; letter-spacing: -.012em; }

        .body {
          font-size: .985rem;
          line-height: 1.68;
          color: hsl(var(--ink-2));
          margin: 0;
        }

        .small {
          font-size: .86rem;
          line-height: 1.55;
          color: hsl(var(--ink-3));
        }

        .stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Messages */
        .authmsg {
          padding: 11px 14px;
          border-radius: 11px;
          font-size: .85rem;
          margin-bottom: 16px;
          display: none;
        }

        .authmsg.show {
          display: flex;
          align-items: center;
          gap: 8px;
          animation: viewIn .3s var(--ease);
        }

        .authmsg--err {
          background: var(--crit-soft);
          color: var(--crit);
        }

        @keyframes viewIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
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
