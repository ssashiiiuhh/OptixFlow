"use client";

import AppShellLayout from "@/components/layout/AppShellLayout";
import ConstellationCanvas from "@/components/constellation/ConstellationCanvas";

export default function PlaybookPage() {
  return (
    <AppShellLayout>
      <div className="flex-1 w-full h-full relative p-2">
        {/* We wrap it in a slightly padded container so the AppShell sidebar feels integrated */}
        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 relative glass">
          <ConstellationCanvas />
        </div>
      </div>
    </AppShellLayout>
  );
}
