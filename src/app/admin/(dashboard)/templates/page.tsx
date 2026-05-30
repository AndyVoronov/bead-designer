"use client";

import { useEffect, useState, useCallback } from "react";

interface Template {
  id: number;
  name: string;
  designCode: string;
  beadCount: number;
  isApproved: boolean;
  createdAt: string;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesignCode, setCreateDesignCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      const data = await res.json();
      setTemplates(data);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
      setError("Не удалось загрузить шаблоны");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createDesignCode.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, designCode: createDesignCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create template");
      }
      setCreateName("");
      setCreateDesignCode("");
      setShowCreate(false);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleApprove = async (template: Template) => {
    try {
      const res = await fetch(`/api/admin/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !template.isApproved }),
      });
      if (!res.ok) throw new Error("Failed to update template");
      await fetchTemplates();
    } catch (err) {
      console.error("Failed to toggle approve:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить шаблон?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete template");
      await fetchTemplates();
    } catch (err) {
      console.error("Failed to delete template:", err);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Шаблоны</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          {showCreate ? "Отмена" : "Новый шаблон"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg"
        >
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Новый шаблон
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Название"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Код дизайна"
              value={createDesignCode}
              onChange={(e) => setCreateDesignCode(e.target.value)}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {creating ? "Создание..." : "Создать"}
            </button>
          </div>
        </form>
      )}

      {templates.length === 0 ? (
        <div className="text-gray-500 py-8 text-center">Нет шаблонов</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  ID
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Название
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Код дизайна
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Бусин
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Статус
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr
                  key={template.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 px-2 text-gray-500">{template.id}</td>
                  <td className="py-2 px-2 font-medium text-gray-900">
                    {template.name}
                  </td>
                  <td className="py-2 px-2 text-gray-600 font-mono text-xs">
                    {template.designCode.length > 30
                      ? template.designCode.slice(0, 30) + "..."
                      : template.designCode}
                  </td>
                  <td className="py-2 px-2 text-gray-600">
                    {template.beadCount}
                  </td>
                  <td className="py-2 px-2">
                    {template.isApproved ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Одобрен
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ На модерации
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleToggleApprove(template)}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          template.isApproved
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            : "bg-green-100 text-green-700 hover:bg-green-200"
                        }`}
                      >
                        {template.isApproved ? "Снять" : "Одобрить"}
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        disabled={deleting === template.id}
                        className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50"
                      >
                        {deleting === template.id ? "..." : "Удалить"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
