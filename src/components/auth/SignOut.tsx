"use client";

import { useAuth } from "@/lib/auth-provider";
import { notifyAuthChange } from "@/lib/auth-provider";

export function SignOut() {
  const { user } = useAuth();

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Ignore errors — redirect anyway
    }
    // Clear client-side state and redirect
    window.location.href = "/";
  };

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
    >
      Выйти
    </button>
  );
}
