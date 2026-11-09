// User-approved editor navigation, 2026-11-09. Keep existing document IDs:
// a packaging change must not orphan saved text, screenshots or incoming links.
export const SHOP_CATALOG_DRAFT = [
  ["road-diner", "咖啡早餐店"],
  ["gas-station", "加油站"],
  ["convenience-store", "便利店"],
  ["road-laundry", "游泳池"],
  ["photo-studio", "写真馆"],
  ["pet-care", "宠物洗护"],
  ["auto-repair", "花店"],
  ["car-wash", "洗车行"],
  ["music-bar", "音乐酒吧"],
  ["massage-clinic", "越野卡丁乐园"],
  ["bowling", "保龄球馆"],
  ["drive-in", "汽车影院"],
];

export function applyShopCatalogDraft(catalog, mode) {
  if (mode !== "edit") return;
  const group = catalog.groups.find(entry => entry.id === "shops");
  if (!group) return;
  const entries = new Map(group.items.map(entry => [entry.id, entry]));
  const knownIds = new Set(SHOP_CATALOG_DRAFT.map(([id]) => id));
  group.items = [
    ...SHOP_CATALOG_DRAFT.flatMap(([id, title]) => {
      const entry = entries.get(id);
      return entry ? [{ ...entry, title }] : [];
    }),
    ...group.items.filter(entry => !knownIds.has(entry.id)),
  ];
}
