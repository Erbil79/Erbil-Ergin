import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { RecipesTab } from './components/tabs/RecipesTab';
import { MaterialsTab } from './components/tabs/MaterialsTab';
import { OrdersTab } from './components/tabs/OrdersTab';
import { WorkOrdersTab } from './components/tabs/WorkOrdersTab';
import { SuppliersTab } from './components/tabs/SuppliersTab';
import { AnalyticsTab } from './components/tabs/AnalyticsTab';

import { RecipeModal } from './components/modals/RecipeModal';
import { OrderModal } from './components/modals/OrderModal';
import { MaterialModal } from './components/modals/MaterialModal';
import { PurchaseOrderModal } from './components/modals/PurchaseOrderModal';
import { WorkOrderModal } from './components/modals/WorkOrderModal';
import { CreateWorkOrderModal } from './components/modals/CreateWorkOrderModal';
import { SupplierModal } from './components/modals/SupplierModal';

import { storageService } from './services/storageService';
import {
  RawMaterial,
  Supplier,
  SlipperRecipe,
  CustomerOrder,
  WorkOrder,
  WorkOrderModelItem,
  SupplierPurchaseOrder,
  ProductionHistoryLog,
  WorkOrderItem,
  ALL_SIZES,
} from './types';
import { calculateMultiModelRequirements } from './utils/calculationUtils';

