import { SlipperRecipe, RecipeMaterialItem, SizeQuantityMap, ALL_SIZES, RawMaterial, SoleSize, WorkOrderItem, TrendyolPricingConfig } from '../types';

export interface RecipeCostBreakdown {
  materialCostPerPair: number;
  expenseCostPerPair: number;
  totalCostPerPair: number;
  grossProfitPerPair: number;
  grossProfitMarginPercent: number;
  materialsDetail: {
    materialName: string;
    category: string;
    unit: string;
    quantity: number;
    unitCost: number;
    scrapPercent: number;
    effectiveCost: number;
  }[];
  expensesDetail: {
    name: string;
    type: string;
    cost: number;
  }[];
}

export function calculateRecipeCost(recipe: SlipperRecipe): RecipeCostBreakdown {
  const materialsDetail = (recipe.materials || []).map((m: RecipeMaterialItem) => {
    const scrapFactor = 1 + (m.scrapPercentage || 0) / 100;
    const effectiveCost = (m.quantityPerPair || 0) * (m.unitCost || 0) * scrapFactor;
    return {
      materialName: m.materialName,
      category: m.category,
      unit: m.unit,
      quantity: m.quantityPerPair,
      unitCost: m.unitCost,
      scrapPercent: m.scrapPercentage || 0,
      effectiveCost,
    };
  });

  const materialCostPerPair = materialsDetail.reduce((acc, curr) => acc + curr.effectiveCost, 0);

  const expensesDetail = (recipe.expenses || []).map((e) => ({
    name: e.name,
    type: e.type,
    cost: e.costPerPair || 0,
  }));

  const expenseCostPerPair = expensesDetail.reduce((acc, curr) => acc + curr.cost, 0);
  const totalCostPerPair = materialCostPerPair + expenseCostPerPair;

  const salePrice = recipe.targetWholesalePrice || 0;
  const grossProfitPerPair =
    recipe.manualGrossProfitPerPair !== undefined
      ? recipe.manualGrossProfitPerPair
      : (salePrice > 0 ? salePrice - totalCostPerPair : 0);
  const effectiveSalePrice = salePrice > 0 ? salePrice : (totalCostPerPair + grossProfitPerPair);
  const grossProfitMarginPercent =
    effectiveSalePrice > 0 ? (grossProfitPerPair / effectiveSalePrice) * 100 : 0;

  return {
    materialCostPerPair,
    expenseCostPerPair,
    totalCostPerPair,
    grossProfitPerPair,
    grossProfitMarginPercent,
    materialsDetail,
    expensesDetail,
  };
}

export interface TrendyolSimulationResult {
  salePrice: number;
  totalCostPerPair: number;
  commissionRate: number;
  commissionAmount: number;
  shippingCost: number;
  serviceFee: number;
  returnReserveRate: number;
  returnReserveAmount: number;
  totalMarketplaceDeductions: number;
  netPayoutToSeller: number;
  netProfit: number;
  profitMarginPercent: number;
  isLoss: boolean;
  minBreakevenPrice: number;
}

/**
 * Trendyol Satıcı & Pazar Yeri Fiyatlandırma Hesaplayıcısı
 * Komisyon, kargo, hizmet bedeli ve iade payını hesaplayarak minimum ve tavsiye satış fiyatını üretir.
 */
