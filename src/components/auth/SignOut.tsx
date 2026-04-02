"use client";

import { signOut } from "next-auth/react";
import { useAuth } from "@/lib/auth-provider";

export function SignOut() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-sm text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
    >
      Выйти
    </button>
  );
}
