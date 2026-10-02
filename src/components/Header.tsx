import React, { useState } from 'react';
import {
  Layers,
  Package,
  ShoppingCart,
  Factory,
  Truck,
  BarChart3,
  AlertTriangle,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { RawMaterial, CustomerOrder, WorkOrder, SlipperRecipe } from '../types';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  recipes: SlipperRecipe[];
  materials: RawMaterial[];
  orders: CustomerOrder[];
  workOrders: WorkOrder[];
  onResetData: () => void;
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  recipes,
  materials,
  orders,
  workOrders,
  onResetData,
  onExportData,
  onImportData,
}) => {
  const [showAlertsPopover, setShowAlertsPopover] = useState(false);

  // Critical stock calculations
  const criticalItems: { name: string; info: string; type: 'material' | 'sole' }[] = [];

  materials.forEach((mat) => {
    if (mat.isSoleFamily && mat.soleStocks && mat.soleMinStocks) {
      Object.entries(mat.soleStocks).forEach(([sz, stock]) => {
        const min = (mat.soleMinStocks as Record<string, number>)?.[sz] ?? 40;
        if (stock < min) {
          criticalItems.push({
            name: `${mat.name} - No: ${sz}`,
            info: `Mevcut: ${stock} çift / Asgari: ${min} çift (Eksik: ${min - stock})`,
            type: 'sole',
          });
        }
      });
    } else {
      if (mat.currentStock < mat.minStockLevel) {
        criticalItems.push({
          name: mat.name,
          info: `Mevcut: ${mat.currentStock} ${mat.unit} / Asgari: ${mat.minStockLevel} ${mat.unit}`,
          type: 'material',
        });
      }
    }
  });

  const activeOrdersCount = orders.filter((o) => o.status === 'uretimde' || o.status === 'bekliyor').length;
  const inProductionPairs = workOrders
    .filter((w) => w.status !== 'tamamlandi')
    .reduce((sum, w) => sum + w.totalPairs, 0);

  const navItems = [
    { id: 'recipes', label: 'Reçeteler & Maliyet', icon: Layers },
    { id: 'materials', label: 'Hammadde & Taban Stok', icon: Package },
    { id: 'orders', label: 'Siparişler & İhtiyaç', icon: ShoppingCart },
    { id: 'workOrders', label: 'İş Emirleri & Üretim', icon: Factory },
    { id: 'suppliers', label: 'Tedarikçi & Satın Alma', icon: Truck },
    { id: 'analytics', label: 'Verimlilik & Analiz', icon: BarChart3 },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-sm">
      {/* Top utility strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wide text-slate-200">TERLİK ÜRETİM ERP</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400 hidden sm:inline">Maliyet, 36-45 Asorti Taban & İş Emri Yönetimi</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Critical stock alert button */}
          <div className="relative">
            <button
              onClick={() => setShowAlertsPopover(!showAlertsPopover)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                criticalItems.length > 0
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>
                {criticalItems.length > 0
                  ? `${criticalItems.length} Kritik Stok Uyarısı`
                  : 'Stoklar Yeterli'}
              </span>
            </button>

            {/* Popover */}
            {showAlertsPopover && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 z-50 text-slate-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                  <div className="flex items-center gap-2 font-medium text-amber-400 text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4" />
                    Kritik Seviyedeki Malzeme ve Tabanlar
                  </div>
                  <button
                    onClick={() => setShowAlertsPopover(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {criticalItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Tüm hammadde ve taban varyantları asgari stok seviyesinin üzerinde.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {criticalItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-slate-800/80 rounded border border-amber-500/30 text-xs"
                      >
                        <div className="font-semibold text-slate-100">{item.name}</div>
                        <div className="text-amber-400 text-[11px] mt-0.5">{item.info}</div>
                      </div>
                    ))}
                  </div>
                )}
                {criticalItems.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      onClick={() => {
                        setShowAlertsPopover(false);
                        setActiveTab('suppliers');
                      }}
                      className="text-xs text-amber-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      Tedarikçiden Sipariş Ver &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-slate-700 pl-3">
            <button
              onClick={onExportData}
              title="Tüm veritabanını JSON olarak indir"
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Yedek Al</span>
            </button>

            <label
              title="Yedek dosyasını geri yükle"
              className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Yedek Yükle</span>
              <input
                type="file"
                accept=".json"
                onChange={onImportData}
                className="hidden"
              />
            </label>

            <button
              onClick={() => {
                if (window.confirm('Örnek fabrika verilerine geri dönmek istiyor musunuz?')) {
                  onResetData();
                }
              }}
              title="Fabrika varsayılan örnek verilerini geri yükle"
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Terlik Üretim & Maliyet ERP</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Otomatik reçete maliyeti, 36-45 taban stok düşümü, iş emri ve fire analizi
          </p>
        </div>

        {/* Quick KPI Counters */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs">
          <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Aktif Reçete</span>
            <span className="text-sm font-bold text-white">{recipes.length} Model</span>
          </div>
          <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Siparişler</span>
            <span className="text-sm font-bold text-amber-400">{activeOrdersCount} Bekleyen</span>
          </div>
          <div className="bg-slate-800/80 px-3 py-1.5 rounded border border-slate-700/60">
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider">Üretimde</span>
            <span className="text-sm font-bold text-emerald-400">{inProductionPairs} Çift</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-1 border-t border-slate-800">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-t-md transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-800 text-amber-400 border-b-2 border-amber-400 shadow-inner'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
