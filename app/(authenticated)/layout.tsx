import { TopNavbar } from "@/components/navigation/top-navbar";
import { BottomNav } from "@/components/navigation/bottom-nav";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--bg))' }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
        style={{
          background: 'hsl(var(--accent))',
          color: 'hsl(var(--accent-ink))',
        }}
      >
        Skip to main content
      </a>
      {/* Top navigation for desktop and mobile */}
      <TopNavbar />
      {/* Main content */}
      <main id="main-content" className="pb-16 lg:pb-0" tabIndex={-1}>
        {children}
      </main>
      {/* Mobile bottom navigation */}
      <BottomNav />
    </div>
  );
}
