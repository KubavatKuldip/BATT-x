// Dashboard uses the shared authenticated layout from app/(authenticated)/layout.tsx
// This file is no longer needed but kept for route structure
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
