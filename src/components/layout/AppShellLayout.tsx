import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

/**
 * Shared shell layout for all pages that need
 * the sidebar + topbar chrome (Strategy Lab, Analytics, etc.)
 *
 * Uses Next.js nested layout — this layout.tsx sits inside /src/app/
 * alongside the root layout, wrapping the inner children.
 *
 * NOTE: We place this as a CLIENT layout wrapper referenced from
 * the root layout's children — it lives in the (app) route group.
 */
export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Persistent sidebar across all routes */}
      <Sidebar />

      {/* Right content: topbar + page content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        {children}
      </div>
    </div>
  );
}
