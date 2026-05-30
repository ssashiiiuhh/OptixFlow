import type { Metadata } from "next";
import AppShellLayout from "@/components/layout/AppShellLayout";
import SettingsView from "@/components/settings/SettingsView";

export const metadata: Metadata = {
  title: "Settings & Preferences",
  description: "Configure algorithmic constraints, visual themes, and telemetry bounds."
};

export default function SettingsPage() {
  return (
    <AppShellLayout>
      <SettingsView />
    </AppShellLayout>
  );
}
