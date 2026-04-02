"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDesignStore } from "@/stores/useDesignStore";
import { decodeDesign } from "@/lib/serialization";
import EditorCanvas from "@/components/editor/EditorCanvas";

function EditorLoader() {
  const searchParams = useSearchParams();
  const designId = searchParams.get("design");
  const loaded = useRef(false);

  useEffect(() => {
    // Prevent double-load in StrictMode
    if (loaded.current) return;
    loaded.current = true;

    if (designId) {
      // Load saved design from API
      fetch(`/api/designs/saved/${designId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load design");
          return res.json();
        })
        .then((data) => {
          const design = decodeDesign(data.designCode);
          if (design?.b && Array.isArray(design.b)) {
            useDesignStore.getState().loadFromCatalogIds(design.b);
          }
        })
        .catch((err) => {
          console.error("Failed to load saved design:", err);
        });
    } else {
      useDesignStore.getState().clearDesign();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <EditorCanvas />;
}

export default function EditorPage() {
  return (
    <Suspense>
      <EditorLoader />
    </Suspense>
  );
}
