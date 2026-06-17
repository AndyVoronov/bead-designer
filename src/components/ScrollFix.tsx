"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * On non-home pages, html/body have overflow:hidden (set globally for the 3D editor).
 * This component removes those restrictions so normal pages can scroll on mobile.
 */
export function ScrollFix() {
  const pathname = usePathname();

  useEffect(() => {
    const isHomePage = pathname === "/";
    if (isHomePage) {
      document.documentElement.style.overflow = "";
      document.documentElement.style.touchAction = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    } else {
      document.documentElement.style.overflow = "auto";
      document.documentElement.style.touchAction = "auto";
      document.body.style.overflow = "auto";
      document.body.style.touchAction = "auto";
    }

    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.touchAction = "";
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [pathname]);

  return null;
}
