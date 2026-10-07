import { Document, ObjectId as MongoObjectId } from 'mongodb';
import { db } from '@/lib/server/db';
import { populateComboSections } from '@/lib/server/menu/comboSections';
import { getPSTDateString } from '@/lib/timezone';
import { getAvailableDatesFromDatabase, generateAvailableDateOptions } from '@/lib/server/availableDates';
import type { FoodItem } from '@/types/food';

/**
 * The whole menu for the admin's Create Order screen. Unlike the customer menu it is not limited to what is open for
 * ordering: every published category, every item (also the ones hidden on the site) and the day-wise items of ANY date
 * are included, so the admin can enter an order for a day that has already closed, or for any date at all.
 */

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

interface Mapping {
  categoryId?: { toString(): string };
  foodItemId?: { toString(): string };
  mappingType?: 'FLAT' | 'DAY_WISE';
  day?: string;
  sequence?: number;
}

export interface CatalogCategory {
  _id: string;
  name: string;
  listingType: 'flat' | 'day-wise';
  /** Items listed in this category with no date (flat listing), in menu order */
  flatItemIds: string[];
  /** Every item listed in this category on any date, plus the flat ones (for the All menu view) */
  allItemIds: string[];
  /** Items per date for a day-wise category: { '2026-10-09': [ids] } */
  dayWise: Record<string, string[]>;
  children: CatalogCategory[];
}

export interface CatalogDate {
  date: string;
  formattedDate: string;
  /** open = customers can still order; closed = cutoff passed; past = before today; unscheduled = no availability record */
  state: 'open' | 'closed' | 'past' | 'unscheduled';
  flatCategoryEnabled: boolean;
  dayWiseCategoryEnabled: boolean;
  hasDayWiseMenu: boolean;
}

export interface OfflineCatalog {
  items: Record<string, Record<string, unknown>>;
  categories: CatalogCategory[];
  dates: CatalogDate[];
  today: string;
}

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });

/** One food item in the shape the customer site uses (what pricing and the order record expect). */
async function shapeItem(foodItem: Document, foodById: Map<string, Document>): Promise<Record<string, unknown>> {
  let sections: Array<Record<string, unknown>> = [];
  if (foodItem.hasCombo && foodItem.sections && foodItem.sections.length > 0) {
    sections = await populateComboSections(foodItem.sections, foodById);
  }
  return {
    _id: foodItem._id.toString(),
    name: foodItem.name,
    description: foodItem.description || '',
    short_description: foodItem.short_description || '',
    price: foodItem.price,
    veg: foodItem.veg,
    available: foodItem.available,
    url: foodItem.url || foodItem.imageUrl || '',
    public_id: foodItem.public_id || '',
    isEcoFriendlyContainer: foodItem.isEcoFriendlyContainer || false,
    hasSpiceLevel: foodItem.hasSpiceLevel || false,
    hasCombo: foodItem.hasCombo || false,
    portions: foodItem.portions || [],
    portionPrices: foodItem.portionPrices || [],
    spiceLevel: foodItem.spiceLevel || [],
    ecoContainerCharge: foodItem.ecoContainerCharge || 0,
    itemType: foodItem.itemType || 'single',
    availableWeekDays: [],
    days: [],
    comboItems: foodItem.comboItems || [],
    sections: sections.length > 0 ? sections : foodItem.sections || [],
    subCategoryId: undefined,
    subCategoryName: undefined,
    subCategoryIds: [],
    subCategoryNames: [],
  };
}

/** The items an order is made of, by id, ready for pricing. Combo parts are looked up too. Missing ids are left out. */
export async function loadItemsForOrder(ids: string[]): Promise<Map<string, FoodItem>> {
  const valid = [...new Set(ids)].filter((id) => MongoObjectId.isValid(id));
  const out = new Map<string, FoodItem>();
  if (valid.length === 0) return out;

  const result = await db.read('fooditems', { _id: { $in: valid.map((id) => new MongoObjectId(id)) }, isDraft: { $ne: true } });
  const docs = result.success && result.data ? (result.data as Document[]) : [];

  const partIds = new Set<string>();
  for (const doc of docs) {
    if (!doc.hasCombo) continue;
    for (const section of doc.sections ?? []) {
      for (const selected of section.selectedItems ?? []) {
        const id = selected?.item?.toString?.();
        if (id && MongoObjectId.isValid(id)) partIds.add(id);
      }
    }
  }
  const foodById = new Map<string, Document>(docs.map((d) => [d._id.toString(), d]));
  const missingParts = [...partIds].filter((id) => !foodById.has(id));
  if (missingParts.length > 0) {
    const parts = await db.read('fooditems', { _id: { $in: missingParts.map((id) => new MongoObjectId(id)) } });
    if (parts.success && parts.data) for (const p of parts.data as Document[]) foodById.set(p._id.toString(), p);
  }

  for (const doc of docs) out.set(doc._id.toString(), (await shapeItem(doc, foodById)) as unknown as FoodItem);
  return out;
}

