"use client";

import { useState, useMemo } from "react";
import { CATALOG_BEADS } from "@/data/catalogBeads";
import type { BeadType, BeadShape } from "@/types/bead";

const MATERIAL_LABELS: Record<BeadType, string> = {
  wood: "Дерево",
  silicone: "Силикон",
  knit: "Вязаное",
  plastic: "Пластик",
};

const SHAPE_LABELS: Record<BeadShape, string> = {
  sphere: "Сфера",
  disc: "Диск",
  star: "Звезда",
  heart: "Сердце",
  cylinder: "Цилиндр",
  oblate: "Сплюснутый",
  buckyball: "Фуллерен",
};

const MATERIAL_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "wood", label: "Дерево" },
  { value: "silicone", label: "Силикон" },
  { value: "knit", label: "Вязаное" },
  { value: "plastic", label: "Пластик" },
];

export default function AdminBeadsPage() {
  const [materialFilter, setMaterialFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredBeads = useMemo(() => {
    const searchLower = search.toLowerCase();
    return CATALOG_BEADS.filter(
      (b) =>
        (materialFilter === "all" || b.material === materialFilter) &&
        (searchLower === "" ||
          b.name.toLowerCase().includes(searchLower) ||
          b.nameRu.includes(search))
    );
  }, [materialFilter, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">Бусины</h2>
          <span className="text-sm text-gray-500">
            Всего: {CATALOG_BEADS.length}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={materialFilter}
          onChange={(e) => setMaterialFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {MATERIAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {materialFilter !== "all" || search !== "" ? (
          <button
            onClick={() => {
              setMaterialFilter("all");
              setSearch("");
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Сбросить
          </button>
        ) : null}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-3">
        Показано: {filteredBeads.length}
      </div>

      {/* Table */}
      {filteredBeads.length === 0 ? (
        <div className="text-gray-500 py-8 text-center">
          Нет бусин, соответствующих фильтрам
        </div>
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
                  Название (RU)
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Форма
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Материал
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Размер
                </th>
                <th className="text-left py-3 px-2 font-medium text-gray-600">
                  Цвет
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredBeads.map((bead) => (
                <tr
                  key={bead.id}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-2 px-2 text-gray-500">{bead.id}</td>
                  <td className="py-2 px-2 font-medium text-gray-900">
                    {bead.name}
                  </td>
                  <td className="py-2 px-2 text-gray-600">{bead.nameRu}</td>
                  <td className="py-2 px-2 text-gray-600">
                    {SHAPE_LABELS[bead.shape]}
                  </td>
                  <td className="py-2 px-2 text-gray-600">
                    {MATERIAL_LABELS[bead.material]}
                  </td>
                  <td className="py-2 px-2 text-gray-600">{bead.size}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-5 h-5 rounded-full border border-gray-300 shrink-0"
                        style={{ backgroundColor: bead.color }}
                      />
                      <span className="text-gray-500 font-mono text-xs">
                        {bead.color}
                      </span>
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
