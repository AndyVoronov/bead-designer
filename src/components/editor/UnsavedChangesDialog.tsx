"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/auth-provider";
import { useDesignStore } from "@/stores/useDesignStore";
import { encodeDesign } from "@/lib/serialization";

// ── Types ────────────────────────────────────────────────────────────────────

interface UnsavedChangesDialogProps {
  /** Show the dialog */
  open: boolean;
  /** Called when user dismisses (cancel) */
  onCancel: () => void;
  /** Called when user confirms discard — load the new design */
  onDiscard: () => void;
  /** Called when user wants to save — then load the new design */
  onSaveAndLoad: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Modal dialog asking the user what to do with unsaved changes
 * before loading a new design.
 *
 * Options:
 * - "Сохранить и открыть" — save current design, then load new
 * - "Не сохранять" — discard current, load new
 * - "Отмена" — close dialog, stay on current design
 *
 * Portaled to document.body to escape R3F fixed positioning.
 */
export function UnsavedChangesDialog({ open, onCancel, onDiscard, onSaveAndLoad }: UnsavedChangesDialogProps) {
  const { user, requireAuth } = useAuth();
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open) return null;

  const handleSaveAndLoad = async () => {
    if (!user) {
      // Need to login first — cancel for now, they can try again after login
      onCancel();
      requireAuth(() => {});
      return;
    }

    const beads = useDesignStore.getState().beads;
    if (beads.length === 0) {
      onDiscard();
      return;
    }

    setSaving(true);
    try {
      const code = encodeDesign(beads);
      if (!code) {
        onDiscard();
        return;
      }
      const name = `Мой дизайн ${new Date().toLocaleDateString("ru-RU")}`;
      const res = await fetch("/api/designs/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, designCode: code, beadCount: beads.length }),
      });
      if (res.ok) {
        onSaveAndLoad();
      } else {
        // Save failed — still let them proceed
        onDiscard();
      }
    } catch {
      onDiscard();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl p-5 w-full max-w-xs z-10">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Несохранённые изменения</h3>
        <p className="text-sm text-gray-500 mb-4">
          Текущий дизайн не сохранён. Сохранить перед открытием нового?
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleSaveAndLoad}
            disabled={saving}
            className="w-full py-2.5 text-sm font-medium rounded-xl bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Сохранение..." : "Сохранить и открыть"}
          </button>
          <button
            onClick={onDiscard}
            className="w-full py-2.5 text-sm font-medium rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Не сохранять
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2.5 text-sm font-medium rounded-xl bg-white text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
