import {
  RawMaterial,
  Supplier,
  SlipperRecipe,
  CustomerOrder,
  WorkOrder,
  SupplierPurchaseOrder,
  ProductionHistoryLog,
} from '../types';
import {
  INITIAL_SUPPLIERS,
  INITIAL_MATERIALS,
  INITIAL_RECIPES,
  INITIAL_ORDERS,
  INITIAL_WORK_ORDERS,
  INITIAL_PRODUCTION_HISTORY,
} from '../data/mockInitialData';

const STORAGE_KEYS = {
  SUPPLIERS: 'terlik_erp_suppliers_v1',
  MATERIALS: 'terlik_erp_materials_v1',
  RECIPES: 'terlik_erp_recipes_v1',
  ORDERS: 'terlik_erp_orders_v1',
  WORK_ORDERS: 'terlik_erp_work_orders_v1',
  SUPPLIER_POS: 'terlik_erp_pos_v1',
  PRODUCTION_HISTORY: 'terlik_erp_history_v1',
};

export const storageService = {
  getSuppliers(): Supplier[] {
    const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    if (!data) {
      this.saveSuppliers(INITIAL_SUPPLIERS);
      return INITIAL_SUPPLIERS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_SUPPLIERS;
    }
  },

  saveSuppliers(items: Supplier[]) {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(items));
  },

  getMaterials(): RawMaterial[] {
    const data = localStorage.getItem(STORAGE_KEYS.MATERIALS);
    if (!data) {
      this.saveMaterials(INITIAL_MATERIALS);
      return INITIAL_MATERIALS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_MATERIALS;
    }
  },

  saveMaterials(items: RawMaterial[]) {
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(items));
  },

  getRecipes(): SlipperRecipe[] {
    const data = localStorage.getItem(STORAGE_KEYS.RECIPES);
    if (!data) {
      this.saveRecipes(INITIAL_RECIPES);
      return INITIAL_RECIPES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_RECIPES;
    }
  },

  saveRecipes(items: SlipperRecipe[]) {
    localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(items));
  },

  getOrders(): CustomerOrder[] {
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (!data) {
      this.saveOrders(INITIAL_ORDERS);
      return INITIAL_ORDERS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_ORDERS;
    }
  },

  saveOrders(items: CustomerOrder[]) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(items));
  },

  getWorkOrders(): WorkOrder[] {
    const data = localStorage.getItem(STORAGE_KEYS.WORK_ORDERS);
    if (!data) {
      this.saveWorkOrders(INITIAL_WORK_ORDERS);
      return INITIAL_WORK_ORDERS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_WORK_ORDERS;
    }
  },

  saveWorkOrders(items: WorkOrder[]) {
    localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(items));
  },

  getSupplierPOs(): SupplierPurchaseOrder[] {
    const data = localStorage.getItem(STORAGE_KEYS.SUPPLIER_POS);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveSupplierPOs(items: SupplierPurchaseOrder[]) {
    localStorage.setItem(STORAGE_KEYS.SUPPLIER_POS, JSON.stringify(items));
  },

  getProductionHistory(): ProductionHistoryLog[] {
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTION_HISTORY);
    if (!data) {
      this.saveProductionHistory(INITIAL_PRODUCTION_HISTORY);
      return INITIAL_PRODUCTION_HISTORY;
    }
    try {
      return JSON.parse(data);
    } catch {
      return INITIAL_PRODUCTION_HISTORY;
    }
  },

  saveProductionHistory(items: ProductionHistoryLog[]) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTION_HISTORY, JSON.stringify(items));
  },

  resetAllToDefaults() {
    this.saveSuppliers(INITIAL_SUPPLIERS);
    this.saveMaterials(INITIAL_MATERIALS);
    this.saveRecipes(INITIAL_RECIPES);
    this.saveOrders(INITIAL_ORDERS);
    this.saveWorkOrders(INITIAL_WORK_ORDERS);
    this.saveSupplierPOs([]);
    this.saveProductionHistory(INITIAL_PRODUCTION_HISTORY);
  },

  exportAllDataJson(): string {
    const backup = {
      version: 1,
      timestamp: new Date().toISOString(),
      suppliers: this.getSuppliers(),
      materials: this.getMaterials(),
      recipes: this.getRecipes(),
      orders: this.getOrders(),
      workOrders: this.getWorkOrders(),
      supplierPOs: this.getSupplierPOs(),
      productionHistory: this.getProductionHistory(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importDataJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.materials) this.saveMaterials(data.materials);
      if (data.recipes) this.saveRecipes(data.recipes);
      if (data.orders) this.saveOrders(data.orders);
      if (data.workOrders) this.saveWorkOrders(data.workOrders);
      if (data.suppliers) this.saveSuppliers(data.suppliers);
      if (data.supplierPOs) this.saveSupplierPOs(data.supplierPOs);
      if (data.productionHistory) this.saveProductionHistory(data.productionHistory);
      return true;
    } catch (e) {
      console.error('Import error', e);
      return false;
    }
  },
};
