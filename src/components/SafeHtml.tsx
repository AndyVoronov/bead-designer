"use client";

import { useMemo } from "react";

interface SafeHtmlProps {
  html: string;
  className?: string;
}

export default function SafeHtml({ html, className = "" }: SafeHtmlProps) {
  // Sanitize: allow only safe tags and attributes
  const sanitized = useMemo(() => {
    if (!html) return "";
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/on\w+\s*=\s*'[^']*'/gi, "")
      .replace(/on\w+\s*=\s*[^\s>]*/gi, "")
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
      .replace(/<embed\b[^>]*>/gi, "")
      .replace(/javascript\s*:/gi, "");
  }, [html]);

  if (!sanitized) return null;

  return (
    <div
      className={`prose prose-sm sm:prose-base max-w-none text-gray-600 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
