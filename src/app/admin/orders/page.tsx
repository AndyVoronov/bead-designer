"use client";

import { useEffect, useState, useCallback } from "react";

interface Order {
  id: number;
  designCode: string;
  designState: string;
  status: string;
  beadCount: number;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
  new: {
    label: "🆕 Новый",
    classes: "bg-yellow-100 text-yellow-800",
  },
  processing: {
    label: "⏳ В обработке",
    classes: "bg-blue-100 text-blue-800",
  },
  completed: {
    label: "✅ Завершён",
    classes: "bg-green-100 text-green-800",
  },
};

const STATUS_OPTIONS = [
  { value: "new", label: "Новый" },
  { value: "processing", label: "В обработке" },
  { value: "completed", label: "Завершён" },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [templateCodes, setTemplateCodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      console.error("Failed to fetch orders:", err);
      setError("Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplateCodes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/templates");
      if (!res.ok) return;
      const templates = await res.json();
      setTemplateCodes(new Set(templates.map((t: { designCode: string }) => t.designCode)));
    } catch {
      // Non-critical — just skip the promote-disable check
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchTemplateCodes();
  }, [fetchOrders, fetchTemplateCodes]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      await fetchOrders();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handlePromote = async (order: Order) => {
    if (!confirm(`Создать шаблон из заказа #${order.id}?`)) return;
    setPromoting(order.id);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Заказ #${order.id}`,
          designCode: order.designCode,
        }),
      });
      if (!res.ok) throw new Error("Failed to create template");
      // Refresh both lists
      await Promise.all([fetchOrders(), fetchTemplateCodes()]);
    } catch (err) {
      console.error("Failed to promote order:", err);
      setError(err instanceof Error ? err.message : "Ошибка создания шаблона");
    } finally {
      setPromoting(null);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Загрузка...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Заказы</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-gray-500 py-8 text-center">Нет заказов</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  ID
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Код дизайна
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Статус
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Бусин
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Дата
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const badge =
                  STATUS_BADGES[order.status] || STATUS_BADGES.new;
                const alreadyPromoted = templateCodes.has(order.designCode);

                return (
                  <tr
                    key={order.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-2 px-2 text-gray-500">{order.id}</td>
                    <td className="py-2 px-2 text-gray-600 font-mono text-xs">
                      {order.designCode.length > 30
                        ? order.designCode.slice(0, 30) + "..."
                        : order.designCode}
                    </td>
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-600">
                      {order.beadCount}
                    </td>
                    <td className="py-2 px-2 text-gray-500 text-xs">
                      {new Date(order.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                          }
                          className="px-2 py-1 border border-gray-300 rounded text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handlePromote(order)}
                          disabled={
                            promoting === order.id || alreadyPromoted
                          }
                          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                            alreadyPromoted
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50"
                          }`}
                          title={
                            alreadyPromoted
                              ? "Шаблон уже создан"
                              : "Сделать шаблоном"
                          }
                        >
                          {promoting === order.id
                            ? "..."
                            : alreadyPromoted
                              ? "✓ Шаблон"
                              : "📋 Шаблон"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
