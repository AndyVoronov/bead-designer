import type { CatalogBead } from "@/types/bead";

/**
 * Static catalog of ~100 beads spanning 4 material families.
 *
 * Distribution:
 *  - cb-001..cb-025 : wood   (natural browns, tans, light/dark)
 *  - cb-026..cb-050 : silicone (pastels: pink, blue, mint, lavender, coral)
 *  - cb-051..cb-075 : knit   (warm muted: cream, terracotta, sage, dusty rose, oatmeal)
 *  - cb-076..cb-100 : plastic (vibrant: red, blue, yellow, green, orange, purple)
 */
export const CATALOG_BEADS: CatalogBead[] = [
  // ── Wood (cb-001 .. cb-025) ─────────────────────────────────────────────
  { id: "cb-001", name: "Birch",          nameRu: "Берёза",             shape: "sphere",  size: 0.20, material: "wood", color: "#F5DEB3" },
  { id: "cb-002", name: "Oak",            nameRu: "Дуб",                shape: "sphere",  size: 0.22, material: "wood", color: "#8B6914" },
  { id: "cb-003", name: "Pine",           nameRu: "Сосна",              shape: "sphere",  size: 0.18, material: "wood", color: "#DEB887" },
  { id: "cb-004", name: "Walnut",         nameRu: "Орех",               shape: "sphere",  size: 0.24, material: "wood", color: "#5C4033" },
  { id: "cb-005", name: "Maple",          nameRu: "Клён",               shape: "disc",    size: 0.16, material: "wood", color: "#C4A882" },
  { id: "cb-006", name: "Cherry",         nameRu: "Вишня",              shape: "sphere",  size: 0.20, material: "wood", color: "#9B111E" },
  { id: "cb-007", name: "Ash",            nameRu: "Ясень",              shape: "cylinder", size: 0.18, material: "wood", color: "#C0C0C0" },
  { id: "cb-008", name: "Beech",          nameRu: "Бук",                shape: "sphere",  size: 0.21, material: "wood", color: "#C4A882" },
  { id: "cb-009", name: "Birch Disc",     nameRu: "Берёзовый диск",     shape: "disc",    size: 0.15, material: "wood", color: "#FFF8DC" },
  { id: "cb-010", name: "Dark Walnut",    nameRu: "Тёмный орех",        shape: "sphere",  size: 0.26, material: "wood", color: "#3E2723" },
  { id: "cb-011", name: "Cedar",          nameRu: "Кедр",               shape: "sphere",  size: 0.19, material: "wood", color: "#A0522D" },
  { id: "cb-012", name: "Linden",         nameRu: "Липа",               shape: "sphere",  size: 0.17, material: "wood", color: "#FAEBD7" },
  { id: "cb-013", name: "Teak",           nameRu: "Тик",                shape: "cylinder", size: 0.22, material: "wood", color: "#8B7355" },
  { id: "cb-014", name: "Bamboo",         nameRu: "Бамбук",             shape: "cylinder", size: 0.16, material: "wood", color: "#E8D5A3" },
  { id: "cb-015", name: "Ebony",          nameRu: "Эбеновое дерево",    shape: "sphere",  size: 0.20, material: "wood", color: "#2C1810" },
  { id: "cb-016", name: "Apple Wood",     nameRu: "Яблоня",             shape: "sphere",  size: 0.18, material: "wood", color: "#D4A76A" },
  { id: "cb-017", name: "Pear Wood",      nameRu: "Груша",              shape: "disc",    size: 0.17, material: "wood", color: "#C9A96E" },
  { id: "cb-018", name: "Mahogany",       nameRu: "Махагони",           shape: "sphere",  size: 0.24, material: "wood", color: "#6B3A2A" },
  { id: "cb-019", name: "Olive Wood",     nameRu: "Маслина",            shape: "sphere",  size: 0.19, material: "wood", color: "#816B4A" },
  { id: "cb-020", name: "Birch Star",     nameRu: "Берёзовая звезда",   shape: "star",    size: 0.20, material: "wood", color: "#F5DEB3" },
  { id: "cb-021", name: "Alder",          nameRu: "Ольха",              shape: "sphere",  size: 0.18, material: "wood", color: "#B0722A" },
  { id: "cb-022", name: "Larch",          nameRu: "Лиственница",        shape: "sphere",  size: 0.23, material: "wood", color: "#A67B5B" },
  { id: "cb-023", name: "Rowan",          nameRu: "Рябина",             shape: "heart",   size: 0.18, material: "wood", color: "#C25030" },
  { id: "cb-024", name: "Elm Disc",       nameRu: "Вязовый диск",       shape: "disc",    size: 0.16, material: "wood", color: "#A68A64" },
  { id: "cb-025", name: "Sand Wood",      nameRu: "Песочное дерево",    shape: "sphere",  size: 0.21, material: "wood", color: "#C2B280" },

  // ── Silicone (cb-026 .. cb-050) ──────────────────────────────────────────
  { id: "cb-026", name: "Pink Cloud",     nameRu: "Розовое облако",     shape: "sphere",  size: 0.20, material: "silicone", color: "#FFB6C1" },
  { id: "cb-027", name: "Sky Blue",       nameRu: "Небесный голубой",   shape: "sphere",  size: 0.22, material: "silicone", color: "#87CEEB" },
  { id: "cb-028", name: "Mint Dream",     nameRu: "Мятная мечта",       shape: "sphere",  size: 0.18, material: "silicone", color: "#98FF98" },
  { id: "cb-029", name: "Lavender",       nameRu: "Лаванда",            shape: "sphere",  size: 0.20, material: "silicone", color: "#E6E6FA" },
  { id: "cb-030", name: "Coral Reef",     nameRu: "Коралловый риф",     shape: "sphere",  size: 0.21, material: "silicone", color: "#FF7F7F" },
  { id: "cb-031", name: "Peach Sorbet",   nameRu: "Персиковый сорбет",  shape: "disc",    size: 0.16, material: "silicone", color: "#FFDAB9" },
  { id: "cb-032", name: "Baby Pink",      nameRu: "Детская роза",       shape: "sphere",  size: 0.19, material: "silicone", color: "#F4A7BB" },
  { id: "cb-033", name: "Powder Blue",    nameRu: "Пудровый голубой",   shape: "sphere",  size: 0.20, material: "silicone", color: "#B0E0E6" },
  { id: "cb-034", name: "Seafoam",        nameRu: "Морская пена",       shape: "sphere",  size: 0.22, material: "silicone", color: "#96D9C5" },
  { id: "cb-035", name: "Lilac",          nameRu: "Сирень",             shape: "cylinder", size: 0.18, material: "silicone", color: "#C8A2C8" },
  { id: "cb-036", name: "Rose Quartz",    nameRu: "Розовый кварц",      shape: "heart",   size: 0.20, material: "silicone", color: "#F7CAC9" },
  { id: "cb-037", name: "Ice Blue",       nameRu: "Ледяной голубой",    shape: "sphere",  size: 0.17, material: "silicone", color: "#D6ECEF" },
  { id: "cb-038", name: "Blush",          nameRu: "Румянец",            shape: "sphere",  size: 0.21, material: "silicone", color: "#DE5D83" },
  { id: "cb-039", name: "Sage Green",     nameRu: "Шалфей",             shape: "disc",    size: 0.15, material: "silicone", color: "#BCB88A" },
  { id: "cb-040", name: "Apricot",        nameRu: "Абрикос",            shape: "sphere",  size: 0.19, material: "silicone", color: "#FBCEB1" },
  { id: "cb-041", name: "Soft Violet",    nameRu: "Мягкая фиалка",      shape: "sphere",  size: 0.20, material: "silicone", color: "#C9A0DC" },
  { id: "cb-042", name: "Bubblegum",      nameRu: "Жвачка",             shape: "sphere",  size: 0.22, material: "silicone", color: "#FF69B4" },
  { id: "cb-043", name: "Pale Mint",      nameRu: "Бледная мята",       shape: "cylinder", size: 0.18, material: "silicone", color: "#C7F9CC" },
  { id: "cb-044", name: "Sunset Pink",    nameRu: "Розовый закат",      shape: "star",    size: 0.20, material: "silicone", color: "#FF6B6B" },
  { id: "cb-045", name: "Dusty Rose",     nameRu: "Сухая роза",         shape: "sphere",  size: 0.19, material: "silicone", color: "#DCAE96" },
  { id: "cb-046", name: "Aqua Dream",     nameRu: "Аквамарин",          shape: "sphere",  size: 0.21, material: "silicone", color: "#7FDBFF" },
  { id: "cb-047", name: "Mauve",          nameRu: "Мавен",              shape: "disc",    size: 0.17, material: "silicone", color: "#E0B0FF" },
  { id: "cb-048", name: "Salmon",         nameRu: "Лосось",             shape: "sphere",  size: 0.20, material: "silicone", color: "#FA8072" },
  { id: "cb-049", name: "Chamomile",      nameRu: "Ромашка",            shape: "sphere",  size: 0.18, material: "silicone", color: "#F5F5DC" },
  { id: "cb-050", name: "Thistle",        nameRu: "Чертополох",         shape: "heart",   size: 0.19, material: "silicone", color: "#D8BFD8" },

  // ── Knit (cb-051 .. cb-075) ─────────────────────────────────────────────
  { id: "cb-051", name: "Cream Puff",     nameRu: "Сливочный пудинг",    shape: "sphere",  size: 0.22, material: "knit", color: "#FDF5E6" },
  { id: "cb-052", name: "Terracotta",     nameRu: "Терракота",           shape: "sphere",  size: 0.20, material: "knit", color: "#E2725B" },
  { id: "cb-053", name: "Sage",           nameRu: "Шалфейный",           shape: "sphere",  size: 0.19, material: "knit", color: "#9DC183" },
  { id: "cb-054", name: "Dusty Rose",     nameRu: "Пыльная роза",       shape: "disc",    size: 0.17, material: "knit", color: "#DCAE96" },
  { id: "cb-055", name: "Oatmeal",        nameRu: "Овсянка",            shape: "sphere",  size: 0.24, material: "knit", color: "#D4C5A9" },
  { id: "cb-056", name: "Warm Gray",      nameRu: "Тёплый серый",        shape: "sphere",  size: 0.20, material: "knit", color: "#A9A9A9" },
  { id: "cb-057", name: "Moss",           nameRu: "Мох",                shape: "sphere",  size: 0.21, material: "knit", color: "#8A9A5B" },
  { id: "cb-058", name: "Clay",           nameRu: "Глина",              shape: "cylinder", size: 0.18, material: "knit", color: "#B66A50" },
  { id: "cb-059", name: "Linen",          nameRu: "Лён",                shape: "sphere",  size: 0.19, material: "knit", color: "#FAF0E6" },
  { id: "cb-060", name: "Dune",           nameRu: "Дюна",               shape: "sphere",  size: 0.22, material: "knit", color: "#D2B48C" },
  { id: "cb-061", name: "Rustic Red",     nameRu: "Ржавчина",           shape: "heart",   size: 0.20, material: "knit", color: "#B7410E" },
  { id: "cb-062", name: "Olive Knit",     nameRu: "Оливковый трикотаж", shape: "sphere",  size: 0.21, material: "knit", color: "#808000" },
  { id: "cb-063", name: "Milk",           nameRu: "Молоко",             shape: "sphere",  size: 0.18, material: "knit", color: "#FEFEFE" },
  { id: "cb-064", name: "Camel",          nameRu: "Верблюд",            shape: "disc",    size: 0.16, material: "knit", color: "#C19A6B" },
  { id: "cb-065", name: "Mocha",          nameRu: "Мокко",              shape: "sphere",  size: 0.20, material: "knit", color: "#967969" },
  { id: "cb-066", name: "Ivory",          nameRu: "Слоновая кость",     shape: "sphere",  size: 0.19, material: "knit", color: "#FFFFF0" },
  { id: "cb-067", name: "Rosemary",       nameRu: "Розмарин",           shape: "star",    size: 0.20, material: "knit", color: "#7B9F6B" },
  { id: "cb-068", name: "Sand Dollar",    nameRu: "Песчаный доллар",    shape: "disc",    size: 0.15, material: "knit", color: "#DEC4B0" },
  { id: "cb-069", name: "Cinnamon",       nameRu: "Корица",             shape: "sphere",  size: 0.21, material: "knit", color: "#D2691E" },
  { id: "cb-070", name: "Flax",           nameRu: "Лён-мак",            shape: "cylinder", size: 0.18, material: "knit", color: "#EEDC82" },
  { id: "cb-071", name: "Pewter",         nameRu: "Олово",              shape: "sphere",  size: 0.20, material: "knit", color: "#8E8E8E" },
  { id: "cb-072", name: "Buttercream",    nameRu: "Сливочный крем",     shape: "sphere",  size: 0.23, material: "knit", color: "#FFFDD0" },
  { id: "cb-073", name: "Plum Knit",      nameRu: "Сливовый трикотаж",  shape: "sphere",  size: 0.20, material: "knit", color: "#8E4585" },
  { id: "cb-074", name: "Fawn",           nameRu: "Оленёнок",            shape: "sphere",  size: 0.19, material: "knit", color: "#E5AA70" },
  { id: "cb-075", name: "Charcoal Knit",  nameRu: "Угольный трикотаж",  shape: "sphere",  size: 0.22, material: "knit", color: "#36454F" },

  // ── Plastic (cb-076 .. cb-100) ──────────────────────────────────────────
  { id: "cb-076", name: "Cherry Red",     nameRu: "Вишнёвый",           shape: "sphere",  size: 0.20, material: "plastic", color: "#DC143C" },
  { id: "cb-077", name: "Royal Blue",     nameRu: "Королевский синий",  shape: "sphere",  size: 0.22, material: "plastic", color: "#4169E1" },
  { id: "cb-078", name: "Sunflower",      nameRu: "Подсолнух",          shape: "sphere",  size: 0.18, material: "plastic", color: "#FFD700" },
  { id: "cb-079", name: "Emerald",        nameRu: "Изумруд",            shape: "sphere",  size: 0.20, material: "plastic", color: "#50C878" },
  { id: "cb-080", name: "Tangerine",      nameRu: "Мандарин",           shape: "sphere",  size: 0.19, material: "plastic", color: "#FF9966" },
  { id: "cb-081", name: "Amethyst",       nameRu: "Аметист",            shape: "sphere",  size: 0.21, material: "plastic", color: "#9966CC" },
  { id: "cb-082", name: "Hot Pink",       nameRu: "Яркая роза",         shape: "star",    size: 0.20, material: "plastic", color: "#FF1493" },
  { id: "cb-083", name: "Electric Blue",  nameRu: "Электро-синий",      shape: "sphere",  size: 0.22, material: "plastic", color: "#7DF9FF" },
  { id: "cb-084", name: "Lime",           nameRu: "Лайм",               shape: "sphere",  size: 0.18, material: "plastic", color: "#32CD32" },
  { id: "cb-085", name: "Coral Red",      nameRu: "Коралловый красный", shape: "disc",    size: 0.16, material: "plastic", color: "#FF4040" },
  { id: "cb-086", name: "Turquoise",      nameRu: "Бирюза",             shape: "sphere",  size: 0.20, material: "plastic", color: "#30D5C8" },
  { id: "cb-087", name: "Magenta",        nameRu: "Пурпурный",          shape: "sphere",  size: 0.21, material: "plastic", color: "#FF00FF" },
  { id: "cb-088", name: "Sunset Orange",  nameRu: "Оранжевый закат",    shape: "heart",   size: 0.20, material: "plastic", color: "#FF6037" },
  { id: "cb-089", name: "Ocean Blue",     nameRu: "Океанский синий",    shape: "sphere",  size: 0.24, material: "plastic", color: "#006994" },
  { id: "cb-090", name: "Lemon Drop",     nameRu: "Лимонная капля",     shape: "sphere",  size: 0.17, material: "plastic", color: "#FFF44F" },
  { id: "cb-091", name: "Ruby",           nameRu: "Рубин",              shape: "disc",    size: 0.16, material: "plastic", color: "#E0115F" },
  { id: "cb-092", name: "Teal",           nameRu: "Бирюзовый",          shape: "cylinder", size: 0.18, material: "plastic", color: "#008080" },
  { id: "cb-093", name: "Grape",          nameRu: "Виноград",           shape: "sphere",  size: 0.20, material: "plastic", color: "#6F2DA8" },
  { id: "cb-094", name: "Fire Engine",    nameRu: "Пожарная машина",    shape: "sphere",  size: 0.22, material: "plastic", color: "#CE2029" },
  { id: "cb-095", name: "Sapphire",       nameRu: "Сапфир",             shape: "sphere",  size: 0.19, material: "plastic", color: "#0F52BA" },
  { id: "cb-096", name: "Chartreuse",     nameRu: "Шартрёз",            shape: "star",    size: 0.20, material: "plastic", color: "#7FFF00" },
  { id: "cb-097", name: "Fuchsia",        nameRu: "Фуксия",             shape: "sphere",  size: 0.21, material: "plastic", color: "#FF77FF" },
  { id: "cb-098", name: "Cobalt",         nameRu: "Кобальт",            shape: "cylinder", size: 0.19, material: "plastic", color: "#0047AB" },
  { id: "cb-099", name: "Copper",         nameRu: "Медь",               shape: "sphere",  size: 0.20, material: "plastic", color: "#B87333" },
  { id: "cb-100", name: "Neon Green",     nameRu: "Неоновый зелёный",   shape: "sphere",  size: 0.18, material: "plastic", color: "#39FF14" },
];

/** Lookup a catalog bead by its id. Returns undefined if not found. */
export function getCatalogBead(id: string): CatalogBead | undefined {
  return CATALOG_BEADS.find((b) => b.id === id);
}
