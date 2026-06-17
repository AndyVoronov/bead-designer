"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { Product } from "@/types/catalog";
import ProductForm from "../../product-form";

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/products/${params.id}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Товар не найден");
          } else {
            setError("Не удалось загрузить товар");
          }
          return;
        }
        setProduct(await res.json());
      } catch {
        setError("Не удалось загрузить товар");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-md">
        {error}
      </div>
    );
  }

  return <ProductForm product={product} mode="edit" />;
}
