import { Sidebar } from "@/components/navigation/sidebar";
import { BottomNav } from "@/components/navigation/bottom-nav";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/*
        Skip-to-content link for keyboard users. Hidden until focused, so
        it doesn't show up visually for mouse / touch users.
      */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:shadow-clay-md"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="lg:pl-64 pb-16 lg:pb-0" tabIndex={-1}>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
