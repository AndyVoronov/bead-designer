import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token")?.value;
  if (!adminToken) {
    redirect("/admin/login");
  }

  const [
    totalOrders,
    newOrders,
    totalRevenue,
    recentOrders,
    totalProducts,
    activeProducts,
    totalSubscribers,
    totalReviews,
  ] = await Promise.all([
    prisma.catalogOrder.count(),
    prisma.catalogOrder.count({ where: { status: "new" } }),
    prisma.catalogOrder.aggregate({
      _sum: { totalAmount: true },
      where: { status: { not: "cancelled" } },
    }),
    prisma.catalogOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        contactName: true,
        totalAmount: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.product.count(),
    prisma.product.count({ where: { status: "active" } }),
    prisma.subscriber.count({ where: { isActive: true } }),
    prisma.review.count(),
  ]);

  const revenue = totalRevenue._sum.totalAmount ?? 0;

  const statusColors: Record<string, string> = {
    new: "bg-blue-50 text-blue-700 ring-blue-600/20",
    confirmed: "bg-amber-50 text-amber-700 ring-amber-600/20",
    processing: "bg-orange-50 text-orange-700 ring-orange-600/20",
    shipped: "bg-purple-50 text-purple-700 ring-purple-600/20",
    completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    cancelled: "bg-gray-50 text-gray-600 ring-gray-500/20",
  };

  const statusLabels: Record<string, string> = {
    new: "Новый",
    confirmed: "Подтверждён",
    processing: "В работе",
    shipped: "Отправлен",
    completed: "Выполнен",
    cancelled: "Отменён",
  };

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-sm text-gray-500 mt-1">Обзор магазина</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Заказы" value={String(totalOrders)} hint={newOrders > 0 ? `${newOrders} новых` : undefined} hintColor="text-blue-600" />
        <StatCard label="Выручка" value={`${Math.round(revenue).toLocaleString("ru-RU")} \u20BD`} />
        <StatCard label="Товары" value={`${activeProducts}`} hint={`из ${totalProducts}`} />
        <StatCard label="Подписчики" value={String(totalSubscribers)} />
        <StatCard label="Отзывы" value={String(totalReviews)} />
        <Link href="/admin/promo-codes" className="group">
          <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-rose-200 hover:shadow-sm transition-all h-full">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Промокоды</p>
            <p className="text-sm text-gray-500 group-hover:text-rose-600 transition-colors">Управление</p>
          </div>
        </Link>
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Последние заказы</h2>
          <Link
            href="/admin/catalog-orders"
            className="text-sm text-rose-600 hover:text-rose-700 font-medium"
          >
            Все заказы
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400 p-5 text-center">Заказов пока нет</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-900">#{order.id}</span>
                  <span className="text-sm text-gray-500">{order.contactName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {order.totalAmount.toLocaleString("ru-RU")} &#8381;
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ring-1 ring-inset ${statusColors[order.status] ?? "bg-gray-50 text-gray-500 ring-gray-500/20"}`}>
                    {statusLabels[order.status] ?? order.status}
                  </span>
                  <span className="text-xs text-gray-400 w-20 text-right tabular-nums">
                    {order.createdAt.toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, hintColor }: { label: string; value: string; hint?: string; hintColor?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      {hint && (
        <p className={`text-xs mt-1 ${hintColor ?? "text-gray-400"}`}>{hint}</p>
      )}
    </div>
  );
}
