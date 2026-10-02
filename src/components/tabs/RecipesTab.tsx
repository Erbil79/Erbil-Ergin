import React, { useState } from 'react';
import {
  Plus,
  Search,
  Layers,
  ArrowRight,
  Edit2,
  Copy,
  Trash2,
  DollarSign,
  TrendingUp,
  Tag,
  FileSpreadsheet,
} from 'lucide-react';
import { SlipperRecipe, RawMaterial } from '../../types';
import { calculateRecipeCost, calculateTrendyolPricing, formatTRY } from '../../utils/calculationUtils';
import { exportRecipeToExcel } from '../../utils/excelExportUtils';

interface RecipesTabProps {
  recipes: SlipperRecipe[];
  materials: RawMaterial[];
  onOpenNewRecipe: () => void;
  onEditRecipe: (recipe: SlipperRecipe) => void;
  onDeleteRecipe: (recipeId: string) => void;
  onCloneRecipe: (recipe: SlipperRecipe) => void;
  onConvertToOrder: (recipe: SlipperRecipe) => void;
}

export const RecipesTab: React.FC<RecipesTabProps> = ({
  recipes,
  materials,
  onOpenNewRecipe,
  onEditRecipe,
  onDeleteRecipe,
  onCloneRecipe,
  onConvertToOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    'all',
    'Anatomik',
    'Eva Havuz',
    'Peluş Ev',
    'Sabo Ortopedik',
    'Plaj / Parmak Arası',
    'Deri Günlük',
  ];

  const filteredRecipes = recipes.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.colors.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || r.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Model Reçeteleri & Birim Maliyet Hesapları</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Hammadde sarfiyatları, 36-45 taban bağlantıları ve çift başına net üretim kar marjları
          </p>
        </div>

        <button
          onClick={onOpenNewRecipe}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs sm:text-sm shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Model Reçetesi Ekle</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Model adı, kodu veya renk ara..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {cat === 'all' ? 'Tüm Modeller' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recipes Cards Grid */}
      {filteredRecipes.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
          <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">Reçete Bulunamadı</h3>
          <p className="text-xs text-slate-500 mt-1">
            Arama kriterlerinizi değiştirin veya yeni bir terlik modeli reçetesi oluşturun.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecipes.map((recipe) => {
            const cost = calculateRecipeCost(recipe);

            return (
              <div
                key={recipe.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl overflow-hidden shadow-sm flex flex-col transition-all duration-200 group"
              >
                {/* Image and Header */}
                <div className="relative h-44 bg-slate-950 overflow-hidden">
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                      Resim Yok
                    </div>
                  )}

                  <div className="absolute top-2.5 left-2.5 bg-slate-900/90 backdrop-blur-xs text-slate-200 text-[11px] font-medium px-2 py-0.5 rounded border border-slate-700/60 font-mono">
                    {recipe.code}
                  </div>

                  <div className="absolute top-2.5 right-2.5 bg-amber-400 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                    {recipe.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                      {recipe.name}
                    </h3>

                    {recipe.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                        {recipe.description}
                      </p>
                    )}

                    {/* Colors & Materials meta */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                      <span className="text-slate-500 font-medium">Renkler:</span>
                      {recipe.colors.map((c, i) => (
                        <span key={i} className="text-slate-300">
                          {c}
                          {i < recipe.colors.length - 1 ? ' ·' : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Hammadde Sarfiyatı:</span>
                      <span className="font-mono text-slate-300">
                        {formatTRY(cost.materialCostPerPair)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400">
                      <span>İşçilik & Enerji Gideri:</span>
                      <span className="font-mono text-slate-300">
                        {formatTRY(cost.expenseCostPerPair)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/80 font-medium">
                      <span className="text-slate-200">Net Çift Maliyeti:</span>
                      <span className="font-mono font-bold text-white">
                        {formatTRY(cost.totalCostPerPair)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
                      <span className="text-amber-400 font-medium">Hedef Toptan Satış:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {formatTRY(recipe.targetWholesalePrice)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[11px] pt-0.5">
                      <span className="text-emerald-400/90 font-medium">Tahmini Brüt Kar / Çift:</span>
                      <span
                        className={`font-mono font-bold ${
                          cost.grossProfitPerPair >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        +{formatTRY(cost.grossProfitPerPair)} (%{cost.grossProfitMarginPercent.toFixed(1)})
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Buttons */}
                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <button
                      onClick={() => onConvertToOrder(recipe)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <span>Siparişe Çevir (36-45 Asorti)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => exportRecipeToExcel(recipe, materials)}
                          title="Reçeteyi ve Maliyetini Excel (.xlsx) Olarak İndir"
                          className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded transition-colors flex items-center gap-1 text-[11px] font-semibold"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Excel</span>
                        </button>
                        <button
                          onClick={() => onEditRecipe(recipe)}
                          title="Reçeteyi Düzenle"
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onCloneRecipe(recipe)}
                          title="Reçeteyi Klonla / Çoğalt"
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-amber-400 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteRecipe(recipe.id)}
                          title="Reçeteyi Sil"
                          className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-[11px] text-slate-500 font-mono">
                        {recipe.materials.length} hammadde kalemi
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
