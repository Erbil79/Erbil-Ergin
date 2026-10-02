import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Package,
} from 'lucide-react';
import {
  CustomerOrder,
  SlipperRecipe,
  RawMaterial,
  SoleSize,
  ALL_SIZES,
  SizeQuantityMap,
} from '../../types';
import {
  calculateRecipeCost,
  calculateOrderRequirements,
  formatTRY,
  formatNumber,
} from '../../utils/calculationUtils';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: CustomerOrder | null;
  recipes: SlipperRecipe[];
  materialsList: RawMaterial[];
  preSelectedRecipeId?: string;
  onSave: (order: CustomerOrder, createWorkOrderNow?: boolean) => void;
  onOpenSupplierPO?: (materialId: string, shortageQty: number) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  order,
  recipes,
  materialsList,
  preSelectedRecipeId,
  onSave,
  onOpenSupplierPO,
}) => {
  if (!isOpen) return null;

  const isEditing = !!order;

  // Initial recipe choice
  const initialRecipeId =
    order?.recipeId || preSelectedRecipeId || (recipes.length > 0 ? recipes[0].id : '');

  const [selectedRecipeId, setSelectedRecipeId] = useState(initialRecipeId);
  const activeRecipe = recipes.find((r) => r.id === selectedRecipeId);

  // Form states
  const [customerName, setCustomerName] = useState(order?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(order?.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState(order?.customerEmail || '');
  const [selectedColor, setSelectedColor] = useState(
    order?.selectedColor || activeRecipe?.colors[0] || 'Standart'
  );
  const [deliveryDate, setDeliveryDate] = useState(
    order?.deliveryDate ||
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [unitSalePrice, setUnitSalePrice] = useState<number>(
    order?.unitSalePrice || activeRecipe?.targetWholesalePrice || 250
  );
  const [notes, setNotes] = useState(order?.notes || '');

  // Size distribution (36 to 45)
  const [sizeDistribution, setSizeDistribution] = useState<SizeQuantityMap>(
    order?.sizeDistribution || {
      36: 10,
      37: 20,
      38: 30,
      39: 30,
      40: 20,
      41: 15,
      42: 10,
      43: 5,
      44: 0,
      45: 0,
    }
  );

  // Sync color and default sale price when recipe changes
  useEffect(() => {
    if (activeRecipe && !isEditing) {
      if (activeRecipe.colors.length > 0 && !activeRecipe.colors.includes(selectedColor)) {
        setSelectedColor(activeRecipe.colors[0]);
      }
      if (!order) {
        setUnitSalePrice(activeRecipe.targetWholesalePrice || 250);
      }
    }
  }, [selectedRecipeId, activeRecipe]);

  // Size quantity changer
  const handleSizeChange = (sz: SoleSize, val: number) => {
    setSizeDistribution((prev) => ({
      ...prev,
      [sz]: Math.max(0, val || 0),
    }));
  };

  // Presets
  const applyPreset = (type: 'kadin' | 'erkek' | 'tam' | 'sifirla') => {
    if (type === 'kadin') {
      setSizeDistribution({
        36: 15,
        37: 30,
        38: 45,
        39: 40,
        40: 20,
        41: 0,
        42: 0,
        43: 0,
        44: 0,
        45: 0,
      });
    } else if (type === 'erkek') {
      setSizeDistribution({
        36: 0,
        37: 0,
        38: 0,
        39: 10,
        40: 30,
        41: 45,
        42: 40,
        43: 25,
        44: 15,
        45: 10,
      });
    } else if (type === 'tam') {
      setSizeDistribution({
        36: 10,
        37: 20,
        38: 30,
        39: 30,
        40: 25,
        41: 20,
        42: 15,
        43: 10,
        44: 8,
        45: 5,
      });
    } else {
      setSizeDistribution({
        36: 0,
        37: 0,
        38: 0,
        39: 0,
        40: 0,
        41: 0,
        42: 0,
        43: 0,
        44: 0,
        45: 0,
      });
    }
  };

  // Requirement calculations
  const totalPairs = ALL_SIZES.reduce((sum, s) => sum + (sizeDistribution[s] || 0), 0);

  const reqReport = activeRecipe
    ? calculateOrderRequirements(activeRecipe, sizeDistribution, materialsList)
    : { totalPairs: 0, requirements: [], hasAnyShortage: false, shortagesCount: 0 };

  const recipeCost = activeRecipe ? calculateRecipeCost(activeRecipe) : null;
  const costPerPair = recipeCost ? recipeCost.totalCostPerPair : 0;
  const totalEstimatedCost = totalPairs * costPerPair;
  const totalRevenue = totalPairs * unitSalePrice;
  const estimatedGrossProfit = totalRevenue - totalEstimatedCost;

  const handleSubmit = (createWorkOrderNow: boolean = false) => {
    if (!customerName.trim()) {
      alert('Lütfen müşteri adını giriniz.');
      return;
    }
    if (!activeRecipe) {
      alert('Lütfen geçerli bir reçete seçiniz.');
      return;
    }
    if (totalPairs <= 0) {
      alert('Lütfen en az 1 numara için sipariş miktarı giriniz.');
      return;
    }

    const savedOrder: CustomerOrder = {
      id: order?.id || `ord-${Date.now()}`,
      orderNumber: order?.orderNumber || `SIP-2026-${Date.now().toString().slice(-4)}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim(),
      recipeId: activeRecipe.id,
      recipeName: activeRecipe.name,
      recipeCode: activeRecipe.code,
      modelImageUrl: activeRecipe.imageUrl,
      selectedColor,
      sizeDistribution,
      totalPairs,
      unitSalePrice,
      totalRevenue,
      estimatedCostPerPair: Number(costPerPair.toFixed(2)),
      estimatedTotalCost: Number(totalEstimatedCost.toFixed(2)),
      estimatedGrossProfit: Number(estimatedGrossProfit.toFixed(2)),
      status: order?.status || 'bekliyor',
      workOrderId: order?.workOrderId,
      orderDate: order?.orderDate || new Date().toISOString().split('T')[0],
      deliveryDate,
      notes,
    };

    onSave(savedOrder, createWorkOrderNow);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Siparişi Düzenle' : 'Yeni Terlik Siparişi & İhtiyaç Raporu'}
              </h2>
              <p className="text-xs text-slate-400">
                Model seçimi, 36-45 asorti dağılımı ve otomatik hammadde stok kontrolü
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-lg border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Müşteri / Mağaza Adı *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Örn: Akdeniz Toptan Terlik"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Telefon / İletişim
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+90 5XX XXX XX XX"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Termin / Teslim Tarihi
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Recipe Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Üretilecek Terlik Modeli (Reçete) *
              </label>
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Color selection */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Renk Varyantı
              </label>
              <select
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                {(activeRecipe?.colors || ['Standart']).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit sale price */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Birim Çift Satış Fiyatı (₺)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={unitSalePrice}
                onChange={(e) => setUnitSalePrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-amber-500/50 rounded px-3 py-2 text-sm text-amber-300 font-bold font-mono focus:outline-none"
              />
            </div>
          </div>

          {/* SECTION: 36 - 45 SIZE MATRIX */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <span className="font-semibold text-sm text-slate-100 uppercase tracking-wider">
                  Numara Asortisi & Taban Dağılımı (36 - 45)
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  (Her numara için otomatik taban stoğu kontrol edilir)
                </span>
              </div>

              {/* Quick Asorti presets */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 mr-1 text-[11px]">Hızlı Asorti:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('kadin')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                >
                  Kadın (36-40)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('erkek')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                >
                  Erkek (40-45)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('tam')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                >
                  Tam Seri (36-45)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('sifirla')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-rose-400"
                >
                  Sıfırla
                </button>
              </div>
            </div>

            {/* Matrix table */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 pt-1">
              {ALL_SIZES.map((sz) => {
                const count = sizeDistribution[sz] || 0;
                // Find stock of sole for this size
                const soleMat = materialsList.find((m) => m.id === activeRecipe?.soleMaterialId);
                const soleStock = soleMat?.soleStocks?.[sz] ?? 0;
                const isShort = soleMat && soleStock < count;

                return (
                  <div
                    key={sz}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      count > 0
                        ? isShort
                          ? 'bg-rose-950/40 border-rose-600/70'
                          : 'bg-slate-800/80 border-amber-500/50'
                        : 'bg-slate-900 border-slate-800 text-slate-500'
                    }`}
                  >
                    <span className="block text-xs font-bold text-slate-300 mb-1">
                      {sz} No
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={count}
                      onChange={(e) => handleSizeChange(sz, parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-1 text-center text-sm font-bold text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                    <div className="mt-1 text-[10px] leading-tight">
                      {soleMat ? (
                        <span className={isShort ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
                          Stok: {soleStock}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals & Profit banner */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-800/80">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-slate-400">Toplam Sipariş:</span>{' '}
                  <span className="text-base font-bold text-white font-mono">{totalPairs} Çift</span>
                </div>
                <div>
                  <span className="text-slate-400">Tahmini Maliyet:</span>{' '}
                  <span className="font-mono text-slate-200">{formatTRY(totalEstimatedCost)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Toplam Tutar:</span>{' '}
                  <span className="font-mono text-amber-400 font-bold">{formatTRY(totalRevenue)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Tahmini Brüt Kar:</span>
                <span
                  className={`font-bold font-mono text-sm ${
                    estimatedGrossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatTRY(estimatedGrossProfit)} (
                  {totalRevenue > 0
                    ? `%${((estimatedGrossProfit / totalRevenue) * 100).toFixed(1)}`
                    : '%0'}
                  )
                </span>
              </div>
            </div>
          </div>

          {/* SECTION: AUTOMATIC MATERIAL REQUIREMENTS REPORT & SHORTAGE ALERT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-sm text-slate-200 uppercase tracking-wider">
                  Otomatik Malzeme İhtiyaç Raporu (MRP)
                </span>
              </div>

              {reqReport.hasAnyShortage ? (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{reqReport.shortagesCount} Hammaddede Stok Yetersiz!</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tüm Hammadde & Taban Stokları Yeterli</span>
                </div>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Malzeme</th>
                    <th className="py-2.5 px-3">Gerekli Miktar</th>
                    <th className="py-2.5 px-3">Mevcut Stok</th>
                    <th className="py-2.5 px-3">Stok Durumu</th>
                    <th className="py-2.5 px-3">Tedarikçi</th>
                    <th className="py-2.5 px-3 text-right">Eylem</th>
                  </tr>
                </thead>
                <tbody className="hidden"></tbody>
                {reqReport.requirements.map((req, idx) => (
                  <tbody key={idx} className="divide-y divide-slate-800/60 bg-slate-900/40 border-b border-slate-800/60">
                    <tr className={req.isShortage ? 'bg-rose-950/20' : 'hover:bg-slate-800/30'}>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-100">{req.materialName}</span>
                        {req.isSole && (
                          <span className="block text-[10px] text-amber-400">
                            36-45 Numara Taban Serisi
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                        {formatNumber(req.requiredQuantity)} {req.unit}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {formatNumber(req.currentAvailableStock)} {req.unit}
                      </td>
                      <td className="py-2.5 px-3">
                        {req.isShortage ? (
                          <span className="text-rose-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {formatNumber(req.shortageQuantity)} {req.unit} Eksik!
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Yeterli
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {req.supplierName || 'Tanımlı Değil'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {req.isShortage && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenSupplierPO) {
                                onOpenSupplierPO(req.materialId, req.shortageQuantity);
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded transition-colors"
                          >
                            Tedarikçiden Sipariş Ver
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* If sole breakdown exists, render sub-row with 36-45 specific detail */}
                    {req.isSole && req.sizeBreakdown && req.sizeBreakdown.length > 0 && (
                      <tr className="bg-slate-950/60 text-[11px]">
                        <td colSpan={6} className="py-2 px-3">
                          <div className="flex flex-wrap gap-2 items-center text-slate-400">
                            <span className="font-semibold text-slate-300 text-[10px] uppercase">
                              Numara Detayı:
                            </span>
                            {req.sizeBreakdown.map((sb) => (
                              <span
                                key={sb.size}
                                className={`px-2 py-0.5 rounded border text-[11px] font-mono ${
                                  sb.isShortage
                                    ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 font-bold'
                                    : 'bg-slate-900 border-slate-800 text-slate-300'
                                }`}
                              >
                                {sb.size} No: {sb.required} çift{' '}
                                {sb.isShortage
                                  ? `(Eksik: ${sb.shortage}!)`
                                  : `(Stok: ${sb.available})`}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            * Sipariş onaylandığında hammadde ihtiyaçları kilitlenir ve tek tıkla fabrikaya iş emri açılabilir.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={() => handleSubmit(false)}
              className="px-4 py-2 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            >
              {isEditing ? 'Siparişi Güncelle' : 'Siparişi Kaydet'}
            </button>
            <button
              onClick={() => handleSubmit(true)}
              className="px-5 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span>Kaydet & İş Emrine Dönüştür</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