export async function buildOfflineCatalog(): Promise<OfflineCatalog> {
  const today = getPSTDateString();
  const [catResult, mapResult, itemResult] = await Promise.all([
    db.read('foodcategories', { isDraft: { $ne: true } }, { sort: { sequence: 1 } }),
    db.read('categoryfoodmapping', {}, { sort: { sequence: 1 } }),
    db.read('fooditems', { isDraft: { $ne: true } }, { sort: { sequence: 1 } }),
  ]);
  const categoryDocs = (catResult.success && catResult.data ? catResult.data : []) as Document[];
  const mappings = (mapResult.success && mapResult.data ? mapResult.data : []) as Mapping[];
  const foodDocs = (itemResult.success && itemResult.data ? itemResult.data : []) as Document[];

  const foodById = new Map<string, Document>(foodDocs.map((d) => [d._id.toString(), d]));

  // categories as a tree (parents, then their sub-categories)
  const byId = new Map<string, CatalogCategory>();
  for (const c of categoryDocs) {
    byId.set(c._id.toString(), {
      _id: c._id.toString(),
      name: c.name,
      listingType: (c.listingType || 'flat') as 'flat' | 'day-wise',
      flatItemIds: [],
      allItemIds: [],
      dayWise: {},
      children: [],
    });
  }
  const roots: CatalogCategory[] = [];
  for (const c of categoryDocs) {
    const node = byId.get(c._id.toString())!;
    const parent = c.parentCategoryId ? byId.get(c.parentCategoryId.toString()) : undefined;
    if (parent) parent.children.push(node);
    else if (!c.parentCategoryId) roots.push(node);
  }

  // which items belong where
  const usedItemIds = new Set<string>();
  const dayWiseDates = new Set<string>();
  for (const m of mappings) {
    const categoryId = m.categoryId?.toString?.();
    const itemId = m.foodItemId?.toString?.();
    const node = categoryId ? byId.get(categoryId) : undefined;
    if (!node || !itemId || !foodById.has(itemId)) continue;
    if (m.mappingType === 'DAY_WISE') {
      if (!m.day || !DATE_REGEX.test(m.day)) continue;
      const list = (node.dayWise[m.day] ??= []);
      if (!list.includes(itemId)) list.push(itemId);
      dayWiseDates.add(m.day);
    } else if (!node.flatItemIds.includes(itemId)) {
      node.flatItemIds.push(itemId);
    }
    if (!node.allItemIds.includes(itemId)) node.allItemIds.push(itemId);
    usedItemIds.add(itemId);
  }

  // only the items that appear somewhere in the menu (plus no orphans), shaped for pricing and display
  const items: Record<string, Record<string, unknown>> = {};
  for (const id of usedItemIds) items[id] = await shapeItem(foodById.get(id)!, foodById);

  // the days the admin can pick: every day with availability settings or a day-wise menu, from a week ago on
  const from = new Date(`${today}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 7);
  const start = from.toISOString().slice(0, 10);
  const end = new Date(`${today}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 90);
  const docs = await getAvailableDatesFromDatabase(start, end.toISOString().slice(0, 10), true);
  const options = generateAvailableDateOptions(docs, true);
  const dates = new Map<string, CatalogDate>();
  for (const o of options) {
    dates.set(o.date, {
      date: o.date,
      formattedDate: formatDate(o.date),
      state: o.isPast ? 'past' : o.isPastCutoff ? 'closed' : 'open',
      flatCategoryEnabled: o.flatCategoryEnabled,
      dayWiseCategoryEnabled: o.dayWiseCategoryEnabled,
      hasDayWiseMenu: dayWiseDates.has(o.date),
    });
  }
  for (const date of dayWiseDates) {
    if (date < start || date > end.toISOString().slice(0, 10) || dates.has(date)) continue;
    dates.set(date, { date, formattedDate: formatDate(date), state: date < today ? 'past' : 'unscheduled', flatCategoryEnabled: false, dayWiseCategoryEnabled: false, hasDayWiseMenu: true });
  }

  return { items, categories: roots, dates: [...dates.values()].sort((a, b) => a.date.localeCompare(b.date)), today };
}
