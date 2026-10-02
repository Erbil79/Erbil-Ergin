import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  DollarSign,
  Layers,
  Image as ImageIcon,
  HelpCircle,
  Sparkles,
  Calculator,
  Search,
  Check,
  Filter,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import {
  SlipperRecipe,
  RecipeMaterialItem,
  RecipeExpense,
  RawMaterial,
  MaterialCategory,
  MaterialUnit,
  TrendyolPricingConfig,
} from '../../types';
import {
  calculateRecipeCost,
  calculateTrendyolPricing,
  simulateTrendyolSalePrice,
  formatTRY,
} from '../../utils/calculationUtils';
import { exportRecipeToExcel } from '../../utils/excelExportUtils';

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe?: SlipperRecipe | null;
  onSave: (recipe: SlipperRecipe) => void;
  materialsList: RawMaterial[];
}

export const RecipeModal: React.FC<RecipeModalProps> = ({
  isOpen,
  onClose,
  recipe,
  onSave,
  materialsList,
}) => {
  if (!isOpen) return null;

  const isEditing = !!recipe;

  // Form states
  const [name, setName] = useState(recipe?.name || '');
  const [code, setCode] = useState(recipe?.code || `TRL-${Date.now().toString().slice(-4)}`);
  const [category, setCategory] = useState<SlipperRecipe['category']>(recipe?.category || 'Anatomik');
  const [description, setDescription] = useState(recipe?.description || '');
  const [imageUrl, setImageUrl] = useState(
    recipe?.imageUrl || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&auto=format&fit=crop&q=80'
  );
  const [colorsText, setColorsText] = useState((recipe?.colors || ['Siyah', 'Taba', 'Beyaz']).join(', '));
  const [soleMaterialId, setSoleMaterialId] = useState(recipe?.soleMaterialId || '');
  const [notes, setNotes] = useState(recipe?.notes || '');

  const [materials, setMaterials] = useState<RecipeMaterialItem[]>(
    recipe?.materials || []
  );

  const [expenses, setExpenses] = useState<RecipeExpense[]>(
    recipe?.expenses || [
      { id: 'exp-1', name: 'Kesim ve Saya Dikiş İşçiliği', type: 'iscilik', costPerPair: 30 },
      { id: 'exp-2', name: 'Taban Pres & Montaj İşçiliği', type: 'iscilik', costPerPair: 22 },
      { id: 'exp-3', name: 'Elektrik & Makine Enerji Gideri', type: 'enerji', costPerPair: 6 },
      { id: 'exp-4', name: 'Kalıp & Bıçak Amortismanı', type: 'kalip_amortisman', costPerPair: 4 },
      { id: 'exp-5', name: 'Genel Fabrika & Paketleme Payı', type: 'genel_gider', costPerPair: 7 },
    ]
  );

  // Calculate live total cost from materials and expenses
  const currentTotalCost =
    materials.reduce((sum, m) => {
      const scrapFactor = 1 + (m.scrapPercentage || 0) / 100;
      return sum + (m.quantityPerPair || 0) * (m.unitCost || 0) * scrapFactor;
    }, 0) +
    expenses.reduce((sum, e) => sum + (e.costPerPair || 0), 0);

  // Manual Gross Profit per Pair (₺) - user-defined
  const [manualGrossProfit, setManualGrossProfit] = useState<number>(() => {
    if (recipe?.manualGrossProfitPerPair !== undefined) {
      return recipe.manualGrossProfitPerPair;
    }
    if (recipe?.targetWholesalePrice && recipe.targetWholesalePrice > currentTotalCost) {
      return Number((recipe.targetWholesalePrice - currentTotalCost).toFixed(2));
    }
    return 75;
  });

  const [targetWholesalePrice, setTargetWholesalePrice] = useState<number>(() => {
    if (recipe?.targetWholesalePrice) return recipe.targetWholesalePrice;
    return Number((currentTotalCost + 75).toFixed(2));
  });

  const [targetRetailPrice, setTargetRetailPrice] = useState<number>(recipe?.targetRetailPrice || 450);

  const handleProfitChange = (newProfit: number) => {
    setManualGrossProfit(newProfit);
    const newWholesale = Number((currentTotalCost + newProfit).toFixed(2));
    setTargetWholesalePrice(newWholesale);
  };

  const handleWholesalePriceChange = (newPrice: number) => {
    setTargetWholesalePrice(newPrice);
    const diff = Number((newPrice - currentTotalCost).toFixed(2));
    setManualGrossProfit(diff > 0 ? diff : 0);
  };

  const handlePercentChange = (pct: number) => {
    const profit = Number((currentTotalCost * (pct / 100)).toFixed(2));
    setManualGrossProfit(profit);
    setTargetWholesalePrice(Number((currentTotalCost + profit).toFixed(2)));
  };

  // Trendyol Marketplace pricing states
  const [trendyolCommissionRate, setTrendyolCommissionRate] = useState<number>(
    recipe?.trendyolPricing?.commissionRate ?? 21
  );
  const [trendyolShippingCost, setTrendyolShippingCost] = useState<number>(
    recipe?.trendyolPricing?.shippingCost ?? 55
  );
  const [trendyolServiceFee, setTrendyolServiceFee] = useState<number>(
    recipe?.trendyolPricing?.serviceFee ?? 8.5
  );
  const [trendyolReturnReserveRate, setTrendyolReturnReserveRate] = useState<number>(
    recipe?.trendyolPricing?.returnReserveRate ?? 5
  );
  const [trendyolTargetNetProfit, setTrendyolTargetNetProfit] = useState<number>(
    recipe?.trendyolPricing?.targetNetProfit ?? 60
  );
  const [showTrendyolSettings, setShowTrendyolSettings] = useState<boolean>(false);
  const [simulatedPrice, setSimulatedPrice] = useState<number | ''>('');

  // Available soles in raw materials
  const soleOptions = materialsList.filter((m) => m.category === 'taban');

  // Search state for raw materials
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('all');
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(true);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  // Filter materials based on search query and category
  const matchingMaterials = materialsList.filter((m) => {
    const q = materialSearchQuery.trim().toLocaleLowerCase('tr-TR');
    const matchesText =
      !q ||
      m.name.toLocaleLowerCase('tr-TR').includes(q) ||
      m.code.toLocaleLowerCase('tr-TR').includes(q) ||
      m.supplierName.toLocaleLowerCase('tr-TR').includes(q) ||
      m.category.toLocaleLowerCase('tr-TR').includes(q) ||
      m.colors.some((c) => c.toLocaleLowerCase('tr-TR').includes(q));

    const matchesCategory =
      materialCategoryFilter === 'all' || m.category === materialCategoryFilter;

    return matchesText && matchesCategory;
  });

  // Handle adding raw material
  const handleAddMaterial = (matId: string) => {
    const raw = materialsList.find((m) => m.id === matId);
    if (!raw) return;

    // If it's a sole, mark as sole
    const isSole = raw.category === 'taban';
    if (isSole) {
      setSoleMaterialId(raw.id);
    }

    const newItem: RecipeMaterialItem = {
      materialId: raw.id,
      materialName: raw.name,
      category: raw.category,
      unit: raw.unit,
      quantityPerPair: isSole ? 1 : 0.1,
      unitCost: raw.unitPrice,
      scrapPercentage: isSole ? 1 : 4,
      isSole,
    };

    setMaterials([...materials, newItem]);
  };

  const handleUpdateMaterial = (index: number, updates: Partial<RecipeMaterialItem>) => {
    const next = [...materials];
    next[index] = { ...next[index], ...updates };
    setMaterials(next);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const handleAddExpense = () => {
    const newExp: RecipeExpense = {
      id: `exp-${Date.now()}`,
      name: 'Yeni Üretim Masrafı',
      type: 'iscilik',
      costPerPair: 10,
    };
    setExpenses([...expenses, newExp]);
  };

  const handleUpdateExpense = (index: number, updates: Partial<RecipeExpense>) => {
    const next = [...expenses];
    next[index] = { ...next[index], ...updates };
    setExpenses(next);
  };

  const handleRemoveExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  // Image file upload handler
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Live calculation of current recipe state
  const tempRecipe: SlipperRecipe = {
    id: recipe?.id || 'temp',
    code,
    name,
    category,
    description,
    imageUrl,
    colors: colorsText.split(',').map((c) => c.trim()).filter(Boolean),
    materials,
    expenses,
    soleMaterialId,
    targetWholesalePrice,
    targetRetailPrice,
    manualGrossProfitPerPair: Number(manualGrossProfit) || 0,
    targetProfitMarginPercent: 0,
    notes,
    createdAt: recipe?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const costBreakdown = calculateRecipeCost(tempRecipe);

  // Live calculation of Trendyol marketplace pricing
  const trendyolConfig: TrendyolPricingConfig = calculateTrendyolPricing(
    costBreakdown.totalCostPerPair,
    {
      commissionRate: trendyolCommissionRate,
      shippingCost: trendyolShippingCost,
      serviceFee: trendyolServiceFee,
      returnReserveRate: trendyolReturnReserveRate,
      targetNetProfit: trendyolTargetNetProfit,
    }
  );

  const activeSimulationPrice =
    simulatedPrice !== '' ? Number(simulatedPrice) : trendyolConfig.recommendedSalePrice;

  const simulationResult = simulateTrendyolSalePrice(
    activeSimulationPrice,
    costBreakdown.totalCostPerPair,
    trendyolConfig
  );

  tempRecipe.trendyolPricing = trendyolConfig;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Lütfen model adını giriniz.');
      return;
    }

    const cleanedColors = colorsText
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const savedRecipe: SlipperRecipe = {
      id: recipe?.id || `rec-${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      category,
      description,
      imageUrl,
      colors: cleanedColors.length > 0 ? cleanedColors : ['Standart'],
      materials,
      expenses,
      soleMaterialId: soleMaterialId || materials.find((m) => m.isSole)?.materialId,
      targetWholesalePrice: Number(targetWholesalePrice) || 0,
      targetRetailPrice: Number(targetRetailPrice) || 0,
      manualGrossProfitPerPair: Number(manualGrossProfit) || 0,
      targetProfitMarginPercent: Number(costBreakdown.grossProfitMarginPercent.toFixed(1)),
      trendyolPricing: trendyolConfig,
      notes,
      createdAt: recipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(savedRecipe);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Reçeteyi Düzenle' : 'Yeni Terlik Reçetesi & Maliyet Hesabı'}
              </h2>
              <p className="text-xs text-slate-400">
                Model hammadde sarfiyatları, 36-45 taban bağlantısı ve üretim masraflarını belirleyin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Model Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-800/40 p-4 rounded-lg border border-slate-800">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Model Kodu *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Örn: TRL-2026-01"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Model Adı *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Anatomik Çift Tokalı Mantar Terlik"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="Anatomik">Anatomik / Mantar</option>
                <option value="Eva Havuz">EVA Havuz & Plaj</option>
                <option value="Peluş Ev">Peluş Kışlık Ev Terliği</option>
                <option value="Sabo Ortopedik">Sabo Ortopedik / Medikal</option>
                <option value="Plaj / Parmak Arası">Plaj / Parmak Arası</option>
                <option value="Deri Günlük">Deri Günlük / Sokak</option>
                <option value="Diğer">Diğer Terlik Çeşidi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Renk Varyantları (Virgülle ayırın)
              </label>
              <input
                type="text"
                value={colorsText}
                onChange={(e) => setColorsText(e.target.value)}
                placeholder="Siyah, Taba, Beyaz, Haki"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Taban Modeli (36-45 Varyantlı Stok)
              </label>
              <select
                value={soleMaterialId}
                onChange={(e) => setSoleMaterialId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="">-- Taban Seçiniz --</option>
                {soleOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Model Image preview & upload */}
            <div className="md:col-span-3 flex flex-col sm:flex-row gap-4 items-start pt-2">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden flex-shrink-0 relative group">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Model Önizleme"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <ImageIcon className="w-6 h-6 mb-1" />
                    <span className="text-[10px]">Resim Yok</span>
                  </div>
                )}
              </div>

              <div className="flex-1 w-full space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Model Resmi (Görsel URL veya Bilgisayardan Yükle)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                  />
                  <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-medium text-slate-200 cursor-pointer transition-colors flex items-center gap-1.5 whitespace-nowrap">
                    <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dosya Seç</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500">
                  İpucu: Resimler sipariş ve iş emri çıktılarında personelin doğru modeli üretmesi için gösterilir.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1: MATERIALS (BOM - Reçete Hammaddeleri) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-200 uppercase tracking-wider">
                  1. Hammadde ve Malzeme Sarfiyatı (1 Çift İçin)
                </span>
                <span className="text-xs text-slate-400">
                  ({materials.length} Malzeme Tanımlı)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSearchPanelOpen(!isSearchPanelOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isSearchPanelOpen
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearchPanelOpen ? 'Aramayı Gizle' : 'Hammadde Ara & Ekle'}</span>
                </button>
              </div>
            </div>

            {/* ARAMA ÇUBUĞU & HAMMADDE SEÇİM PANELİ */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={materialSearchQuery}
                    onChange={(e) => {
                      setMaterialSearchQuery(e.target.value);
                      if (!isSearchPanelOpen) setIsSearchPanelOpen(true);
                    }}
                    onFocus={() => setIsSearchPanelOpen(true)}
                    placeholder="Hammadde adı, kodu, kategori veya tedarikçi ara (örn: Deri, EVA, Taban, Mantar, Toka, İlaç)..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  {materialSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setMaterialSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchPanelOpen(true);
                      setMaterialCategoryFilter('all');
                      setMaterialSearchQuery('');
                    }}
                    className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 whitespace-nowrap"
                  >
                    Tümünü Göster ({materialsList.length})
                  </button>
                </div>
              </div>

              {/* Kategori Filtre Butonları */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
                <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Kategori:
                </span>
                {[
                  { id: 'all', label: 'Tümü' },
                  { id: 'taban', label: 'Tabanlar' },
                  { id: 'saya', label: 'Saya & Deri' },
                  { id: 'astar', label: 'Astar' },
                  { id: 'toka', label: 'Toka' },
                  { id: 'yapistirici', label: 'Yapıştırıcı' },
                  { id: 'iplik', label: 'İplik' },
                  { id: 'ambalaj', label: 'Ambalaj' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setMaterialCategoryFilter(cat.id);
                      setIsSearchPanelOpen(true);
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                      materialCategoryFilter === cat.id
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Arama Sonuçları Listesi */}
              {isSearchPanelOpen && (
                <div className="mt-2 border border-slate-800 rounded-lg bg-slate-900/90 overflow-hidden">
                  <div className="px-3 py-1.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Bulunan Hammaddeler:{' '}
                      <strong className="text-amber-400">{matchingMaterials.length} adet</strong>
                      {materialSearchQuery && ` ("${materialSearchQuery}" için)`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSearchPanelOpen(false)}
                      className="text-slate-400 hover:text-white text-[11px] underline"
                    >
                      Paneli Kapat
                    </button>
                  </div>

                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                    {matchingMaterials.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Arama kriterlerine uygun hammadde bulunamadı.
                      </div>
                    ) : (
                      matchingMaterials.map((m) => {
                        const alreadyInRecipe = materials.some((rm) => rm.materialId === m.id);
                        const justAdded = lastAddedId === m.id;

                        return (
                          <div
                            key={m.id}
                            className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/50 transition-colors text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded bg-slate-950 border border-slate-700/80 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {m.imageUrl ? (
                                  <img
                                    src={m.imageUrl}
                                    alt={m.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[9px] text-slate-500 uppercase">
                                    {m.category.slice(0, 3)}
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-100 truncate">
                                    {m.name}
                                  </span>
                                  <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 px-1.5 rounded">
                                    {m.code}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                  <span className="uppercase text-[10px] font-medium text-slate-300">
                                    {m.category}
                                  </span>
                                  <span>·</span>
                                  <span>{m.supplierName}</span>
                                  <span>·</span>
                                  <span className="text-slate-300">
                                    Stok: {m.currentStock} {m.unit}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                <span className="font-mono font-bold text-emerald-400 text-xs">
                                  {formatTRY(m.unitPrice)}
                                </span>
                                <span className="text-[10px] text-slate-500 block">/ {m.unit}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  handleAddMaterial(m.id);
                                  setLastAddedId(m.id);
                                  setTimeout(() => setLastAddedId(null), 1500);
                                }}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                                  justAdded
                                    ? 'bg-emerald-500 text-slate-950 scale-105'
                                    : alreadyInRecipe
                                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                    : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                                }`}
                              >
                                {justAdded ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Eklendi!</span>
                                  </>
                                ) : alreadyInRecipe ? (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Tekrar Ekle</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Reçeteye Ekle</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {materials.length === 0 ? (
              <div className="p-6 bg-slate-800/30 rounded-lg text-center text-slate-400 text-xs border border-dashed border-slate-700">
                Bu modele henüz hammadde eklenmedi. Yukarıdaki arama çubuğundan arayarak veya listeden seçerek hammadde ekleyin.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Malzeme Adı</th>
                      <th className="py-2.5 px-3">Birim</th>
                      <th className="py-2.5 px-3 w-28">1 Çift Sarfiyat</th>
                      <th className="py-2.5 px-3 w-24">Birim Fiyat</th>
                      <th className="py-2.5 px-3 w-20">Fire %</th>
                      <th className="py-2.5 px-3 text-right">Efektif Tutar</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {materials.map((mat, idx) => {
                      const scrapMultiplier = 1 + (mat.scrapPercentage || 0) / 100;
                      const itemTotal = (mat.quantityPerPair || 0) * (mat.unitCost || 0) * scrapMultiplier;

                      return (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-100">{mat.materialName}</div>
                            {mat.isSole && (
                              <span className="text-[10px] text-amber-400 font-mono">
                                36-45 Numara Taban Serisi
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 capitalize text-slate-400">{mat.unit}</td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.001"
                              min="0"
                              value={mat.quantityPerPair}
                              onChange={(e) =>
                                handleUpdateMaterial(idx, {
                                  quantityPerPair: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-amber-400"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={mat.unitCost}
                              onChange={(e) =>
                                handleUpdateMaterial(idx, {
                                  unitCost: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-amber-400"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              value={mat.scrapPercentage}
                              onChange={(e) =>
                                handleUpdateMaterial(idx, {
                                  scrapPercentage: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-amber-400"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-emerald-400 font-mono">
                            {formatTRY(itemTotal)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveMaterial(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-950/60 font-semibold border-t border-slate-800 text-xs">
                    <tr>
                      <td colSpan={5} className="py-2.5 px-3 text-right text-slate-300">
                        Toplam Hammadde Maliyeti (Çift Başına):
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-mono text-sm">
                        {formatTRY(costBreakdown.materialCostPerPair)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 2: PRODUCTION EXPENSES (İşçilik, Enerji, Amortisman) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-sm text-slate-200 uppercase tracking-wider">
                2. Üretim, İşçilik & Genel Masraflar (Çift Başına)
              </span>

              <button
                type="button"
                onClick={handleAddExpense}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Masraf Kalemi Ekle
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {expenses.map((exp, idx) => (
                <div
                  key={exp.id || idx}
                  className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60 space-y-2 relative"
                >
                  <button
                    type="button"
                    onClick={() => handleRemoveExpense(idx)}
                    className="absolute top-2 right-2 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                      Gider Tanımı
                    </label>
                    <input
                      type="text"
                      value={exp.name}
                      onChange={(e) => handleUpdateExpense(idx, { name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                        Tür
                      </label>
                      <select
                        value={exp.type}
                        onChange={(e) => handleUpdateExpense(idx, { type: e.target.value as any })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none"
                      >
                        <option value="iscilik">İşçilik</option>
                        <option value="enerji">Elektrik / Enerji</option>
                        <option value="kalip_amortisman">Kalıp / Amortisman</option>
                        <option value="ambalaj">Ambalaj / Koli</option>
                        <option value="genel_gider">Genel Gider Payı</option>
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-0.5">
                        Tutar (₺)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={exp.costPerPair}
                        onChange={(e) =>
                          handleUpdateExpense(idx, {
                            costPerPair: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end text-xs text-slate-300 font-medium">
              <span>Toplam Üretim Masrafları (Çift Başına): </span>
              <span className="ml-2 font-mono text-amber-400">
                {formatTRY(costBreakdown.expenseCostPerPair)}
              </span>
            </div>
          </div>

          {/* SECTION 3: PROFIT & PRICING BAR */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>3. Birim Maliyet, Manuel Brüt Kar & Satış Fiyatlandırması</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Her model için kar payınızı (₺ / çift) serbestçe elle girebilirsiniz; toptan fiyat ve marj otomatik güncellenir.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
              {/* 1. Net Maliyet */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Toplam Net Çift Maliyeti
                  </span>
                  <span className="text-xl font-bold text-white font-mono">
                    {formatTRY(costBreakdown.totalCostPerPair)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/60 mt-2 flex justify-between">
                  <span>Hammadde: {formatTRY(costBreakdown.materialCostPerPair)}</span>
                  <span>Gider: {formatTRY(costBreakdown.expenseCostPerPair)}</span>
                </div>
              </div>

              {/* 2. Manuel Brüt Kar / Çift (Kullanıcının elle gireceği alan) */}
              <div className="p-3 bg-slate-900 rounded-lg border-2 border-emerald-500/50 shadow-sm flex flex-col justify-between relative group">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">
                      Tahmini Brüt Kar / Çift (₺) *
                    </label>
                    <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold border border-emerald-500/20">
                      %{costBreakdown.grossProfitMarginPercent.toFixed(1)} Marj
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={manualGrossProfit}
                      onChange={(e) => handleProfitChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-emerald-500/60 rounded px-2.5 py-1.5 text-base font-bold text-emerald-300 font-mono focus:outline-none focus:border-emerald-400"
                      placeholder="0.00"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-emerald-500/70 pointer-events-none">
                      ₺ / çift
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 mt-2 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400">Hızlı Oran:</span>
                  <div className="flex items-center gap-1">
                    {[15, 20, 30, 40].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handlePercentChange(pct)}
                        className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-300 text-[10px] font-mono transition-colors border border-slate-700"
                        title={`Maliyetin %${pct}'i kadar kar ekle`}
                      >
                        %{pct}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Toptan Satış Fiyatı */}
              <div className="p-3 bg-slate-900 rounded-lg border border-amber-500/40 flex flex-col justify-between">
                <div>
                  <label className="text-[10px] text-amber-400 uppercase tracking-wider block font-bold mb-1">
                    Toptan Satış Fiyatı (₺)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={targetWholesalePrice}
                      onChange={(e) => handleWholesalePriceChange(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-amber-500/60 rounded px-2.5 py-1.5 text-base font-bold text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-amber-500/70 pointer-events-none">
                      ₺ / çift
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800/60 mt-2">
                  <span>Maliyet ({formatTRY(costBreakdown.totalCostPerPair)}) + Kar ({formatTRY(manualGrossProfit)})</span>
                </div>
              </div>

              {/* 4. Tavsiye Perakende */}
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex flex-col justify-between">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                    Tavsiye Perakende (₺)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={targetRetailPrice}
                      onChange={(e) => setTargetRetailPrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-sm font-semibold text-slate-200 font-mono focus:outline-none focus:border-slate-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                      ₺ / çift
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/60 mt-2">
                  <span>Mağaza / Tüketici etiket fiyatı</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: TRENDYOL PAZAR YERİ FİYATLANDIRMA & MİNİMUM SATIŞ SİMÜLATÖRÜ */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-950 to-orange-950/20 p-4 sm:p-5 rounded-xl border border-orange-500/30 space-y-4 shadow-lg">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-500/20 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/20">
                  TY
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-white">
                      Trendyol Pazar Yeri Satış & Minimum Fiyat Hesaplayıcı
                    </h4>
                    <span className="text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded-full">
                      Pazar Yeri Maliyet Analizi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Trendyol komisyonu (%{trendyolCommissionRate}), kargo ({trendyolShippingCost} ₺), hizmet bedeli ve iade payını ekleyerek zarar etmeyeceğiniz en düşük fiyatı hesaplar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTrendyolSettings(!showTrendyolSettings)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors flex items-center gap-1.5"
              >
                <span>{showTrendyolSettings ? 'Parametreleri Gizle' : 'Trendyol Kesinti Parametreleri'}</span>
                <span className="text-[10px] text-orange-400 font-mono">
                  (Komisyon: %{trendyolCommissionRate}, Kargo: {trendyolShippingCost}₺)
                </span>
              </button>
            </div>

            {/* Collapsible Settings Form */}
            {showTrendyolSettings && (
              <div className="p-3.5 bg-slate-900/90 rounded-lg border border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    Trendyol Komisyonu (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="50"
                      value={trendyolCommissionRate}
                      onChange={(e) => setTrendyolCommissionRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Ayakkabı/Terlik: %21</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    Kargo Ücreti (₺ / Paket)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={trendyolShippingCost}
                      onChange={(e) => setTrendyolShippingCost(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">₺</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Trendyol barem kargo</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    Hizmet Bedeli (₺)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={trendyolServiceFee}
                      onChange={(e) => setTrendyolServiceFee(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">₺</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">İşlem & fatura payı</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">
                    İade & Risk Payı (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="30"
                      value={trendyolReturnReserveRate}
                      onChange={(e) => setTrendyolReturnReserveRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Müşteri iade güvencesi</span>
                </div>

                <div>
                  <label className="text-[10px] text-emerald-400 uppercase tracking-wider block font-bold mb-1">
                    Hedef Net Kar (₺ / Çift)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={trendyolTargetNetProfit}
                      onChange={(e) => setTrendyolTargetNetProfit(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-emerald-500/50 rounded px-2.5 py-1.5 font-mono text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-500 pointer-events-none">₺</span>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Tüm giderler sonrası kar</span>
                </div>
              </div>
            )}

            {/* 2 Main Result Cards: Min Breakeven & Recommended Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CARD 1: EN DÜŞÜK SATIŞ FİYATI (BAŞABAŞ) */}
              <div className="p-4 rounded-xl bg-slate-900 border-2 border-rose-500/50 relative overflow-hidden flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>1. En Düşük Satış Fiyatı (Başabaş)</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/30 font-bold">
                      0 ₺ Kar Noktası
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-mono text-white tracking-tight">
                      {formatTRY(trendyolConfig.minBreakevenPrice)}
                    </span>
                    <span className="text-xs text-rose-400/90 font-medium">/ çift</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                  <div className="flex items-center gap-1 text-rose-300 font-semibold text-[11px]">
                    <span>⚠️ Bu fiyatın ALTINA satarsanız KESİNLİKLE ZARAR EDERSİNİZ!</span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-relaxed">
                    Ürün maliyeti ({formatTRY(costBreakdown.totalCostPerPair)}) + Kargo ({trendyolShippingCost} ₺) + Komisyon (%{trendyolCommissionRate}) ve hizmet kesintilerini tam karşılayan başabaş sınırıdır.
                  </p>
                </div>
              </div>

              {/* CARD 2: TAVSİYE EDİLEN TRENDYOL SATIŞ FİYATI */}
              <div className="p-4 rounded-xl bg-slate-900 border-2 border-orange-500/60 relative overflow-hidden flex flex-col justify-between shadow-md">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                      <span>2. Tavsiye Edilen Trendyol Satış Fiyatı</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-bold">
                      +{trendyolTargetNetProfit} ₺ Net Kar Hedefi
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black font-mono text-orange-300 tracking-tight">
                      {formatTRY(trendyolConfig.recommendedSalePrice)}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/ çift</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-[10.5px] text-slate-300">
                    Tüm kesintiler sonrası cebinize net <strong className="text-emerald-400">+{formatTRY(trendyolTargetNetProfit)}</strong> kalır.
                  </span>
                  <button
                    type="button"
                    onClick={() => setTargetRetailPrice(trendyolConfig.recommendedSalePrice)}
                    className="px-2.5 py-1 rounded bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-[11px] transition-colors flex items-center gap-1 shadow-sm"
                    title="Bu fiyatı yukarıdaki Tavsiye Perakende Fiyatı kutusuna aktar"
                  >
                    <span>Perakende Fiyatına Aktar</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* DETAILED DEDUCTION BREAKDOWN (Kuruşu Kuruşuna Kesinti Tablosu) */}
            <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                {formatTRY(trendyolConfig.recommendedSalePrice)} Tavsiye Fiyatı Üzerinden Kesinti Dökümü (1 Çift İçin):
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">👟 İmalat Maliyeti</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatTRY(costBreakdown.totalCostPerPair)}
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] text-orange-400 block">🏷️ Komisyon (%{trendyolCommissionRate})</span>
                  <span className="font-mono font-bold text-orange-300 text-sm">
                    {formatTRY((trendyolConfig.recommendedSalePrice * trendyolCommissionRate) / 100)}
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] text-blue-400 block">📦 Kargo Bedeli</span>
                  <span className="font-mono font-bold text-blue-300 text-sm">
                    {formatTRY(trendyolShippingCost)}
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] text-purple-400 block">⚙️ Hizmet Bedeli</span>
                  <span className="font-mono font-bold text-purple-300 text-sm">
                    {formatTRY(trendyolServiceFee)}
                  </span>
                </div>

                <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80">
                  <span className="text-[10px] text-amber-400 block">🔄 İade Payı (%{trendyolReturnReserveRate})</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">
                    {formatTRY((costBreakdown.totalCostPerPair * trendyolReturnReserveRate) / 100)}
                  </span>
                </div>

                <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/40">
                  <span className="text-[10px] text-emerald-400 block font-bold">💰 Net Kalan Kar</span>
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    +{formatTRY(trendyolTargetNetProfit)}
                  </span>
                </div>
              </div>
            </div>

            {/* LIVE PRICE SIMULATOR (Kullanıcının İstediği Satış Fiyatını Denemesi) */}
            <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <span>Özel Fiyat Simülatörü:</span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  "Eğer Trendyol'da bu fiyata satarsam ne kazanırım?"
                </span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder={String(trendyolConfig.recommendedSalePrice)}
                    value={simulatedPrice}
                    onChange={(e) => setSimulatedPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-28 bg-slate-950 border border-amber-500/60 rounded px-2.5 py-1 font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-400 text-sm"
                  />
                  <span className="text-slate-400 font-mono">₺</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {simulationResult.isLoss ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/40 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>DİKKAT: Çift başına {formatTRY(Math.abs(simulationResult.netProfit))} ZARAR edersiniz!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/40 font-semibold text-xs font-mono">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Net Karınız: +{formatTRY(simulationResult.netProfit)} / çift (%{simulationResult.profitMarginPercent} Kar Marjı)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportRecipeToExcel(tempRecipe, materialsList)}
              className="px-3.5 py-2 text-xs font-semibold text-emerald-300 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              title="Reçete ve BOM hammadde maliyetlerini Excel (.xlsx) olarak indir"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Reçeteyi Excel'e Aktar (.xlsx)</span>
            </button>
            <span className="hidden sm:inline text-xs text-slate-500">
              * Reçeteyi doğrudan müşteri siparişine dönüştürebilirsiniz.
            </span>
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
              <Calculator className="w-4 h-4" />
              <span>{isEditing ? 'Değişiklikleri Kaydet' : 'Reçeteyi Oluştur'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
