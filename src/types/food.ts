/**
 * Food Item Interface
 */
export interface FoodItem {
  _id: string;
  name: string;
  description?: string;
  price: number;
  url: string; // API returns 'url' property for food item images
  category: string;
  veg: boolean;
  available: boolean;
  isDraft?: boolean;
  availableWeekDays?: string[];
  portions?: string[];
  portionPrices?: number[];
  customizations?: Customization[];
  isEcoFriendlyContainer?: boolean;
  ecoContainerCharge?: number;
  hasSpiceLevel?: boolean;
  spiceLevel?: string[];
  hasCombo?: boolean;
  sections?: ComboSection[];
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
  };
  portion?: string;
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
