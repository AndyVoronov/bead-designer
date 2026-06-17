"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/ToastProvider";

interface SettingField {
  key: string;
  label: string;
  type: "text" | "longtext";
  value: string;
}

export default function AdminSiteSettingsPage() {
  const [fields, setFields] = useState<SettingField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((data) => {
        const f: SettingField[] = Object.entries(data.schema as Record<string, { label: string; type: "text" | "longtext"; default: string }>).map(([key, schema]) => ({
          key,
          label: schema.label,
          type: schema.type,
          value: data.settings[key] || "",
        }));
        setFields(f);
      })
      .catch(() => toast.error("Не удалось загрузить настройки"))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (key: string, value: string) => {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, value } : f)));
  };

  const save = async () => {
    setSaving(true);
    const body: Record<string, string> = {};
    fields.forEach((f) => { body[f.key] = f.value; });

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success("Настройки сохранены");
      } else {
        toast.error("Ошибка сохранения");
      }
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Настройки сайта</h1>
          <p className="text-sm text-gray-400 mt-0.5">Контактная информация, карта, часы работы</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 disabled:opacity-50 cursor-pointer transition-colors"
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-20" />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {fields.map((field) => (
            <div key={field.key} className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
              {field.type === "longtext" ? (
                <textarea
                  value={field.value}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              )}
              <p className="text-xs text-gray-400 mt-1">Ключ: {field.key}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
