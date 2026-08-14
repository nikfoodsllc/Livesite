import { Document, ObjectId as MongoObjectId } from 'mongodb';
import { db } from '@/lib/server/db';

interface ComboSection {
  selectedItems?: Array<{
    item: { toString(): string };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

function fallbackComboItem(itemId: string, name: string, description: string) {
  return {
    _id: itemId,
    name,
    description,
    price: 0,
    veg: false,
    url: '',
  };
}

async function resolveComboItem(
  itemId: string,
  itemIdx: number,
  foodById: Map<string, Document>
): Promise<Record<string, unknown>> {
  if (!itemId || itemId.trim() === '') {
    return fallbackComboItem('unknown', 'Invalid Item ID', 'Item ID is missing or invalid');
  }

  if (!MongoObjectId.isValid(itemId)) {
    return fallbackComboItem(itemId, 'Invalid Item ID', `Invalid ObjectId format: ${itemId}`);
  }

  const cached = foodById.get(itemId);
  if (cached) {
    return {
      _id: itemId,
      name: cached.name || 'Unknown Item',
      description: cached.description || '',
      price: cached.price || 0,
      veg: cached.veg || false,
      url: cached.url || cached.imageUrl || '',
    };
  }

  try {
    const itemResult = await db.readOne('fooditems', {
      _id: new MongoObjectId(itemId),
    });

    if (!itemResult.success || !itemResult.data) {
      return fallbackComboItem(
        itemId,
        'Item Not Available',
        `Item with ID ${itemId} is not available or has been removed`
      );
    }

    const itemData = itemResult.data;
    return {
      _id: itemId,
      name: itemData.name || 'Unknown Item',
      description: itemData.description || '',
      price: itemData.price || 0,
      veg: itemData.veg || false,
      url: itemData.url || itemData.imageUrl || '',
    };
  } catch {
    return fallbackComboItem(itemId, 'Error Loading Item', 'Failed to load combo item');
  }
}

export async function populateComboSections(
  sections: ComboSection[],
  foodById: Map<string, Document>,
  sectionIndexStart: number = 0
): Promise<Array<Record<string, unknown>>> {
  if (!sections || sections.length === 0) {
    return [];
  }

  return Promise.all(
    sections.map(async (section, sectionIdx) => {
      const sectionTitle = typeof section.title === 'string' ? section.title : 'section';
      const sectionId =
        section._id ||
        `section-${sectionIndexStart + sectionIdx}-${sectionTitle.replace(/\s+/g, '-')}`;

      if (!section.selectedItems || section.selectedItems.length === 0) {
        return { ...section, _id: sectionId, selectedItems: [] };
      }

      const populatedItems = await Promise.all(
        section.selectedItems.map(async (selectedItem, itemIdx) => {
          const itemId = selectedItem.item?.toString() || 'unknown';
          const item = await resolveComboItem(itemId, itemIdx, foodById);
          return {
            ...selectedItem,
            _id: selectedItem._id || `item-${itemIdx}-${String(item.name).replace(/\s+/g, '-')}`,
            item,
          };
        })
      );

      return { ...section, _id: sectionId, selectedItems: populatedItems };
    })
  );
}
