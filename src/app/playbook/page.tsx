import type { Metadata } from "next";
import AppShellLayout from "@/components/layout/AppShellLayout";
import ConstellationCanvas from "@/components/constellation/ConstellationCanvas";

export const metadata: Metadata = {
  title: "Playbook Constellation",
  description: "Navigate option strategies, structural mechanics, and learning pathways."
};

export default function PlaybookPage() {
  return (
    <AppShellLayout>
      <div className="flex-1 w-full h-full relative p-2">
        <div className="w-full h-full rounded-2xl overflow-hidden border border-white/5 relative glass">
          <ConstellationCanvas />
        </div>
      </div>
    </AppShellLayout>
  );
}
