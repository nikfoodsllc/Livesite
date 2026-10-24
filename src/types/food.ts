/**
 * Food Item Interface
 */
export interface FoodItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  url: string; // API returns 'url' property for food item images
  /** More photos of the item (main photo first); only present when there is more than one */
  images?: string[];
  category: string;
  veg: boolean;
  available: boolean;
  /** Chef's Pick (mobile app only) */
  chefsPick?: boolean;
  isDraft?: boolean;
  availableWeekDays?: string[];
  portions?: string[];
  portionPrices?: number[];
  customizations?: Customization[];
  isEcoFriendlyContainer?: boolean;
  ecoContainerCharge?: number;
  hasSpiceLevel?: boolean;
  spiceLevel?: string[];
  /** Combos only: how spice is asked. 'inherit' = for each item that has spice levels, using its own levels; 'combo' = for each such item, using the combo's levels; missing = the older one-level-for-the-combo behaviour */
  spiceMode?: 'inherit' | 'combo';
  hasCombo?: boolean;
  sections?: ComboSection[];
  /** Set when item is FLAT-tagged to a sub-category under a day-wise parent */
  subCategoryId?: string;
  subCategoryName?: string;
  /** All FLAT sub-category tags when an item belongs to multiple sub-categories */
  subCategoryIds?: string[];
  subCategoryNames?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Combo Section Interface
 */
export interface ComboSection {
  _id: string;
  title: string;
  description?: string;
  selectedItems: SelectedComboItem[];
  minSelection: number;
  maxSelection: number;
  isRequired: boolean;
  /** Whether the combo's spice level applies to this section (missing = all but staples/breads) */
  takesSpice?: boolean;
  /** The customer picks this section's spice level separately (see lib/comboSpice.ts) */
  ownSpice?: boolean;
}

/**
 * Selected Combo Item Interface
 */
export interface SelectedComboItem {
  _id: string;
  item: {
    _id: string;
    name: string;
    description?: string;
    price: number;
    veg: boolean;
    url: string;
    /** The item's own spice setup (a combo with a spice mode asks for a level for each picked item that has one) */
    hasSpiceLevel?: boolean;
    spiceLevel?: string[];
  };
  portion?: string;
  /** How many of this item come with one combo (missing = 1) */
  quantity?: number;
  price: number;
  portionId: string;
  isDefault: boolean;
}

/**
 * Food Category Interface
 */
export interface FoodCategory {
  _id: string;
  name: string;
  description?: string;
  imageUrl: string;
  order?: number;
  isActive: boolean;
  listingType?: CategoryListingType;
  dayWiseItems?: CategoryDayWiseItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Customization Option Interface
 */
export interface Customization {
  _id: string;
  name: string;
  options: CustomizationOption[];
  isRequired: boolean;
  maxSelections?: number;
}

/**
 * Customization Option Interface
 */
export interface CustomizationOption {
  _id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

/**
 * Category Listing Type Union
 */
export type CategoryListingType = 'flat' | 'day-wise';

/**
 * Category Day Wise Item Interface
 */
export interface CategoryDayWiseItem {
  day: string;
  items: string[];
}

/**
 * Day Key Type
 */
export type DayKey = string;

/**
 * List Response Interface (for paginated responses)
 */
export interface IListResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
