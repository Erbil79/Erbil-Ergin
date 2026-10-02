import React, { useState } from 'react';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Edit2,
  Trash2,
  ExternalLink,
  Layers,
  Filter,
} from 'lucide-react';
import { RawMaterial, Supplier, MaterialCategory, ALL_SIZES, SoleSize } from '../../types';
import { formatTRY, formatNumber } from '../../utils/calculationUtils';

interface MaterialsTabProps {
  materials: RawMaterial[];
  suppliers: Supplier[];
  onOpenNewMaterial: () => void;
  onEditMaterial: (mat: RawMaterial) => void;
  onDeleteMaterial: (matId: string) => void;
  onOpenSupplierPO: (materialId: string, shortageQty?: number) => void;
}

export const MaterialsTab: React.FC<MaterialsTabProps> = ({
  materials,
  suppliers,
  onOpenNewMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onOpenSupplierPO,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'critical' | 'normal'>('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  const categories = [
    { id: 'all', label: 'Tüm Malzemeler' },
    { id: 'taban', label: 'Tabanlar (36-45)' },
    { id: 'saya', label: 'Saya & Deri' },
    { id: 'astar', label: 'Astar' },
    { id: 'toka', label: 'Toka & Aksesuar' },
    { id: 'yapistirici', label: 'Yapıştırıcı' },
    { id: 'iplik', label: 'İplik' },
    { id: 'ambalaj', label: 'Ambalaj & Kutu' },
  ];

  const filteredMaterials = materials.filter((mat) => {
    const matchesSearch =
      mat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mat.colors.some((c) => c.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || mat.category === selectedCategory;

    const matchesSupplier =
      selectedSupplierId === 'all' || mat.supplierId === selectedSupplierId;

    // Check if any size is critical or main stock is critical
    let isCritical = mat.currentStock < mat.minStockLevel;
    if (mat.isSoleFamily && mat.soleStocks && mat.soleMinStocks) {
      const anySizeCritical = ALL_SIZES.some(
        (sz) => (mat.soleStocks?.[sz] ?? 0) < (mat.soleMinStocks?.[sz] ?? 40)
      );
      if (anySizeCritical) isCritical = true;
    }

    const matchesStock =
      stockStatusFilter === 'all' ||
      (stockStatusFilter === 'critical' && isCritical) ||
      (stockStatusFilter === 'normal' && !isCritical);

    return matchesSearch && matchesCategory && matchesSupplier && matchesStock;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Hammadde Envanteri & 36-45 Taban Stokları</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ölçü birimleri, renk varyantları, tedarikçi kartları ve tek tıkla satın alma siparişi
          </p>
        </div>

        <button
          onClick={onOpenNewMaterial}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs sm:text-sm shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Hammadde / Taban Tanımla</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/80 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hammadde adı, kodu, renk veya tedarikçi ara..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Supplier selector */}
          <div>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
            >
              <option value="all">Tüm Tedarikçiler</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Condition */}
          <div>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-400"
            >
              <option value="all">Tüm Stok Durumları</option>
              <option value="critical">Yalnızca Kritik / Eksik Olanlar</option>
              <option value="normal">Yalnızca Stok Yeterli Olanlar</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === c.id
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Materials List */}
      <div className="space-y-4">
        {filteredMaterials.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
            <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">Hammadde Bulunamadı</h3>
            <p className="text-xs text-slate-500 mt-1">
              Filtrelerinizi sıfırlayın veya yeni bir hammadde kartı oluşturun.
            </p>
          </div>
        ) : (
          filteredMaterials.map((mat) => {
            const isSole = mat.isSoleFamily && mat.category === 'taban';
            const isLowStock = mat.currentStock < mat.minStockLevel;

            // Check if any size is low
            const lowSizes: { size: SoleSize; stock: number; min: number }[] = [];
            if (isSole && mat.soleStocks && mat.soleMinStocks) {
              ALL_SIZES.forEach((sz) => {
                const s = mat.soleStocks?.[sz] ?? 0;
                const m = mat.soleMinStocks?.[sz] ?? 40;
                if (s < m) {
                  lowSizes.push({ size: sz, stock: s, min: m });
                }
              });
            }

            const hasWarning = isLowStock || lowSizes.length > 0;

            return (
              <div
                key={mat.id}
                className={`bg-slate-900 border rounded-xl p-4 transition-all ${
                  hasWarning
                    ? 'border-amber-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Image & Info */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden flex-shrink-0">
                      {mat.imageUrl ? (
                        <img
                          src={mat.imageUrl}
                          alt={mat.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">
                          Resim Yok
                        </div>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                          {mat.code}
                        </span>
                        <span className="text-xs text-slate-400 uppercase tracking-wider">
                          {mat.category}
                        </span>
                        {hasWarning && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                            <AlertTriangle className="w-3 h-3" />
                            Kritik Stok Uyarısı
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white">{mat.name}</h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>
                          Birim Fiyat: <strong className="text-slate-200">{formatTRY(mat.unitPrice)}</strong> / {mat.unit}
                        </span>
                        <span>·</span>
                        <span>
                          Tedarikçi: <strong className="text-amber-300">{mat.supplierName}</strong>
                        </span>
                        {mat.colors.length > 0 && (
                          <>
                            <span>·</span>
                            <span>Renkler: {mat.colors.join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Stocks & Actions */}
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Toplam Mevcut Stok</div>
                      <div className="text-lg font-bold font-mono text-white">
                        {formatNumber(mat.currentStock)} {mat.unit}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Asgari Eşik: {formatNumber(mat.minStockLevel)} {mat.unit}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          onOpenSupplierPO(
                            mat.id,
                            hasWarning ? Math.max(mat.minStockLevel - mat.currentStock, 50) : 100
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/40 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Tedarikçiden Sipariş Ver</span>
                      </button>

                      <button
                        onClick={() => onEditMaterial(mat)}
                        title="Hammaddeyi Düzenle"
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteMaterial(mat.id)}
                        title="Hammaddeyi Sil"
                        className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-slate-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* SOLE FAMILY: 36 - 45 NUMARA STOK MATRİSİ */}
                {isSole && mat.soleStocks && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">
                        36 - 45 Numara Taban Stok Matrisi
                      </span>
                      {lowSizes.length > 0 && (
                        <span className="text-rose-400 font-medium">
                          Eksik Numaralar: {lowSizes.map((l) => `${l.size} No (${l.stock})`).join(', ')}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                      {ALL_SIZES.map((sz) => {
                        const stock = mat.soleStocks?.[sz] ?? 0;
                        const min = mat.soleMinStocks?.[sz] ?? 40;
                        const isLow = stock < min;

                        return (
                          <div
                            key={sz}
                            className={`p-1.5 rounded text-center border transition-all ${
                              isLow
                                ? 'bg-rose-950/40 border-rose-500/70 text-rose-200'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="block text-[10px] text-slate-400 font-medium">
                              {sz} No
                            </span>
                            <span
                              className={`block font-mono font-bold text-xs sm:text-sm ${
                                isLow ? 'text-rose-400' : 'text-white'
                              }`}
                            >
                              {stock}
                            </span>
                            <span className="block text-[9px] text-slate-500">
                              min: {min}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
