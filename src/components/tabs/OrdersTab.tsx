import React, { useState } from 'react';
import {
  Plus,
  Search,
  ShoppingCart,
  Factory,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Edit2,
  Trash2,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { CustomerOrder, SlipperRecipe, RawMaterial, ALL_SIZES } from '../../types';
import {
  calculateOrderRequirements,
  formatTRY,
  formatNumber,
} from '../../utils/calculationUtils';
import { exportOrderToExcel } from '../../utils/excelExportUtils';

interface OrdersTabProps {
  orders: CustomerOrder[];
  recipes: SlipperRecipe[];
  materials: RawMaterial[];
  onOpenNewOrder: () => void;
  onEditOrder: (order: CustomerOrder) => void;
  onDeleteOrder: (orderId: string) => void;
  onConvertToWorkOrder: (order: CustomerOrder) => void;
  onOpenSupplierPO: (materialId: string, shortageQty: number) => void;
  onOpenCreateWorkOrder?: () => void;
  onConvertMultipleOrdersToWorkOrder?: (selectedOrderIds: string[]) => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  recipes,
  materials,
  onOpenNewOrder,
  onEditOrder,
  onDeleteOrder,
  onConvertToWorkOrder,
  onOpenSupplierPO,
  onOpenCreateWorkOrder,
  onConvertMultipleOrdersToWorkOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const statuses = [
    { id: 'all', label: 'Tüm Siparişler' },
    { id: 'bekliyor', label: 'Bekliyor' },
    { id: 'uretimde', label: 'Üretimde' },
    { id: 'tamamlandi', label: 'Tamamlandı' },
    { id: 'sevk_edildi', label: 'Sevk Edildi' },
  ];

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.recipeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.selectedColor.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Müşteri Siparişleri & Malzeme İhtiyaç Planlaması (MRP)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            36-45 numara taban asortileri, stok kontrolü ve tek tıkla üretim iş emrine dönüştürme
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCreateWorkOrder && (
            <button
              onClick={onOpenCreateWorkOrder}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/40 font-bold rounded-lg text-xs sm:text-sm shadow-sm transition-colors"
            >
              <Factory className="w-4 h-4 text-amber-400" />
              <span>+ Çoklu Model İş Emri Aç (1-10 Model)</span>
            </button>
          )}

          <button
            onClick={onOpenNewOrder}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs sm:text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Sipariş Oluştur</span>
          </button>
        </div>
      </div>

      {/* Bulk Selection Action Bar */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-amber-400 text-slate-950 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg font-medium text-xs border border-amber-300 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="w-5 h-5 font-bold flex-shrink-0" />
            <span>
              <strong>{selectedOrderIds.length} Sipariş Seçildi:</strong> Toplam{' '}
              <strong className="font-mono text-sm">
                {selectedOrderIds.reduce(
                  (sum, id) => sum + (orders.find((o) => o.id === id)?.totalPairs || 0),
                  0
                )}{' '}
                Çift
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-1.5 bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 rounded-lg font-semibold transition-colors"
            >
              Seçimi Temizle
            </button>
            {onConvertMultipleOrdersToWorkOrder && (
              <button
                onClick={() => {
                  onConvertMultipleOrdersToWorkOrder(selectedOrderIds);
                  setSelectedOrderIds([]);
                }}
                className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Factory className="w-4 h-4" />
                <span>Seçili {selectedOrderIds.length} Modeli Tek İş Emrinde Birleştir</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sipariş no, müşteri adı veya model ara..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {filteredOrders.length > 0 && (
            <button
              type="button"
              onClick={selectAllFiltered}
              className="px-2.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs text-slate-300 whitespace-nowrap"
              title="Görüntülenen tüm siparişleri seç veya kaldır"
            >
              {selectedOrderIds.length === filteredOrders.length ? 'Tümünü Bırak' : 'Tümünü Seç'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
          {statuses.map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === st.id
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
            <ShoppingCart className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">Sipariş Bulunamadı</h3>
            <p className="text-xs text-slate-500 mt-1">
              Filtrelerinizi değiştirin veya yeni bir müşteri siparişi oluşturun.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const recipe = recipes.find((r) => r.id === order.recipeId);
            const reqReport = recipe
              ? calculateOrderRequirements(recipe, order.sizeDistribution, materials)
              : null;

            const isExpanded = expandedOrderId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-slate-900 border rounded-xl overflow-hidden shadow-sm transition-all ${
                  selectedOrderIds.includes(order.id)
                    ? 'border-amber-400/80 bg-slate-900/90 ring-1 ring-amber-400/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Main Card Strip */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Checkbox + Model & Order Details */}
                  <div className="flex items-center gap-3.5">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => toggleSelectOrder(order.id)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-amber-400 focus:ring-amber-400 focus:ring-offset-slate-950 cursor-pointer flex-shrink-0"
                      title="Çoklu model iş emrinde birleştirmek için seçin"
                    />

                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0">
                        {order.modelImageUrl ? (
                          <img
                            src={order.modelImageUrl}
                            alt={order.recipeName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs">
                            Resim Yok
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          Teslimat: <strong className="text-slate-200">{order.deliveryDate}</strong>
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            order.status === 'uretimde'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              : order.status === 'tamamlandi'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {order.customerName}
                      </h3>

                      <div className="text-xs text-slate-300">
                        <span>Model: <strong className="text-amber-300">{order.recipeName}</strong></span>
                        <span className="mx-2">·</span>
                        <span>Renk: <strong className="text-slate-100">{order.selectedColor}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Financials & Pairs */}
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Toplam Miktar
                      </span>
                      <span className="text-base font-bold text-white font-mono">
                        {order.totalPairs} Çift
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Toplam Tutar
                      </span>
                      <span className="text-base font-bold text-amber-400 font-mono">
                        {formatTRY(order.totalRevenue)}
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Tahmini Brüt Kar
                      </span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {formatTRY(order.estimatedGrossProfit)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-800">
                    {order.status !== 'uretimde' && order.status !== 'tamamlandi' ? (
                      <button
                        onClick={() => onConvertToWorkOrder(order)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-sm transition-colors"
                      >
                        <Factory className="w-4 h-4" />
                        <span>İş Emrine Dönüştür</span>
                      </button>
                    ) : (
                      <span className="text-xs text-blue-400 font-medium px-3 py-1.5 bg-blue-500/10 rounded border border-blue-500/30 flex items-center gap-1">
                        <Factory className="w-3.5 h-3.5" />
                        Üretimde (İş Emri Açık)
                      </span>
                    )}

                    <button
                      onClick={() => exportOrderToExcel(order, recipe, materials)}
                      title="Siparişi ve Malzeme İhtiyaç Raporunu (MRP) Excel (.xlsx) olarak indir"
                      className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors border border-emerald-500/40 flex items-center gap-1 shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Excel</span>
                    </button>

                    <button
                      onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                      className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-800 flex items-center gap-1 text-xs"
                    >
                      <span>İhtiyaç Raporu</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => onEditOrder(order)}
                      title="Siparişi Düzenle"
                      className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors border border-slate-800"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onDeleteOrder(order.id)}
                      title="Siparişi Sil"
                      className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-slate-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 36 - 45 ASORTİ STRIP */}
                <div className="px-4 py-2.5 bg-slate-950/70 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                      36-45 Asorti Dağılımı:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_SIZES.filter((sz) => (order.sizeDistribution[sz] || 0) > 0).map((sz) => (
                        <span
                          key={sz}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-200 font-medium"
                        >
                          {sz} No: <strong>{order.sizeDistribution[sz]}</strong>
                        </span>
                      ))}
                    </div>
                  </div>

                  {reqReport && (
                    <div>
                      {reqReport.hasAnyShortage ? (
                        <span className="flex items-center gap-1 text-rose-400 font-medium text-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {reqReport.shortagesCount} Eksik Hammadde Var!
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Stoklar Üretime Hazır
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* EXPANDED MRP REPORT */}
                {isExpanded && reqReport && (
                  <div className="p-4 bg-slate-950/90 border-t border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-400 uppercase tracking-wider text-[11px]">
                        Detaylı Malzeme ve Taban İhtiyaç Tablosu
                      </span>
                      <span className="text-slate-400">
                        {order.totalPairs} Çift için hesaplanan toplam gereksinim
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-800 rounded-lg">
                      <table className="w-full text-left text-slate-300">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2 px-3">Malzeme</th>
                            <th className="py-2 px-3">Gerekli Miktar</th>
                            <th className="py-2 px-3">Depo Stoğu</th>
                            <th className="py-2 px-3">Durum</th>
                            <th className="py-2 px-3 text-right">Tedarik</th>
                          </tr>
                        </thead>
                        <tbody className="hidden"></tbody>
                        {reqReport.requirements.map((req, idx) => (
                          <tbody key={idx} className="divide-y divide-slate-800/60 bg-slate-900/40 border-b border-slate-800/60">
                            <tr className={req.isShortage ? 'bg-rose-950/20' : ''}>
                              <td className="py-2 px-3 font-medium text-slate-100">
                                {req.materialName}
                                {req.isSole && (
                                  <span className="block text-[10px] text-amber-400">
                                    Numaralı Taban Serisi
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono font-medium text-slate-200">
                                {formatNumber(req.requiredQuantity)} {req.unit}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-300">
                                {formatNumber(req.currentAvailableStock)} {req.unit}
                              </td>
                              <td className="py-2 px-3">
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
                              <td className="py-2 px-3 text-right">
                                {req.isShortage && (
                                  <button
                                    onClick={() =>
                                      onOpenSupplierPO(req.materialId, req.shortageQuantity)
                                    }
                                    className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[11px] font-medium"
                                  >
                                    Sipariş Ver
                                  </button>
                                )}
                              </td>
                            </tr>

                            {req.isSole && req.sizeBreakdown && (
                              <tr className="bg-slate-900/50 text-[11px]">
                                <td colSpan={5} className="py-1.5 px-3">
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    <span className="text-slate-400 font-semibold mr-1">
                                      Taban Numaraları:
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
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