export default function App() {
  // App state
  const [activeTab, setActiveTab] = useState<string>('recipes');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<SlipperRecipe[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [supplierPOs, setSupplierPOs] = useState<SupplierPurchaseOrder[]>([]);
  const [history, setHistory] = useState<ProductionHistoryLog[]>([]);

  // Modals state
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<SlipperRecipe | null>(null);

  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<CustomerOrder | null>(null);
  const [orderPreSelectedRecipeId, setOrderPreSelectedRecipeId] = useState<string | undefined>(undefined);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poMaterialId, setPoMaterialId] = useState<string | undefined>(undefined);
  const [poShortageQty, setPoShortageQty] = useState<number | undefined>(undefined);

  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);
  const [isCreateWorkOrderModalOpen, setIsCreateWorkOrderModalOpen] = useState(false);
  const [activeWorkOrder, setActiveWorkOrder] = useState<WorkOrder | null>(null);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load data on mount
  useEffect(() => {
    setSuppliers(storageService.getSuppliers());
    setMaterials(storageService.getMaterials());
    setRecipes(storageService.getRecipes());
    setOrders(storageService.getOrders());
    setWorkOrders(storageService.getWorkOrders());
    setSupplierPOs(storageService.getSupplierPOs());
    setHistory(storageService.getProductionHistory());
  }, []);

  // Save changes to storage
  const updateSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    storageService.saveSuppliers(newSuppliers);
  };

  const updateMaterials = (newMaterials: RawMaterial[]) => {
    setMaterials(newMaterials);
    storageService.saveMaterials(newMaterials);
  };

  const updateRecipes = (newRecipes: SlipperRecipe[]) => {
    setRecipes(newRecipes);
    storageService.saveRecipes(newRecipes);
  };

  const updateOrders = (newOrders: CustomerOrder[]) => {
    setOrders(newOrders);
    storageService.saveOrders(newOrders);
  };

  const updateWorkOrders = (newWOs: WorkOrder[]) => {
    setWorkOrders(newWOs);
    storageService.saveWorkOrders(newWOs);
  };

  const updateSupplierPOs = (newPOs: SupplierPurchaseOrder[]) => {
    setSupplierPOs(newPOs);
    storageService.saveSupplierPOs(newPOs);
  };

  const updateHistory = (newHistory: ProductionHistoryLog[]) => {
    setHistory(newHistory);
    storageService.saveProductionHistory(newHistory);
  };

  // ---------------- RECIPE HANDLERS ----------------
  const handleSaveRecipe = (recipe: SlipperRecipe) => {
    const exists = recipes.some((r) => r.id === recipe.id);
    let next: SlipperRecipe[];
    if (exists) {
      next = recipes.map((r) => (r.id === recipe.id ? recipe : r));
      showToast(`"${recipe.name}" reçetesi güncellendi.`);
    } else {
      next = [recipe, ...recipes];
      showToast(`Yeni model reçetesi "${recipe.name}" eklendi.`);
    }
    updateRecipes(next);
  };

  const handleDeleteRecipe = (id: string) => {
    if (window.confirm('Bu reçeteyi silmek istediğinizden emin misiniz?')) {
      const next = recipes.filter((r) => r.id !== id);
      updateRecipes(next);
      showToast('Reçete silindi.');
    }
  };

  const handleCloneRecipe = (recipe: SlipperRecipe) => {
    const clone: SlipperRecipe = {
      ...recipe,
      id: `rec-${Date.now()}`,
      code: `${recipe.code}-KOPYA`,
      name: `${recipe.name} (Kopya)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateRecipes([clone, ...recipes]);
    showToast(`"${recipe.name}" başarıyla kopyalandı.`);
  };

  const handleConvertToOrder = (recipe: SlipperRecipe) => {
    setOrderPreSelectedRecipeId(recipe.id);
    setEditingOrder(null);
    setIsOrderModalOpen(true);
  };

  // ---------------- ORDER HANDLERS ----------------
  const handleSaveOrder = (order: CustomerOrder, createWorkOrderNow?: boolean) => {
    const exists = orders.some((o) => o.id === order.id);
    let nextOrders: CustomerOrder[];
    if (exists) {
      nextOrders = orders.map((o) => (o.id === order.id ? order : o));
    } else {
      nextOrders = [order, ...orders];
    }

    if (createWorkOrderNow) {
      // Create work order
      const recipe = recipes.find((r) => r.id === order.recipeId);
      const woId = `wo-${Date.now()}`;
      const woNumber = `İŞE-2026-${Date.now().toString().slice(-4)}`;

      // Generate required materials
      const requiredMaterials: WorkOrderItem[] = (recipe?.materials || []).map((m) => {
        const scrapFactor = 1 + (m.scrapPercentage || 0) / 100;
        const reqQty = Number(((m.quantityPerPair || 0) * order.totalPairs * scrapFactor).toFixed(2));
        return {
          materialId: m.materialId,
          materialName: m.materialName,
          category: m.category,
          unit: m.unit,
          requiredQuantity: reqQty,
          allocatedFromStock: 0,
          missingQuantity: 0,
          isSole: m.isSole,
          sizeBreakdown: m.isSole ? order.sizeDistribution : undefined,
        };
      });

      const newWO: WorkOrder = {
        id: woId,
        workOrderNumber: woNumber,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        models: [
          {
            id: `wom-${Date.now()}`,
            recipeId: order.recipeId,
            recipeName: order.recipeName,
            recipeCode: order.recipeCode,
            selectedColor: order.selectedColor,
            modelImageUrl: order.modelImageUrl,
            sizeDistribution: order.sizeDistribution,
            totalPairs: order.totalPairs,
          },
        ],
        recipeId: order.recipeId,
        recipeName: order.recipeName,
        selectedColor: order.selectedColor,
        modelImageUrl: order.modelImageUrl,
        sizeDistribution: order.sizeDistribution,
        totalPairs: order.totalPairs,
        status: 'hazirlik',
        startDate: new Date().toISOString().split('T')[0],
        targetEndDate: order.deliveryDate,
        requiredMaterials,
        stockDeducted: false,
        stationProgress: {
          kesim: 0,
          saya: 0,
          montaj: 0,
          paket: 0,
        },
      };

      // update order with work order link
      const updatedOrder = { ...order, status: 'uretimde' as const, workOrderId: woId };
      nextOrders = nextOrders.map((o) => (o.id === order.id ? updatedOrder : o));

      updateWorkOrders([newWO, ...workOrders]);
      setActiveWorkOrder(newWO);
      setIsWorkOrderModalOpen(true);
      showToast(`Sipariş kaydedildi ve ${woNumber} numaralı iş emri oluşturuldu!`);
    } else {
      showToast(`"${order.orderNumber}" numaralı sipariş kaydedildi.`);
    }

    updateOrders(nextOrders);
  };

  const handleDeleteOrder = (id: string) => {
    if (window.confirm('Bu siparişi silmek istediğinize emin misiniz?')) {
      updateOrders(orders.filter((o) => o.id !== id));
      showToast('Sipariş silindi.');
    }
  };

  const handleConvertToWorkOrder = (order: CustomerOrder) => {
    const recipe = recipes.find((r) => r.id === order.recipeId);
    const woId = `wo-${Date.now()}`;
    const woNumber = `İŞE-2026-${Date.now().toString().slice(-4)}`;

    const requiredMaterials: WorkOrderItem[] = (recipe?.materials || []).map((m) => {
      const scrapFactor = 1 + (m.scrapPercentage || 0) / 100;
      const reqQty = Number(((m.quantityPerPair || 0) * order.totalPairs * scrapFactor).toFixed(2));
      return {
        materialId: m.materialId,
        materialName: m.materialName,
        category: m.category,
        unit: m.unit,
        requiredQuantity: reqQty,
        allocatedFromStock: 0,
        missingQuantity: 0,
        isSole: m.isSole,
        sizeBreakdown: m.isSole ? order.sizeDistribution : undefined,
      };
    });

    const newWO: WorkOrder = {
      id: woId,
      workOrderNumber: woNumber,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      models: [
        {
          id: `wom-${Date.now()}`,
          recipeId: order.recipeId,
          recipeName: order.recipeName,
          recipeCode: order.recipeCode,
          selectedColor: order.selectedColor,
          modelImageUrl: order.modelImageUrl,
          sizeDistribution: order.sizeDistribution,
          totalPairs: order.totalPairs,
        },
      ],
      recipeId: order.recipeId,
      recipeName: order.recipeName,
      selectedColor: order.selectedColor,
      modelImageUrl: order.modelImageUrl,
      sizeDistribution: order.sizeDistribution,
      totalPairs: order.totalPairs,
      status: 'hazirlik',
      startDate: new Date().toISOString().split('T')[0],
      targetEndDate: order.deliveryDate,
      requiredMaterials,
      stockDeducted: false,
      stationProgress: {
        kesim: 0,
        saya: 0,
        montaj: 0,
        paket: 0,
      },
    };

    const updatedOrders = orders.map((o) =>
      o.id === order.id ? { ...o, status: 'uretimde' as const, workOrderId: woId } : o
    );

    updateOrders(updatedOrders);
    updateWorkOrders([newWO, ...workOrders]);
    setActiveTab('workOrders');
    setActiveWorkOrder(newWO);
    setIsWorkOrderModalOpen(true);
    showToast(`İş emri oluşturuldu: ${woNumber}`);
  };

  const handleSaveMultiModelWorkOrder = (newWO: WorkOrder) => {
    updateWorkOrders([newWO, ...workOrders]);
    setActiveTab('workOrders');
    setActiveWorkOrder(newWO);
    setIsWorkOrderModalOpen(true);
    showToast(
      `Çoklu model iş emri oluşturuldu: ${newWO.workOrderNumber} (${newWO.models?.length || 1} Model, ${newWO.totalPairs} Çift)`
    );
  };

  const handleConvertMultipleOrdersToWorkOrder = (selectedOrderIds: string[]) => {
    const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
    if (selectedOrders.length === 0) return;

    const woId = `wo-${Date.now()}`;
    const woNumber = `İŞE-2026-${Date.now().toString().slice(-4)}`;

    const modelItems: WorkOrderModelItem[] = selectedOrders.map((o) => ({
      id: `wom-${o.id}-${Date.now()}`,
      recipeId: o.recipeId,
      recipeName: o.recipeName,
      recipeCode: o.recipeCode,
      selectedColor: o.selectedColor,
      modelImageUrl: o.modelImageUrl,
      sizeDistribution: o.sizeDistribution,
      totalPairs: o.totalPairs,
    }));

    const totalPairs = selectedOrders.reduce((sum, o) => sum + o.totalPairs, 0);
    const multiReport = calculateMultiModelRequirements(modelItems, recipes, materials);

    const firstOrder = selectedOrders[0];
    const customerNames = Array.from(new Set(selectedOrders.map((o) => o.customerName))).join(', ');

    const newWO: WorkOrder = {
      id: woId,
      workOrderNumber: woNumber,
      orderId: selectedOrders.length === 1 ? firstOrder.id : undefined,
      orderNumber: selectedOrders.map((o) => o.orderNumber).join(', '),
      customerName: customerNames,
      models: modelItems,
      recipeId: firstOrder.recipeId,
      recipeName: `${selectedOrders.length} Farklı Model Karma Parti`,
      selectedColor: firstOrder.selectedColor,
      modelImageUrl: firstOrder.modelImageUrl,
      sizeDistribution: firstOrder.sizeDistribution,
      totalPairs,
      status: 'hazirlik',
      startDate: new Date().toISOString().split('T')[0],
      targetEndDate: selectedOrders.reduce(
        (earliest, o) => (o.deliveryDate < earliest ? o.deliveryDate : earliest),
        firstOrder.deliveryDate
      ),
      requiredMaterials: multiReport.workOrderItems,
      stockDeducted: false,
      stationProgress: {
        kesim: 0,
        saya: 0,
        montaj: 0,
        paket: 0,
      },
      notes: `${selectedOrders.length} adet sipariş birleştirilerek tek üretim iş emri oluşturuldu.`,
    };

    const updatedOrders = orders.map((o) =>
      selectedOrderIds.includes(o.id)
        ? { ...o, status: 'uretimde' as const, workOrderId: woId }
        : o
    );

    updateOrders(updatedOrders);
    updateWorkOrders([newWO, ...workOrders]);
    setActiveTab('workOrders');
    setActiveWorkOrder(newWO);
    setIsWorkOrderModalOpen(true);
    showToast(
      `${selectedOrders.length} farklı model siparişi tek bir iş emrinde (${woNumber}) birleştirildi!`
    );
  };

  // ---------------- WORK ORDER HANDLERS (STOCK DEDUCTION & COMPLETION) ----------------
  const handleDeductStock = (woId: string) => {
    const wo = workOrders.find((w) => w.id === woId);
    if (!wo || wo.stockDeducted) return;

    const modelsList =
      wo.models && wo.models.length > 0
        ? wo.models
        : [
            {
              id: 'single',
              recipeId: wo.recipeId || '',
              recipeName: wo.recipeName || '',
              selectedColor: wo.selectedColor || '',
              sizeDistribution: wo.sizeDistribution || ({} as any),
              totalPairs: wo.totalPairs,
            },
          ];

    const updatedMaterials = [...materials];

    modelsList.forEach((mItem) => {
      const recipe = recipes.find((r) => r.id === mItem.recipeId);
      if (!recipe) return;

      // 1. Deduct sole variants (36-45)
      if (recipe.soleMaterialId) {
        const soleMatIndex = updatedMaterials.findIndex((m) => m.id === recipe.soleMaterialId);
        if (soleMatIndex !== -1) {
          const soleMat = { ...updatedMaterials[soleMatIndex] };
          if (soleMat.soleStocks) {
            const newStocks = { ...soleMat.soleStocks };
            ALL_SIZES.forEach((sz) => {
              const count = mItem.sizeDistribution?.[sz] || 0;
              newStocks[sz] = Math.max(0, (newStocks[sz] || 0) - count);
            });
            soleMat.soleStocks = newStocks;
            soleMat.currentStock = ALL_SIZES.reduce((sum, s) => sum + (newStocks[s] || 0), 0);
            updatedMaterials[soleMatIndex] = soleMat;
          }
        }
      }

      // 2. Deduct non-sole materials
      (recipe.materials || []).forEach((rm) => {
        if (!rm.isSole) {
          const matIdx = updatedMaterials.findIndex((mat) => mat.id === rm.materialId);
          if (matIdx !== -1) {
            const scrapMultiplier = 1 + (rm.scrapPercentage || 0) / 100;
            const consumption = (rm.quantityPerPair || 0) * mItem.totalPairs * scrapMultiplier;
            const current = updatedMaterials[matIdx].currentStock;
            updatedMaterials[matIdx] = {
              ...updatedMaterials[matIdx],
              currentStock: Math.max(0, Number((current - consumption).toFixed(2))),
            };
          }
        }
      });
    });

    // Update work order state
    const nextWOs = workOrders.map((w) =>
      w.id === woId ? { ...w, stockDeducted: true, status: 'kesim' as const } : w
    );

    updateMaterials(updatedMaterials);
    updateWorkOrders(nextWOs);
    if (activeWorkOrder && activeWorkOrder.id === woId) {
      setActiveWorkOrder({ ...activeWorkOrder, stockDeducted: true, status: 'kesim' });
    }

    showToast('36-45 Tabanlar ve tüm hammaddeler depodan başarıyla düşüldü!');
  };

  const handleCompleteWorkOrder = (woId: string) => {
    const wo = workOrders.find((w) => w.id === woId);
    if (!wo) return;

    const nextWOs = workOrders.map((w) =>
      w.id === woId
        ? {
            ...w,
            status: 'tamamlandi' as const,
            completedDate: new Date().toISOString().split('T')[0],
            stationProgress: { kesim: 100, saya: 100, montaj: 100, paket: 100 },
          }
        : w
    );

    // Update customer order status
    const nextOrders = orders.map((o) =>
      o.id === wo.orderId ? { ...o, status: 'tamamlandi' as const } : o
    );

    // Create production history record
    const newLog: ProductionHistoryLog = {
      id: `hist-${Date.now()}`,
      workOrderId: wo.workOrderNumber,
      recipeName:
        wo.recipeName ||
        (wo.models && wo.models.length > 0
          ? `${wo.models.length} Farklı Model Karma Partisi`
          : 'Terlik Modeli'),
      totalPairs: wo.totalPairs,
      actualScrapRate: 3.5,
      actualLaborCost: 45.0,
      actualDurationDays: 5,
      completionDate: new Date().toISOString().split('T')[0],
      efficiencyScore: 96,
      notes: `${wo.customerName} siparişi için ${wo.totalPairs} çift terlik başarıyla imal edildi ve mamul deposuna teslim edildi.`,
    };

    updateWorkOrders(nextWOs);
    updateOrders(nextOrders);
    updateHistory([newLog, ...history]);

    if (activeWorkOrder && activeWorkOrder.id === woId) {
      setActiveWorkOrder({
        ...activeWorkOrder,
        status: 'tamamlandi',
        stationProgress: { kesim: 100, saya: 100, montaj: 100, paket: 100 },
      });
    }

    showToast(`Tebrikler! ${wo.workOrderNumber} numaralı iş emri tamamlandı ve mamul stoğuna alındı.`);
  };

  const handleUpdateStationProgress = (
    woId: string,
    station: keyof WorkOrder['stationProgress'],
    val: number
  ) => {
    const nextWOs = workOrders.map((w) => {
      if (w.id === woId) {
        return {
          ...w,
          stationProgress: {
            ...w.stationProgress,
            [station]: val,
          },
        };
      }
      return w;
    });

    updateWorkOrders(nextWOs);
    if (activeWorkOrder && activeWorkOrder.id === woId) {
      setActiveWorkOrder({
        ...activeWorkOrder,
        stationProgress: {
          ...activeWorkOrder.stationProgress,
          [station]: val,
        },
      });
    }
  };

  // ---------------- MATERIAL HANDLERS ----------------
  const handleSaveMaterial = (mat: RawMaterial) => {
    const exists = materials.some((m) => m.id === mat.id);
    let next: RawMaterial[];
    if (exists) {
      next = materials.map((m) => (m.id === mat.id ? mat : m));
      showToast(`"${mat.name}" hammadde kartı güncellendi.`);
    } else {
      next = [mat, ...materials];
      showToast(`Yeni hammadde "${mat.name}" kaydedildi.`);
    }
    updateMaterials(next);
  };

  const handleDeleteMaterial = (id: string) => {
    if (window.confirm('Bu hammaddeyi silmek istediğinize emin misiniz?')) {
      updateMaterials(materials.filter((m) => m.id !== id));
      showToast('Hammadde silindi.');
    }
  };

  // ---------------- SUPPLIER & PO HANDLERS ----------------
  const handleSavePO = (po: SupplierPurchaseOrder) => {
    updateSupplierPOs([po, ...supplierPOs]);
    showToast(`"${po.poNumber}" numaralı satın alma siparişi oluşturuldu.`);
  };

  const handleReceivePO = (poId: string) => {
    const po = supplierPOs.find((p) => p.id === poId);
    if (!po || po.status === 'teslim_alindi') return;

    const updatedMaterials = [...materials];

    po.items.forEach((item) => {
      const matIdx = updatedMaterials.findIndex((m) => m.id === item.materialId);
      if (matIdx !== -1) {
        const mat = { ...updatedMaterials[matIdx] };
        if (mat.isSoleFamily && item.sizeBreakdown) {
          const nextSoleStocks = { ...(mat.soleStocks || ({} as any)) };
          Object.entries(item.sizeBreakdown).forEach(([sz, qty]) => {
            nextSoleStocks[Number(sz) as any] = (nextSoleStocks[Number(sz) as any] || 0) + (qty || 0);
          });
          mat.soleStocks = nextSoleStocks;
          mat.currentStock = ALL_SIZES.reduce((sum, s) => sum + (nextSoleStocks[s] || 0), 0);
        } else {
          mat.currentStock = Number(((mat.currentStock || 0) + item.quantity).toFixed(2));
        }
        updatedMaterials[matIdx] = mat;
      }
    });

    const nextPOs = supplierPOs.map((p) =>
      p.id === poId ? { ...p, status: 'teslim_alindi' as const } : p
    );

    updateMaterials(updatedMaterials);
    updateSupplierPOs(nextPOs);
    showToast('Malzemeler depoya teslim alındı ve hammadde stokları artırıldı!');
  };

  const handleDeletePO = (poId: string) => {
    if (window.confirm('Bu satın alma siparişini silmek istediğinize emin misiniz?')) {
      updateSupplierPOs(supplierPOs.filter((p) => p.id !== poId));
      showToast('Satın alma siparişi silindi.');
    }
  };

  const handleSaveSupplier = (sup: Supplier) => {
    const exists = suppliers.some((s) => s.id === sup.id);
    let next: Supplier[];
    if (exists) {
      next = suppliers.map((s) => (s.id === sup.id ? sup : s));
      showToast(`Tedarikçi "${sup.name}" güncellendi.`);
    } else {
      next = [sup, ...suppliers];
      showToast(`Yeni tedarikçi "${sup.name}" eklendi.`);
    }
    updateSuppliers(next);
  };

  // ---------------- BACKUP & RESTORE ----------------
  const handleExportData = () => {
    const jsonStr = storageService.exportAllDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terlik_erp_yedek_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Tüm fabrika veritabanı JSON olarak indirildi.');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          const success = storageService.importDataJson(text);
          if (success) {
            setSuppliers(storageService.getSuppliers());
            setMaterials(storageService.getMaterials());
            setRecipes(storageService.getRecipes());
            setOrders(storageService.getOrders());
            setWorkOrders(storageService.getWorkOrders());
            setSupplierPOs(storageService.getSupplierPOs());
            setHistory(storageService.getProductionHistory());
            showToast('Yedek başarıyla geri yüklendi!');
          } else {
            alert('Geçersiz yedek dosyası.');
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleResetData = () => {
    storageService.resetAllToDefaults();
    setSuppliers(storageService.getSuppliers());
    setMaterials(storageService.getMaterials());
    setRecipes(storageService.getRecipes());
    setOrders(storageService.getOrders());
    setWorkOrders(storageService.getWorkOrders());
    setSupplierPOs(storageService.getSupplierPOs());
    setHistory(storageService.getProductionHistory());
    showToast('Örnek fabrika verileri sıfırlandı ve yüklendi.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg shadow-xl border border-amber-300 animate-bounce text-xs sm:text-sm flex items-center gap-2">
          <span>✓ {toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        recipes={recipes}
        materials={materials}
        orders={orders}
        workOrders={workOrders}
        onResetData={handleResetData}
        onExportData={handleExportData}
        onImportData={handleImportData}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'recipes' && (
          <RecipesTab
            recipes={recipes}
            materials={materials}
            onOpenNewRecipe={() => {
              setEditingRecipe(null);
              setIsRecipeModalOpen(true);
            }}
            onEditRecipe={(r) => {
              setEditingRecipe(r);
              setIsRecipeModalOpen(true);
            }}
            onDeleteRecipe={handleDeleteRecipe}
            onCloneRecipe={handleCloneRecipe}
            onConvertToOrder={handleConvertToOrder}
          />
        )}

        {activeTab === 'materials' && (
          <MaterialsTab
            materials={materials}
            suppliers={suppliers}
            onOpenNewMaterial={() => {
              setEditingMaterial(null);
              setIsMaterialModalOpen(true);
            }}
            onEditMaterial={(m) => {
              setEditingMaterial(m);
              setIsMaterialModalOpen(true);
            }}
            onDeleteMaterial={handleDeleteMaterial}
            onOpenSupplierPO={(matId, shortage) => {
              setPoMaterialId(matId);
              setPoShortageQty(shortage);
              setIsPOModalOpen(true);
            }}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            recipes={recipes}
            materials={materials}
            onOpenNewOrder={() => {
              setEditingOrder(null);
              setOrderPreSelectedRecipeId(undefined);
              setIsOrderModalOpen(true);
            }}
            onEditOrder={(ord) => {
              setEditingOrder(ord);
              setIsOrderModalOpen(true);
            }}
            onDeleteOrder={handleDeleteOrder}
            onConvertToWorkOrder={handleConvertToWorkOrder}
            onOpenCreateWorkOrder={() => setIsCreateWorkOrderModalOpen(true)}
            onConvertMultipleOrdersToWorkOrder={handleConvertMultipleOrdersToWorkOrder}
            onOpenSupplierPO={(matId, shortage) => {
              setPoMaterialId(matId);
              setPoShortageQty(shortage);
              setIsPOModalOpen(true);
            }}
          />
        )}

        {activeTab === 'workOrders' && (
          <WorkOrdersTab
            workOrders={workOrders}
            onOpenNewWorkOrder={() => setIsCreateWorkOrderModalOpen(true)}
            onOpenWorkOrderModal={(wo) => {
              setActiveWorkOrder(wo);
              setIsWorkOrderModalOpen(true);
            }}
            onDeductStock={handleDeductStock}
            onCompleteWorkOrder={handleCompleteWorkOrder}
            onDeleteWorkOrder={(id) => {
              if (window.confirm('Bu iş emrini silmek istediğinize emin misiniz?')) {
                updateWorkOrders(workOrders.filter((w) => w.id !== id));
                showToast('İş emri silindi.');
              }
            }}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersTab
            suppliers={suppliers}
            supplierPOs={supplierPOs}
            materials={materials}
            onOpenNewSupplier={() => {
              setEditingSupplier(null);
              setIsSupplierModalOpen(true);
            }}
            onOpenNewPO={(supId) => {
              setPoMaterialId(undefined);
              setPoShortageQty(undefined);
              setIsPOModalOpen(true);
            }}
            onReceivePO={handleReceivePO}
            onDeletePO={handleDeletePO}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab
            recipes={recipes}
            history={history}
            orders={orders}
            materials={materials}
            onAddHistoryLog={(log) => updateHistory([log, ...history])}
          />
        )}
      </main>

      {/* Modals */}
      <RecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        recipe={editingRecipe}
        onSave={handleSaveRecipe}
        materialsList={materials}
      />

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        order={editingOrder}
        recipes={recipes}
        materialsList={materials}
        preSelectedRecipeId={orderPreSelectedRecipeId}
        onSave={handleSaveOrder}
        onOpenSupplierPO={(matId, shortage) => {
          setPoMaterialId(matId);
          setPoShortageQty(shortage);
          setIsPOModalOpen(true);
        }}
      />

      <MaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        material={editingMaterial}
        suppliers={suppliers}
        onSave={handleSaveMaterial}
      />

      <PurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        suppliers={suppliers}
        materialsList={materials}
        initialMaterialId={poMaterialId}
        initialShortageQty={poShortageQty}
        onSavePO={handleSavePO}
      />

      <WorkOrderModal
        isOpen={isWorkOrderModalOpen}
        onClose={() => setIsWorkOrderModalOpen(false)}
        workOrder={activeWorkOrder}
        onUpdateStatus={(woId, status) => {
          updateWorkOrders(
            workOrders.map((w) => (w.id === woId ? { ...w, status } : w))
          );
        }}
        onDeductStock={handleDeductStock}
        onUpdateStationProgress={handleUpdateStationProgress}
      />

      <CreateWorkOrderModal
        isOpen={isCreateWorkOrderModalOpen}
        onClose={() => setIsCreateWorkOrderModalOpen(false)}
        recipes={recipes}
        materialsList={materials}
        onSaveWorkOrder={handleSaveMultiModelWorkOrder}
      />

      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        supplier={editingSupplier}
        onSave={handleSaveSupplier}
      />
    </div>
  );
}
