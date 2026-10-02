import React, { useState } from 'react';
import {
  Factory,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  Printer,
  ChevronRight,
  Layers,
  Clock,
  PackageCheck,
  Check,
  Plus,
  FileSpreadsheet,
} from 'lucide-react';
import { WorkOrder, ALL_SIZES } from '../../types';
import { exportWorkOrderToExcel } from '../../utils/excelExportUtils';

interface WorkOrdersTabProps {
  workOrders: WorkOrder[];
  onOpenNewWorkOrder: () => void;
  onOpenWorkOrderModal: (wo: WorkOrder) => void;
  onDeductStock: (woId: string) => void;
  onCompleteWorkOrder: (woId: string) => void;
  onDeleteWorkOrder: (woId: string) => void;
}

export const WorkOrdersTab: React.FC<WorkOrdersTabProps> = ({
  workOrders,
  onOpenNewWorkOrder,
  onOpenWorkOrderModal,
  onDeductStock,
  onCompleteWorkOrder,
  onDeleteWorkOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = workOrders.filter((wo) => {
    const matchesSearch =
      wo.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.orderNumber && wo.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      wo.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (wo.models && wo.models.some((m) => m.recipeName.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (wo.recipeName && wo.recipeName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && wo.status !== 'tamamlandi') ||
      (statusFilter === 'completed' && wo.status === 'tamamlandi') ||
      wo.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Fabrika Üretim İş Emirleri & İstasyon Takibi</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tek iş emrinde çoklu model desteği (1-10 model), 36-45 taban adetleri ve otomatik hammadde stok düşümü
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenNewWorkOrder}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs sm:text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Çoklu Model İş Emri Aç</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <div className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-300">
              Aktif: <strong className="text-amber-400">{workOrders.filter((w) => w.status !== 'tamamlandi').length}</strong>
            </div>
            <div className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-300">
              Biten: <strong className="text-emerald-400">{workOrders.filter((w) => w.status === 'tamamlandi').length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="İş emri no, müşteri veya model ara..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 text-xs">
          {[
            { id: 'all', label: 'Tümü' },
            { id: 'active', label: 'Üretimdekiler' },
            { id: 'completed', label: 'Tamamlananlar' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Work Orders Grid */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
            <Factory className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-300">İş Emri Bulunamadı</h3>
            <p className="text-xs text-slate-500 mt-1">
              Siparişler sekmesinden bir siparişi iş emrine dönüştürebilirsiniz.
            </p>
          </div>
        ) : (
          filtered.map((wo) => {
            const isCompleted = wo.status === 'tamamlandi';

            return (
              <div
                key={wo.id}
                className={`bg-slate-900 border rounded-xl overflow-hidden transition-all ${
                  isCompleted ? 'border-slate-800 opacity-85' : 'border-slate-700/80'
                }`}
              >
                {/* Header row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0">
                      {wo.modelImageUrl ? (
                        <img
                          src={wo.modelImageUrl}
                          alt={wo.recipeName}
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
                        <span className="font-mono font-bold text-xs text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {wo.workOrderNumber}
                        </span>
                        {wo.orderNumber && (
                          <span className="text-xs text-slate-400">
                            Sipariş: <strong className="text-slate-300">{wo.orderNumber}</strong>
                          </span>
                        )}
                        {wo.models && wo.models.length > 1 && (
                          <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            {wo.models.length} Farklı Model
                          </span>
                        )}
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            isCompleted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isCompleted ? 'TAMAMLANDI' : 'ÜRETİMDE'}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {wo.customerName}
                      </h3>

                      {wo.models && wo.models.length > 1 ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300 pt-0.5">
                          {wo.models.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-[11px]"
                            >
                              {m.recipeName} ({m.selectedColor}):{' '}
                              <strong className="text-amber-400">{m.totalPairs} çift</strong>
                            </span>
                          ))}
                          <span className="text-slate-500 ml-1">
                            · Termin: <strong className="text-slate-300">{wo.targetEndDate}</strong>
                          </span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-3">
                          <span>
                            Model: <strong className="text-slate-200">{wo.recipeName}</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Renk: <strong className="text-amber-300">{wo.selectedColor}</strong>
                          </span>
                          <span>·</span>
                          <span>
                            Termin: <strong className="text-slate-200">{wo.targetEndDate}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Total */}
                  <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Toplam Üretim
                      </span>
                      <span className="text-lg font-bold font-mono text-white">
                        {wo.totalPairs} Çift
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!wo.stockDeducted && !isCompleted && (
                        <button
                          onClick={() => onDeductStock(wo.id)}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Stoktan Düş</span>
                        </button>
                      )}

                      {!isCompleted ? (
                        <button
                          onClick={() => onCompleteWorkOrder(wo.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-4 h-4" />
                          <span>Tamamla</span>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold px-2.5 py-1 bg-emerald-500/10 rounded border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Depoya Teslim Edildi
                        </span>
                      )}

                      <button
                        onClick={() => exportWorkOrderToExcel(wo)}
                        className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg transition-colors border border-emerald-500/40 flex items-center gap-1 shadow-xs"
                        title="İş emrini ve taban gereksinimlerini Excel (.xlsx) olarak indir"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Excel</span>
                      </button>

                      <button
                        onClick={() => onOpenWorkOrderModal(wo)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Detay & Yazdır</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 36 - 45 NUMARA TABAN DAĞILIMI ŞERİDİ */}
                <div className="px-4 py-2.5 bg-slate-950/70 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="font-semibold text-slate-300 text-[11px] uppercase tracking-wider">
                      {wo.models && wo.models.length > 1
                        ? 'Konsolide 36-45 Taban Adetleri:'
                        : 'İş Emri 36-45 Taban Adetleri:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_SIZES.map((sz) => {
                        const count =
                          wo.models && wo.models.length > 0
                            ? wo.models.reduce(
                                (sum, m) => sum + (m.sizeDistribution?.[sz] || 0),
                                0
                              )
                            : wo.sizeDistribution?.[sz] || 0;

                        if (count === 0) return null;
                        return (
                          <span
                            key={sz}
                            className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-200 font-medium"
                          >
                            {sz} No: <strong className="text-amber-400">{count}</strong>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span
                      className={
                        wo.stockDeducted ? 'text-emerald-400 font-medium' : 'text-amber-400'
                      }
                    >
                      {wo.stockDeducted
                        ? '✓ Taban & Hammadde Stoğu Düşüldü'
                        : '⚠ Stok Düşümü Bekleniyor'}
                    </span>
                  </div>
                </div>

                {/* Station Progress Bars */}
                <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { key: 'kesim', label: '1. Kesim' },
                    { key: 'saya', label: '2. Saya Dikiş' },
                    { key: 'montaj', label: '3. Pres & Montaj' },
                    { key: 'paket', label: '4. Kalite Paket' },
                  ].map((st) => {
                    const prog =
                      wo.stationProgress[st.key as keyof WorkOrder['stationProgress']] || 0;
                    return (
                      <div key={st.key} className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-400">
                          <span>{st.label}</span>
                          <span className="font-mono font-bold text-slate-300">%{prog}</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              prog === 100 ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                            style={{ width: `${prog}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
