"use client";

import { useEffect, useState, useCallback } from "react";

interface UserSummary {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  telegramChatId: string | null;
  createdAt: string;
  _count: {
    reviews: number;
    orders: number;
    catalogOrders: number;
    favorites: number;
    productFavorites: number;
    designs: number;
  };
  catalogOrderStats: { total: number; count: number };
  accounts: { provider: string; providerId: string }[];
}

interface UserDetail extends UserSummary {
  totalSpent: number;
  reviews: {
    id: number;
    authorName: string;
    rating: number;
    text: string;
    isApproved: boolean;
    createdAt: string;
    product?: { id: number; name: string; slug: string } | null;
  }[];
  catalogOrders: {
    id: number;
    totalAmount: number;
    discount: number;
    status: string;
    contactName: string;
    createdAt: string;
    items: {
      quantity: number;
      price: number;
      product?: { id: number; name: string; slug: string } | null;
    }[];
  }[];
  orders: {
    id: number;
    designCode: string;
    status: string;
    beadCount: number;
    createdAt: string;
  }[];
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  processing: "В обработке",
  shipped: "Отправлен",
  completed: "Выполнен",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  confirmed: "bg-blue-50 text-blue-700",
  processing: "bg-amber-50 text-amber-700",
  shipped: "bg-purple-50 text-purple-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-red-50 text-red-600",
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(async (p: number, s: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (s) params.set("search", s);
    const res = await fetch(`/api/admin/users?${params}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setPage(data.page);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers(1, "");
  }, [fetchUsers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    fetchUsers(1, value);
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setSelectedUser(null);
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) {
      setSelectedUser(await res.json());
    }
    setDetailLoading(false);
  };

  const getProviderBadge = (accounts: { provider: string }[]) => {
    if (accounts.length === 0) return null;
    const providers = accounts.map((a) => a.provider);
    const labels: Record<string, string> = {
      yandex: "Яндекс",
      vk: "VK",
      credentials: "Email",
    };
    return (
      <div className="flex gap-1">
        {providers.map((p) => (
          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
            {labels[p] || p}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Пользователи</h1>
          <p className="text-sm text-gray-400 mt-0.5">Всего {total} зарегистрированных</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Поиск по имени, email, телефону..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-16" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          {search ? "Ничего не найдено" : "Пользователей пока нет"}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Пользователь</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Контакты</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Заказы</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Покупки</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-500">Отзывы</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">Регистрация</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => openDetail(u.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-semibold shrink-0">
                            {(u.name || u.email || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{u.name || "—"}</p>
                            {getProviderBadge(u.accounts)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-600">{u.email || "—"}</div>
                        {u.phone && <div className="text-gray-400 text-xs">{u.phone}</div>}
                        {u.telegramChatId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                            Telegram
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-medium text-gray-900">
                          {u._count.catalogOrders + u._count.orders}
                        </div>
                        <div className="text-xs text-gray-400">
                          {u._count.catalogOrders} каталог · {u._count.orders} 3D
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-gray-900">
                          {u.catalogOrderStats.total > 0
                            ? `${u.catalogOrderStats.total.toLocaleString("ru-RU")} ₽`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-gray-600">{u._count.reviews}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString("ru-RU")}
                      </td>
                      <td className="px-4 py-3">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          className="text-gray-300"
                        >
                          <path d="M9 5l7 7-7 7" />
                        </svg>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => fetchUsers(page - 1, search)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg disabled:opacity-40 cursor-pointer border-none hover:bg-gray-200 transition-colors"
              >
                ←
              </button>
              <span className="text-sm text-gray-500">
                {page} из {totalPages}
              </span>
              <button
                onClick={() => fetchUsers(page + 1, search)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg disabled:opacity-40 cursor-pointer border-none hover:bg-gray-200 transition-colors"
              >
                →
              </button>
            </div>
          )}
        </>
      )}

      {/* User detail modal */}
      {(selectedUser || detailLoading) && (
        <UserDetailModal
          user={selectedUser}
          loading={detailLoading}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

function UserDetailModal({
  user,
  loading,
  onClose,
}: {
  user: UserDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500">Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-lg font-semibold">
              {(user.name || user.email || "?")[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {user.name || "Без имени"}
              </h2>
              <p className="text-sm text-gray-400">
                ID: {user.id} · зарегистрирован {new Date(user.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer border-none bg-transparent"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Contact info */}
          <div className="grid grid-cols-2 gap-4">
            <InfoCard label="Email" value={user.email} />
            <InfoCard label="Телефон" value={user.phone} />
            <InfoCard label="Telegram" value={user.telegramChatId ? `ID: ${user.telegramChatId}` : null} />
            <InfoCard
              label="Способы входа"
              value={user.accounts.map((a) => a.provider).join(", ") || null}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Заказы каталога" value={user._count.catalogOrders} />
            <StatCard label="Заказы 3D" value={user._count.orders} />
            <StatCard label="Отзывы" value={user._count.reviews} />
            <StatCard
              label="Покупки"
              value={user.totalSpent > 0 ? `${Math.round(user.totalSpent).toLocaleString("ru-RU")} ₽` : "—"}
            />
          </div>

          {/* Catalog orders */}
          {user.catalogOrders.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Последние заказы каталога</h3>
              <div className="space-y-2">
                {user.catalogOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-50 rounded-lg p-3 text-sm"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">Заказ #{order.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>{new Date(order.createdAt).toLocaleDateString("ru-RU")}</span>
                      <span>{order.totalAmount.toLocaleString("ru-RU")} ₽</span>
                      {order.discount > 0 && <span className="text-emerald-600">−{order.discount.toLocaleString("ru-RU")} ₽</span>}
                      <span>{order.contactName}</span>
                    </div>
                    {order.items.length > 0 && (
                      <div className="mt-1 text-xs text-gray-400">
                        {order.items.map((item, i) => (
                          <span key={i}>
                            {item.product?.name || "Товар"} ×{item.quantity}
                            {i < order.items.length - 1 && ", "}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3D orders */}
          {user.orders.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Заказы 3D конструктора</h3>
              <div className="space-y-2">
                {user.orders.map((order) => (
                  <div key={order.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{order.designCode}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.beadCount} бусин · {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {user.reviews.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Отзывы</h3>
              <div className="space-y-2">
                {user.reviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill={i < review.rating ? "#f59e0b" : "#e5e7eb"}
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        ))}
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${review.isApproved ? "bg-emerald-50 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                        {review.isApproved ? "Опубликован" : "Ожидает"}
                      </span>
                      {review.product && (
                        <span className="text-xs text-blue-500">{review.product.name}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{review.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {user._count.catalogOrders === 0 &&
            user._count.orders === 0 &&
            user._count.reviews === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Пользователь пока не совершал действий
              </p>
            )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900 font-medium">{value || "—"}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-rose-50 rounded-lg p-3 text-center">
      <p className="text-lg font-semibold text-rose-700">{value}</p>
      <p className="text-[11px] text-rose-400">{label}</p>
    </div>
  );
}