export function calculateTrendyolPricing(
  totalCostPerPair: number,
  config?: Partial<TrendyolPricingConfig>
): TrendyolPricingConfig {
  const commissionRate = config?.commissionRate ?? 21; // Ayakkabı & Terlik kategorisi ~%21
  const shippingCost = config?.shippingCost ?? 55; // Trendyol anlaşmalı kargo baremi ort.
  const serviceFee = config?.serviceFee ?? 8.5; // Trendyol işlem / hizmet bedeli
  const returnReserveRate = config?.returnReserveRate ?? 5; // İade & ambalaj payı %5
  const targetNetProfit = config?.targetNetProfit ?? 60; // İstenen net kar (TL)

  const returnReserveAmount = totalCostPerPair * (returnReserveRate / 100);
  const commissionMultiplier = Math.max(0.01, 1 - commissionRate / 100);

  // 1. En Düşük Satış Fiyatı (Başabaş / 0 TL Kar - Altında satarsa zarar eder):
  const minDirectCost = totalCostPerPair + shippingCost + serviceFee + returnReserveAmount;
  const minBreakevenPrice = Number((minDirectCost / commissionMultiplier).toFixed(2));

  // 2. Tavsiye Edilen Satış Fiyatı (Hedef Net Kar ile):
  const targetTotal = minDirectCost + targetNetProfit;
  const recommendedSalePrice = Number((targetTotal / commissionMultiplier).toFixed(2));

  return {
    enabled: config?.enabled ?? true,
    commissionRate,
    shippingCost,
    serviceFee,
    returnReserveRate,
    targetNetProfit,
    minBreakevenPrice,
    recommendedSalePrice,
  };
}

/**
 * Kullanıcının girdiği herhangi bir Trendyol satış fiyatı için anlık kar/zarar simülasyonu yapar
 */
export function simulateTrendyolSalePrice(
  salePrice: number,
  totalCostPerPair: number,
  config?: Partial<TrendyolPricingConfig>
): TrendyolSimulationResult {
  const commissionRate = config?.commissionRate ?? 21;
  const shippingCost = config?.shippingCost ?? 55;
  const serviceFee = config?.serviceFee ?? 8.5;
  const returnReserveRate = config?.returnReserveRate ?? 5;

  const commissionAmount = Number((salePrice * (commissionRate / 100)).toFixed(2));
  const returnReserveAmount = Number((totalCostPerPair * (returnReserveRate / 100)).toFixed(2));
  const totalMarketplaceDeductions = Number(
    (commissionAmount + shippingCost + serviceFee + returnReserveAmount).toFixed(2)
  );
  const netPayoutToSeller = Number((salePrice - commissionAmount - shippingCost - serviceFee).toFixed(2));
  const netProfit = Number((salePrice - totalMarketplaceDeductions - totalCostPerPair).toFixed(2));
  const profitMarginPercent = salePrice > 0 ? Number(((netProfit / salePrice) * 100).toFixed(1)) : 0;

  const commissionMultiplier = Math.max(0.01, 1 - commissionRate / 100);
  const minDirectCost = totalCostPerPair + shippingCost + serviceFee + returnReserveAmount;
  const minBreakevenPrice = Number((minDirectCost / commissionMultiplier).toFixed(2));

  return {
    salePrice,
    totalCostPerPair,
    commissionRate,
    commissionAmount,
    shippingCost,
    serviceFee,
    returnReserveRate,
    returnReserveAmount,
    totalMarketplaceDeductions,
    netPayoutToSeller,
    netProfit,
    profitMarginPercent,
    isLoss: netProfit < 0,
    minBreakevenPrice,
  };
}

export interface MaterialRequirementCheck {
  materialId: string;
  materialName: string;
  category: string;
  unit: string;
  requiredQuantity: number;
  currentAvailableStock: number;
  isShortage: boolean;
  shortageQuantity: number;
  isSole?: boolean;
  sizeBreakdown?: {
    size: SoleSize;
    required: number;
    available: number;
    isShortage: boolean;
    shortage: number;
  }[];
  supplierId?: string;
  supplierName?: string;
}

