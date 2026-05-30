"use client";

import { useEffect, useState, useCallback } from "react";
import { formatPrice, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/catalog-utils";
import type { CatalogOrderType, OrderItemType } from "@/types/catalog";

/* ── Types ────────────────────────────────────────────── */

interface OrderWithUser extends CatalogOrderType {
  user?: { id: number; name: string | null; email: string | null } | null;
}

/* ── Constants ────────────────────────────────────────── */

const FILTER_TABS = [
  { value: "", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "processing", label: "В работе" },
  { value: "completed", label: "Выполненные" },
  { value: "cancelled", label: "Отменённые" },
] as const;

function escapeCSV(value: string | number | null | undefined): string {
  const str = String(value ?? "").replace(/"/g, '""');
  return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
}

function downloadCSV(orders: OrderWithUser[]) {
  const header = "ID,Дата,Статус,Имя,Телефон,Telegram,Товары,Сумма,Скидка,Итого,Комментарий";
  const rows = orders.map((o) => {
    const items = (o.items ?? []).map((i) => `${i.productName} x${i.quantity}`).join("; ");
    return [
      o.id,
      o.createdAt?.slice(0, 10),
      ORDER_STATUS_LABELS[o.status as keyof typeof ORDER_STATUS_LABELS] ?? o.status,
      escapeCSV(o.contactName),
      escapeCSV(o.contactPhone),
      escapeCSV(o.contactTelegram),
      escapeCSV(items),
      o.totalAmount,
      o.discount ?? 0,
      Math.round((o.totalAmount - (o.discount ?? 0)) * 100) / 100,
      escapeCSV(o.comment),
    ].join(",");
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_OPTIONS = [
  { value: "new", label: "Новый" },
  { value: "confirmed", label: "Подтверждён" },
  { value: "processing", label: "В работе" },
  { value: "shipped", label: "Отправлен" },
  { value: "completed", label: "Выполнен" },
  { value: "cancelled", label: "Отменён" },
];

/* ── Component ────────────────────────────────────────── */

export default function AdminCatalogOrdersPage() {
  const [orders, setOrders] = useState<OrderWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  /* ── Fetch ── */

  const fetchOrders = useCallback(async (p?: number) => {
    const currentPage = p ?? page;
    try {
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("limit", "20");
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/catalog-orders?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setOrders(data.orders ?? data);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setError("Не удалось загрузить заказы");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchOrders();
  }, [fetchOrders]);

  /* ── Actions ── */

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/catalog-orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status: newStatus } : o
        )
      );
    } catch {
      alert("Не удалось обновить статус");
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── Filter (server-side) ── */

  const exportCSV = () => downloadCSV(orders);

  /* ── Render ── */

  if (loading) {
    return (
      <div>
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3 mb-6" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-lg animate-pulse mb-4" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header + Search */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Заказы каталога</h2>
        </div>
        <input
          type="text"
          placeholder="Поиск по имени, телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
          {error}
          <button
            onClick={() => {
              setError("");
              fetchOrders();
            }}
            className="ml-2 underline"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === tab.value
                  ? "bg-blue-100 text-blue-900"
                  : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
        ))}
      </div>

      {/* Actions */}
      {orders.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={exportCSV}
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Экспорт CSV
          </button>
        </div>
      )}

      {/* Order cards */}
      {orders.length === 0 ? (
        <div className="text-gray-500 py-12 text-center">
          {statusFilter
            ? "Нет заказов с выбранным статусом"
            : "Нет заказов"}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            const statusColor =
              ORDER_STATUS_COLORS[order.status] ??
              "bg-gray-100 text-gray-800";
            const statusLabel =
              ORDER_STATUS_LABELS[order.status] ?? order.status;

            return (
              <div
                key={order.id}
                className="border border-gray-200 rounded-lg bg-white overflow-hidden"
              >
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Order number & date */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-base font-semibold text-gray-900">
                          Заказ #{order.id}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Date */}
                      <p className="text-xs text-gray-500 mb-2">
                        {new Date(order.createdAt).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>

                      {/* Contact info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span className="text-gray-700">
                          <span className="text-gray-400">Имя: </span>
                          {order.contactName}
                        </span>
                        {order.contactPhone && (
                          <span className="text-gray-700">
                            <span className="text-gray-400">Тел: </span>
                            {order.contactPhone}
                          </span>
                        )}
                        {order.contactTelegram && (
                          <span className="text-gray-700">
                            <span className="text-gray-400">TG: </span>
                            {order.contactTelegram}
                          </span>
                        )}
                        {order.user?.email && (
                          <span className="text-gray-700">
                            <span className="text-gray-400">Email: </span>
                            {order.user.email}
                          </span>
                        )}
                      </div>

                      {/* Comment */}
                      {order.comment && (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-md px-3 py-2">
                          💬 {order.comment}
                        </p>
                      )}
                    </div>

                    {/* Status change */}
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(order.totalAmount)}
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={order.status}
                          onChange={(e) =>
                            handleStatusChange(order.id, e.target.value)
                          }
                          disabled={updatingId === order.id}
                          className="px-2 py-1.5 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Toggle details */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : order.id)
                    }
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {isExpanded ? "▲ Свернуть" : "▼ Показать товары"}
                  </button>
                </div>

                {/* Expanded items */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50">
                    <div className="space-y-2">
                      {(order.items as OrderItemType[]).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-900 truncate">
                              {item.productName}
                            </p>
                            {item.compositeItems &&
                              item.compositeItems.length > 0 && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Набор: {item.compositeItems.length} позиций
                                </p>
                              )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className="text-sm text-gray-500">
                              {item.quantity} ×{" "}
                              {formatPrice(item.productPrice)}
                            </span>
                            <span className="text-sm font-medium text-gray-900 w-24 text-right">
                              {formatPrice(item.productPrice * item.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-2 mt-2 flex justify-end">
                        <span className="text-sm font-semibold text-gray-900">
                          Итого: {formatPrice(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Назад
          </button>
          <span className="text-sm text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
}
