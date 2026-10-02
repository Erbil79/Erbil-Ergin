export type SoleSize = 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45;

export const ALL_SIZES: SoleSize[] = [36, 37, 38, 39, 40, 41, 42, 43, 44, 45];

export type MaterialUnit = 'adet' | 'cift' | 'metre' | 'm2' | 'litre' | 'kg' | 'gram';

export type MaterialCategory =
  | 'taban' // Sole (Sizes 36-45)
  | 'saya' // Upper material (leather, fabric, felt, PU)
  | 'astar' // Lining
  | 'toka' // Buckles, ornaments
  | 'yapistirici' // Adhesives & chemicals
  | 'iplik' // Threads
  | 'ped' // Insole cushions
  | 'ambalaj'; // Boxes, hangtags, cartons

export interface SoleSizeStock {
  size: SoleSize;
  stock: number;
  minThreshold: number;
}

export interface RawMaterial {
  id: string;
  code: string;
  name: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  unitPrice: number; // Cost in TRY
  currency: 'TRY' | 'USD' | 'EUR';
  supplierId: string;
  supplierName: string;
  currentStock: number; // For non-sole materials or total
  minStockLevel: number;
  colors: string[]; // e.g. ["Siyah", "Beyaz", "Taba", "Haki"]
  imageUrl?: string;
  isSoleFamily?: boolean; // If true, tracks 36-45 individual stock
  soleStocks?: Record<SoleSize, number>;
  soleMinStocks?: Record<SoleSize, number>;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  leadTimeDays: number; // Delivery time
  rating: number;
  suppliedCategories: MaterialCategory[];
}

export interface RecipeMaterialItem {
  materialId: string;
  materialName: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  quantityPerPair: number; // Amount needed for 1 pair of slippers
  unitCost: number;
  scrapPercentage: number; // Fire payı % (e.g. 5 for 5%)
  colorVariant?: string;
  isSole?: boolean; // Uses 1 pair of size-matched sole
  notes?: string;
}

export interface RecipeExpense {
  id: string;
  name: string;
  type: 'iscilik' | 'enerji' | 'kalip_amortisman' | 'ambalaj' | 'genel_gider';
  costPerPair: number;
}

export interface TrendyolPricingConfig {
  enabled: boolean;
  commissionRate: number; // e.g. 21 (%)
  shippingCost: number; // e.g. 55 (TL)
  serviceFee: number; // e.g. 8.5 (TL)
  returnReserveRate: number; // e.g. 5 (%)
  targetNetProfit: number; // e.g. 60 (TL)
  minBreakevenPrice: number; // En düşük zararsız satış fiyatı (TL)
  recommendedSalePrice: number; // Hedef kar ile Trendyol satış fiyatı (TL)
}

export interface SlipperRecipe {
  id: string;
  code: string;
  name: string;
  category: 'Anatomik' | 'Eva Havuz' | 'Peluş Ev' | 'Sabo Ortopedik' | 'Plaj / Parmak Arası' | 'Deri Günlük' | 'Diğer';
  description: string;
  imageUrl?: string;
  colors: string[];
  materials: RecipeMaterialItem[];
  expenses: RecipeExpense[];
  soleMaterialId?: string; // Links to the sole raw material
  targetWholesalePrice: number; // Recommended selling price in TRY
  targetRetailPrice?: number;
  manualGrossProfitPerPair?: number; // User-defined manual gross profit per pair in TRY
  targetProfitMarginPercent: number; // Calculated or set
  trendyolPricing?: TrendyolPricingConfig; // Trendyol Marketplace pricing simulation
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SizeQuantityMap = Record<SoleSize, number>;

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  recipeId: string;
  recipeName: string;
  recipeCode: string;
  modelImageUrl?: string;
  selectedColor: string;
  sizeDistribution: SizeQuantityMap; // 36 -> count, 37 -> count...
  totalPairs: number;
  unitSalePrice: number;
  totalRevenue: number;
  estimatedCostPerPair: number;
  estimatedTotalCost: number;
  estimatedGrossProfit: number;
  status: 'bekliyor' | 'tahsis_edildi' | 'uretimde' | 'tamamlandi' | 'sevk_edildi' | 'iptal';
  workOrderId?: string;
  orderDate: string;
  deliveryDate: string;
  notes?: string;
}

export interface WorkOrderItem {
  materialId: string;
  materialName: string;
  category: MaterialCategory;
  unit: MaterialUnit;
  requiredQuantity: number;
  allocatedFromStock: number;
  missingQuantity: number;
  isSole?: boolean;
  sizeBreakdown?: SizeQuantityMap;
}

export interface WorkOrderModelItem {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeCode?: string;
  selectedColor: string;
  modelImageUrl?: string;
  sizeDistribution: SizeQuantityMap;
  totalPairs: number;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  orderId?: string;
  orderNumber?: string;
  customerName: string;
  // Multi-model support: 1 to 10+ models per work order
  models: WorkOrderModelItem[];
  // Single-model backward compatibility helpers
  recipeId?: string;
  recipeName?: string;
  selectedColor?: string;
  modelImageUrl?: string;
  sizeDistribution?: SizeQuantityMap;
  totalPairs: number;
  status: 'hazirlik' | 'kesim' | 'saya_montaj' | 'taban_pres' | 'kalite_paket' | 'tamamlandi';
  startDate: string;
  targetEndDate: string;
  completedDate?: string;
  requiredMaterials: WorkOrderItem[];
  stockDeducted: boolean;
  stationProgress: {
    kesim: number; // 0-100 %
    saya: number; // 0-100 %
    montaj: number; // 0-100 %
    paket: number; // 0-100 %
  };
  notes?: string;
}

export interface SupplierPurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string;
  supplierEmail: string;
  orderDate: string;
  status: 'taslak' | 'siparis_verildi' | 'yolda' | 'teslim_alindi' | 'iptal';
  items: {
    materialId: string;
    materialName: string;
    unit: MaterialUnit;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    colorVariant?: string;
    sizeBreakdown?: Partial<SizeQuantityMap>; // If sole PO
  }[];
  totalAmount: number;
  notes?: string;
}

export interface ProductionHistoryLog {
  id: string;
  workOrderId: string;
  recipeName: string;
  totalPairs: number;
  actualScrapRate: number; // Actual waste %
  actualLaborCost: number;
  actualDurationDays: number;
  completionDate: string;
  efficiencyScore: number; // 0-100
  notes?: string;
}
