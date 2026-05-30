import type { Metadata } from "next";
import { AdminSidebar } from "./AdminSidebar";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <AdminSidebar />
      <main className="flex-1 min-h-screen">
        <div className="pt-14 lg:pt-0 p-4 lg:p-6 xl:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
