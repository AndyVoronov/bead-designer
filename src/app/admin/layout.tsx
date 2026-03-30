"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/admin/templates", label: "Шаблоны" },
  { href: "/admin/orders", label: "Заказы" },
  { href: "/admin/beads", label: "Бусины" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // Even if the request fails, redirect to login
    } finally {
      router.push("/admin/login");
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-100 border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-900">
            Bead Designer Admin
          </h1>
        </div>
        <nav className="flex-1 p-2">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <a
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-100 text-blue-900"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
        <div className="p-2 border-t border-gray-200">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            {loggingOut ? "Выход..." : "Выйти"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 admin-root overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
