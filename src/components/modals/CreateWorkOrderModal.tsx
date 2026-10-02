import React, { useState } from 'react';
import {
  X,
  Factory,
  Plus,
  Trash2,
  Package,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Copy,
} from 'lucide-react';
import {
  WorkOrder,
  WorkOrderModelItem,
  SlipperRecipe,
  RawMaterial,
  SoleSize,
  ALL_SIZES,
  SizeQuantityMap,
} from '../../types';
import {
  calculateMultiModelRequirements,
  formatNumber,
} from '../../utils/calculationUtils';

interface CreateWorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipes: SlipperRecipe[];
  materialsList: RawMaterial[];
  onSaveWorkOrder: (workOrder: WorkOrder) => void;
}

export const CreateWorkOrderModal: React.FC<CreateWorkOrderModalProps> = ({
  isOpen,
  onClose,
  recipes,
  materialsList,
  onSaveWorkOrder,
}) => {
  if (!isOpen) return null;

  const [batchTitle, setBatchTitle] = useState('Karma Üretim Partisi - ' + new Date().toLocaleDateString('tr-TR'));
  const [customerOrBatchRef, setCustomerOrBatchRef] = useState('Fabrika İmalat Partisi');
  const [targetEndDate, setTargetEndDate] = useState(
    new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  // Initial models (start with at least 1 or 2 models)
  const [modelItems, setModelItems] = useState<WorkOrderModelItem[]>(() => {
    if (recipes.length === 0) return [];
    const r1 = recipes[0];
    const r2 = recipes.length > 1 ? recipes[1] : recipes[0];

    const defaultDist1: SizeQuantityMap = {
      36: 15, 37: 25, 38: 40, 39: 35, 40: 20, 41: 10, 42: 5, 43: 0, 44: 0, 45: 0,
    };
    const defaultDist2: SizeQuantityMap = {
      36: 0, 37: 0, 38: 0, 39: 10, 40: 25, 41: 35, 42: 30, 43: 20, 44: 15, 45: 5,
    };

    return [
      {
        id: `item-1`,
        recipeId: r1.id,
        recipeName: r1.name,
        recipeCode: r1.code,
        selectedColor: r1.colors[0] || 'Standart',
        modelImageUrl: r1.imageUrl,
        sizeDistribution: defaultDist1,
        totalPairs: ALL_SIZES.reduce((sum, sz) => sum + (defaultDist1[sz] || 0), 0),
      },
      ...(recipes.length > 1
        ? [
            {
              id: `item-2`,
              recipeId: r2.id,
              recipeName: r2.name,
              recipeCode: r2.code,
              selectedColor: r2.colors[0] || 'Standart',
              modelImageUrl: r2.imageUrl,
              sizeDistribution: defaultDist2,
              totalPairs: ALL_SIZES.reduce((sum, sz) => sum + (defaultDist2[sz] || 0), 0),
            },
          ]
        : []),
    ];
  });

  // Add another model to work order (up to 10+ models)
  const handleAddModel = () => {
    const defaultRecipe = recipes[modelItems.length % recipes.length] || recipes[0];
    const defaultDist: SizeQuantityMap = {
      36: 10, 37: 20, 38: 30, 39: 30, 40: 20, 41: 15, 42: 10, 43: 5, 44: 0, 45: 0,
    };

    const newItem: WorkOrderModelItem = {
      id: `wom-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      recipeId: defaultRecipe.id,
      recipeName: defaultRecipe.name,
      recipeCode: defaultRecipe.code,
      selectedColor: defaultRecipe.colors[0] || 'Standart',
      modelImageUrl: defaultRecipe.imageUrl,
      sizeDistribution: defaultDist,
      totalPairs: ALL_SIZES.reduce((sum, sz) => sum + (defaultDist[sz] || 0), 0),
    };

    setModelItems([...modelItems, newItem]);
  };

  const handleRemoveModel = (index: number) => {
    if (modelItems.length <= 1) {
      alert('İş emrinde en az 1 model bulunmalıdır.');
      return;
    }
    setModelItems(modelItems.filter((_, i) => i !== index));
  };

  const handleDuplicateModel = (index: number) => {
    const source = modelItems[index];
    if (!source) return;
    const recipe = recipes.find((r) => r.id === source.recipeId);
    const availableColors = recipe?.colors || ['Standart'];
    const nextColor =
      availableColors.find((c) => c !== source.selectedColor) || source.selectedColor;

    const duplicateItem: WorkOrderModelItem = {
      ...source,
      id: `wom-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      selectedColor: nextColor,
      sizeDistribution: { ...source.sizeDistribution },
    };

    setModelItems([...modelItems, duplicateItem]);
  };

  const handleUpdateModelRecipe = (index: number, newRecipeId: string) => {
    const selectedRecipe = recipes.find((r) => r.id === newRecipeId);
    if (!selectedRecipe) return;

    const next = [...modelItems];
    next[index] = {
      ...next[index],
      recipeId: selectedRecipe.id,
      recipeName: selectedRecipe.name,
      recipeCode: selectedRecipe.code,
      selectedColor: selectedRecipe.colors[0] || 'Standart',
      modelImageUrl: selectedRecipe.imageUrl,
    };
    setModelItems(next);
  };

  const handleUpdateModelColor = (index: number, newColor: string) => {
    const next = [...modelItems];
    next[index] = { ...next[index], selectedColor: newColor };
    setModelItems(next);
  };

  const handleUpdateSize = (index: number, sz: SoleSize, val: number) => {
    const next = [...modelItems];
    const updatedDist = {
      ...next[index].sizeDistribution,
      [sz]: Math.max(0, val || 0),
    };
    const totalPairs = ALL_SIZES.reduce((sum, s) => sum + (updatedDist[s] || 0), 0);
    next[index] = {
      ...next[index],
      sizeDistribution: updatedDist,
      totalPairs,
    };
    setModelItems(next);
  };

  const handleApplyPreset = (index: number, preset: 'kadin' | 'erkek' | 'tam' | 'sifirla') => {
    const next = [...modelItems];
    let dist: SizeQuantityMap;

    if (preset === 'kadin') {
      dist = { 36: 15, 37: 30, 38: 45, 39: 40, 40: 20, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 };
    } else if (preset === 'erkek') {
      dist = { 36: 0, 37: 0, 38: 0, 39: 10, 40: 30, 41: 45, 42: 40, 43: 25, 44: 15, 45: 10 };
    } else if (preset === 'tam') {
      dist = { 36: 10, 37: 20, 38: 30, 39: 30, 40: 25, 41: 20, 42: 15, 43: 10, 44: 8, 45: 5 };
    } else {
      dist = { 36: 0, 37: 0, 38: 0, 39: 0, 40: 0, 41: 0, 42: 0, 43: 0, 44: 0, 45: 0 };
    }

    const totalPairs = ALL_SIZES.reduce((sum, s) => sum + (dist[s] || 0), 0);
    next[index] = {
      ...next[index],
      sizeDistribution: dist,
      totalPairs,
    };
    setModelItems(next);
  };

  // Grand totals across all models
  const grandTotalPairs = modelItems.reduce((sum, m) => sum + m.totalPairs, 0);

  // Consolidated requirement calculations across all models
  const multiReport = calculateMultiModelRequirements(modelItems, recipes, materialsList);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modelItems.length === 0) {
      alert('Lütfen en az 1 model ekleyiniz.');
      return;
    }
    if (grandTotalPairs <= 0) {
      alert('Lütfen modeller için üretim miktarları giriniz.');
      return;
    }

    const woId = `wo-${Date.now()}`;
    const woNumber = `İŞE-2026-${Date.now().toString().slice(-4)}`;

    // Create consolidated WorkOrder
    const newWorkOrder: WorkOrder = {
      id: woId,
      workOrderNumber: woNumber,
      customerName: customerOrBatchRef.trim() || batchTitle.trim(),
      models: modelItems,
      // Backward compatibility fields set to first model
      recipeId: modelItems[0]?.recipeId,
      recipeName: modelItems.length === 1 ? modelItems[0].recipeName : `${modelItems.length} Farklı Model Karma Parti`,
      selectedColor: modelItems[0]?.selectedColor,
      modelImageUrl: modelItems[0]?.modelImageUrl,
      sizeDistribution: modelItems[0]?.sizeDistribution,
      totalPairs: grandTotalPairs,
      status: 'hazirlik',
      startDate: new Date().toISOString().split('T')[0],
      targetEndDate,
      requiredMaterials: multiReport.workOrderItems,
      stockDeducted: false,
      stationProgress: {
        kesim: 0,
        saya: 0,
        montaj: 0,
        paket: 0,
      },
      notes: notes.trim(),
    };

    onSaveWorkOrder(newWorkOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Çoklu Model Fabrika İş Emri Oluştur
              </h2>
              <p className="text-xs text-slate-400">
                Tek bir üretim iş emrine 2, 3, 5 veya 10 farklı model ekleyin; taban ve hammadde gereksinimlerini toplu yönetin
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Work Order Top Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                İş Emri / Parti Başlığı *
              </label>
              <input
                type="text"
                required
                value={batchTitle}
                onChange={(e) => setBatchTitle(e.target.value)}
                placeholder="Örn: 2026 Bahar Koleksiyonu Seri Üretimi"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Müşteri veya Üretim Referansı
              </label>
              <input
                type="text"
                value={customerOrBatchRef}
                onChange={(e) => setCustomerOrBatchRef(e.target.value)}
                placeholder="Örn: Akdeniz Toptan & Ege Otelleri"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hedef Tamamlanma Tarihi
              </label>
              <input
                type="date"
                value={targetEndDate}
                onChange={(e) => setTargetEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* MODELS LIST IN THIS WORK ORDER */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-200 uppercase tracking-wider">
                  İş Emrine Dahil Olan Terlik Modelleri ({modelItems.length} Model)
                </span>
                <span className="text-xs text-amber-400 font-mono font-bold bg-amber-400/10 px-2 py-0.5 rounded">
                  Genel Toplam: {grandTotalPairs} Çift
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddModel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Başka Bir Model Ekle ({modelItems.length + 1}. Model)</span>
              </button>
            </div>

            {/* Individual Model Cards */}
            <div className="space-y-4">
              {modelItems.map((item, idx) => {
                const recipe = recipes.find((r) => r.id === item.recipeId);

                return (
                  <div
                    key={item.id}
                    className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 relative group"
                  >
                    {/* Top Row: Model Selector & Color */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 font-mono flex-shrink-0">
                          {idx + 1}
                        </span>

                        <div className="w-12 h-12 rounded bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0">
                          {item.modelImageUrl ? (
                            <img
                              src={item.modelImageUrl}
                              alt={item.recipeName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600 text-[9px]">
                              Resim Yok
                            </div>
                          )}
                        </div>

                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                              Terlik Modeli
                            </label>
                            <select
                              value={item.recipeId}
                              onChange={(e) => handleUpdateModelRecipe(idx, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                            >
                              {recipes.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.name} ({r.code})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                              Renk Varyantı
                            </label>
                            <select
                              value={item.selectedColor}
                              onChange={(e) => handleUpdateModelColor(idx, e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-amber-300 focus:outline-none focus:border-amber-400"
                            >
                              {(recipe?.colors || ['Standart']).map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase block">Model Toplamı</span>
                          <span className="text-base font-bold font-mono text-white">
                            {item.totalPairs} Çift
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateModel(idx)}
                            className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400 rounded transition-colors flex items-center gap-1 text-[11px]"
                            title="Bu Modeli Çoğalt (Farklı Renk/Numara için)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Çoğalt</span>
                          </button>

                          {modelItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveModel(idx)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors"
                              title="Bu Modeli İş Emrinden Çıkar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Presets for this model */}
                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-900">
                      <span className="text-slate-400">36 - 45 Numara Dağılımı:</span>
                      <div className="flex items-center gap-1 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(idx, 'kadin')}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
                        >
                          Kadın (36-40)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(idx, 'erkek')}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
                        >
                          Erkek (40-45)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(idx, 'tam')}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800"
                        >
                          Tam Seri
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(idx, 'sifirla')}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded border border-slate-800"
                        >
                          Sıfırla
                        </button>
                      </div>
                    </div>

                    {/* 36 - 45 Size Matrix Inputs */}
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {ALL_SIZES.map((sz) => {
                        const count = item.sizeDistribution[sz] || 0;
                        return (
                          <div
                            key={sz}
                            className={`p-1.5 rounded text-center border transition-all ${
                              count > 0
                                ? 'bg-slate-900 border-amber-500/50 text-white'
                                : 'bg-slate-950 border-slate-800/80 text-slate-500'
                            }`}
                          >
                            <span className="block text-[10px] font-semibold text-slate-400">
                              {sz} No
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={count}
                              onChange={(e) =>
                                handleUpdateSize(idx, sz, parseInt(e.target.value) || 0)
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded py-0.5 px-1 text-center text-xs font-bold text-white font-mono focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CONSOLIDATED MATERIAL REQUIREMENT SUMMARY */}
          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider">
                  Tüm Modeller İçin Birleşik Malzeme & Taban İhtiyaç Raporu
                </span>
              </div>

              {multiReport.hasAnyShortage ? (
                <span className="text-xs text-rose-400 font-semibold flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {multiReport.shortagesCount} Hammadde Eksik!
                </span>
              ) : (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Tüm Stoklar Yeterli
                </span>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Malzeme</th>
                    <th className="py-2 px-3">Toplam Gerekli</th>
                    <th className="py-2 px-3">Mevcut Depo Stoğu</th>
                    <th className="py-2 px-3">Durum</th>
                  </tr>
                </thead>
                <tbody className="hidden"></tbody>
                {multiReport.requirements.map((req, i) => (
                  <tbody key={i} className="divide-y divide-slate-800/60 bg-slate-900/40 border-b border-slate-800/60">
                    <tr className={req.isShortage ? 'bg-rose-950/20' : ''}>
                      <td className="py-2 px-3 font-medium text-slate-100">
                        {req.materialName}
                        {req.isSole && (
                          <span className="block text-[10px] text-amber-400 font-mono">
                            Numaralı Taban Serisi
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-200">
                        {formatNumber(req.requiredQuantity)} {req.unit}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-400">
                        {formatNumber(req.currentAvailableStock)} {req.unit}
                      </td>
                      <td className="py-2 px-3">
                        {req.isShortage ? (
                          <span className="text-rose-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {formatNumber(req.shortageQuantity)} {req.unit} Eksik!
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Yeterli
                          </span>
                        )}
                      </td>
                    </tr>

                    {req.isSole && req.sizeBreakdown && req.sizeBreakdown.length > 0 && (
                      <tr className="bg-slate-900/40 text-[11px]">
                        <td colSpan={4} className="py-1.5 px-3">
                          <div className="flex flex-wrap gap-1.5 items-center">
                            <span className="text-slate-400 font-semibold mr-1">
                              Taban Numaraları Toplamı:
                            </span>
                            {req.sizeBreakdown.map((sb) => (
                              <span
                                key={sb.size}
                                className={`px-1.5 py-0.5 rounded font-mono ${
                                  sb.isShortage
                                    ? 'bg-rose-950/80 border border-rose-500 text-rose-300 font-bold'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {sb.size} No: {sb.required} çift{' '}
                                {sb.isShortage ? `(${sb.shortage} eksik)` : `(stok: ${sb.available})`}
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

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              İmalat İstasyon Notları (Kesimhane & Taban Pres Personeli İçin)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: 1. Modelde Taba dikiş, 2. Modelde Siyah dikiş kullanılacak..."
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            * Toplam <strong className="text-amber-400">{modelItems.length} Model</strong> ve{' '}
            <strong className="text-emerald-400">{grandTotalPairs} Çift</strong> için birleşik iş emri açılacaktır.
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
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Factory className="w-4 h-4" />
              <span>Çoklu Model İş Emrini Başlat</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