export function calculateOrderRequirements(
  recipe: SlipperRecipe,
  sizeDistribution: SizeQuantityMap,
  materialsList: RawMaterial[]
): {
  totalPairs: number;
  requirements: MaterialRequirementCheck[];
  hasAnyShortage: boolean;
  shortagesCount: number;
} {
  const totalPairs = ALL_SIZES.reduce((sum, s) => sum + (sizeDistribution[s] || 0), 0);

  const requirements: MaterialRequirementCheck[] = [];
  let shortagesCount = 0;

  for (const item of recipe.materials) {
    const rawMat = materialsList.find((m) => m.id === item.materialId);
    const scrapFactor = 1 + (item.scrapPercentage || 0) / 100;

    if (item.isSole && rawMat?.isSoleFamily && rawMat.soleStocks) {
      // Sole family check across 36-45
      const sizeBreakdown: {
        size: SoleSize;
        required: number;
        available: number;
        isShortage: boolean;
        shortage: number;
      }[] = [];

      let totalSoleRequired = 0;
      let totalSoleAvailable = 0;
      let soleFamilyHasShortage = false;

      ALL_SIZES.forEach((size) => {
        const orderQty = sizeDistribution[size] || 0;
        if (orderQty > 0) {
          const soleStock = rawMat.soleStocks?.[size] ?? 0;
          const isShort = soleStock < orderQty;
          const shortQty = isShort ? orderQty - soleStock : 0;
          if (isShort) soleFamilyHasShortage = true;

          sizeBreakdown.push({
            size,
            required: orderQty,
            available: soleStock,
            isShortage: isShort,
            shortage: shortQty,
          });

          totalSoleRequired += orderQty;
          totalSoleAvailable += soleStock;
        }
      });

      if (soleFamilyHasShortage) shortagesCount++;

      requirements.push({
        materialId: item.materialId,
        materialName: item.materialName,
        category: item.category,
        unit: item.unit,
        requiredQuantity: totalSoleRequired,
        currentAvailableStock: rawMat.currentStock || totalSoleAvailable,
        isShortage: soleFamilyHasShortage,
        shortageQuantity: sizeBreakdown.reduce((sum, s) => sum + s.shortage, 0),
        isSole: true,
        sizeBreakdown,
        supplierId: rawMat.supplierId,
        supplierName: rawMat.supplierName,
      });
    } else {
      // General material
      const requiredQty = Number(((item.quantityPerPair || 0) * totalPairs * scrapFactor).toFixed(2));
      const availableStock = rawMat?.currentStock ?? 0;
      const isShortage = availableStock < requiredQty;
      const shortageQuantity = isShortage ? Number((requiredQty - availableStock).toFixed(2)) : 0;

      if (isShortage) shortagesCount++;

      requirements.push({
        materialId: item.materialId,
        materialName: item.materialName,
        category: item.category,
        unit: item.unit,
        requiredQuantity: requiredQty,
        currentAvailableStock: availableStock,
        isShortage,
        shortageQuantity,
        isSole: false,
        supplierId: rawMat?.supplierId,
        supplierName: rawMat?.supplierName,
      });
    }
  }

  return {
    totalPairs,
    requirements,
    hasAnyShortage: shortagesCount > 0,
    shortagesCount,
  };
}

export function calculateMultiModelRequirements(
  models: {
    recipeId: string;
    selectedColor?: string;
    sizeDistribution: SizeQuantityMap;
    totalPairs: number;
  }[],
  recipesList: SlipperRecipe[],
  materialsList: RawMaterial[]
): {
  totalPairs: number;
  requirements: MaterialRequirementCheck[];
  workOrderItems: WorkOrderItem[];
  hasAnyShortage: boolean;
  shortagesCount: number;
} {
  const totalPairs = models.reduce((sum, m) => sum + m.totalPairs, 0);

  // Map of materialId -> accumulated needed quantity and size breakdown
  const materialMap: Record<
    string,
    {
      materialId: string;
      materialName: string;
      category: any;
      unit: any;
      requiredQuantity: number;
      isSole?: boolean;
      sizeBreakdown: Record<SoleSize, number>;
      supplierId?: string;
      supplierName?: string;
    }
  > = {};

  models.forEach((m) => {
    const recipe = recipesList.find((r) => r.id === m.recipeId);
    if (!recipe) return;

    recipe.materials.forEach((item) => {
      const rawMat = materialsList.find((mat) => mat.id === item.materialId);
      const scrapFactor = 1 + (item.scrapPercentage || 0) / 100;

      if (!materialMap[item.materialId]) {
        materialMap[item.materialId] = {
          materialId: item.materialId,
          materialName: item.materialName,
          category: item.category,
          unit: item.unit,
          requiredQuantity: 0,
          isSole: item.isSole,
          sizeBreakdown: { 36: 0, 37: 0, 38: 0, 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 },
          supplierId: rawMat?.supplierId,
          supplierName: rawMat?.supplierName,
        };
      }

      if (item.isSole) {
        ALL_SIZES.forEach((sz) => {
          const qty = m.sizeDistribution[sz] || 0;
          materialMap[item.materialId].sizeBreakdown[sz] += qty;
          materialMap[item.materialId].requiredQuantity += qty;
        });
      } else {
        const needed = Number(((item.quantityPerPair || 0) * m.totalPairs * scrapFactor).toFixed(2));
        materialMap[item.materialId].requiredQuantity = Number(
          (materialMap[item.materialId].requiredQuantity + needed).toFixed(2)
        );
      }
    });
  });

  const requirements: MaterialRequirementCheck[] = [];
  const workOrderItems: WorkOrderItem[] = [];
  let shortagesCount = 0;

  Object.values(materialMap).forEach((item) => {
    const rawMat = materialsList.find((m) => m.id === item.materialId);

    if (item.isSole && rawMat?.isSoleFamily && rawMat.soleStocks) {
      let soleFamilyHasShortage = false;
      const sizeBreakdownArr: {
        size: SoleSize;
        required: number;
        available: number;
        isShortage: boolean;
        shortage: number;
      }[] = [];

      ALL_SIZES.forEach((sz) => {
        const required = item.sizeBreakdown[sz] || 0;
        if (required > 0) {
          const available = rawMat.soleStocks?.[sz] ?? 0;
          const isShort = available < required;
          const shortage = isShort ? required - available : 0;
          if (isShort) soleFamilyHasShortage = true;

          sizeBreakdownArr.push({
            size: sz,
            required,
            available,
            isShortage: isShort,
            shortage,
          });
        }
      });

      if (soleFamilyHasShortage) shortagesCount++;

      requirements.push({
        materialId: item.materialId,
        materialName: item.materialName,
        category: item.category,
        unit: item.unit,
        requiredQuantity: item.requiredQuantity,
        currentAvailableStock: rawMat.currentStock,
        isShortage: soleFamilyHasShortage,
        shortageQuantity: sizeBreakdownArr.reduce((sum, s) => sum + s.shortage, 0),
        isSole: true,
        sizeBreakdown: sizeBreakdownArr,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
      });

      workOrderItems.push({
        materialId: item.materialId,
        materialName: item.materialName,
        category: item.category,
        unit: item.unit,
        requiredQuantity: item.requiredQuantity,
        allocatedFromStock: 0,
        missingQuantity: sizeBreakdownArr.reduce((sum, s) => sum + s.shortage, 0),
        isSole: true,
        sizeBreakdown: item.sizeBreakdown,
      });
    } else {
      const availableStock = rawMat?.currentStock ?? 0;
      const isShortage = availableStock < item.requiredQuantity;
      const shortageQuantity = isShortage
        ? Number((item.requiredQuantity - availableStock).toFixed(2))
        : 0;

      if (isShortage) shortagesCount++;

      requirements.push({
        materialId: item.materialId,
        materialName: item.materialName,
        category: item.category,
        unit: item.unit,
        requiredQuantity: item.requiredQuantity,
        currentAvailableStock: availableStock,
        isShortage,
        shortageQuantity,
        isSole: false,
        supplierId: item.supplierId,
        supplierName: item.supplierName,
      });

      workOrderItems.push({
        materialId: item.materialId,
        materialName: item.materialName,
        category: item.category,
        unit: item.unit,
        requiredQuantity: item.requiredQuantity,
        allocatedFromStock: 0,
        missingQuantity: shortageQuantity,
        isSole: false,
      });
    }
  });

  return {
    totalPairs,
    requirements,
    workOrderItems,
    hasAnyShortage: shortagesCount > 0,
    shortagesCount,
  };
}

export function formatTRY(val: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export function formatNumber(val: number): string {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 2,
  }).format(val || 0);
}
