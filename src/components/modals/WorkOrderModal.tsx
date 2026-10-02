import React from 'react';
import {
  X,
  Factory,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  PackageCheck,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { WorkOrder, SoleSize, ALL_SIZES } from '../../types';
import { formatNumber } from '../../utils/calculationUtils';
import { exportWorkOrderToExcel } from '../../utils/excelExportUtils';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder?: WorkOrder | null;
  onUpdateStatus: (woId: string, status: WorkOrder['status']) => void;
  onDeductStock: (woId: string) => void;
  onUpdateStationProgress: (
    woId: string,
    station: keyof WorkOrder['stationProgress'],
    val: number
  ) => void;
}

export const WorkOrderModal: React.FC<WorkOrderModalProps> = ({
  isOpen,
  onClose,
  workOrder,
  onUpdateStatus,
  onDeductStock,
  onUpdateStationProgress,
}) => {
  if (!isOpen || !workOrder) return null;

  const totalPairs =
    workOrder.totalPairs ||
    (workOrder.sizeDistribution
      ? ALL_SIZES.reduce(
          (sum, sz) => sum + (workOrder.sizeDistribution?.[sz] || 0),
          0
        )
      : 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white font-mono">
                  {workOrder.workOrderNumber}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded uppercase font-semibold bg-slate-800 text-amber-400 border border-slate-700">
                  {workOrder.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sipariş Ref: {workOrder.orderNumber} · Müşteri: {workOrder.customerName}
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

        {/* Content (printable container) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 print:p-0 print:bg-white print:text-black">
          {/* Top Batch Summary Banner */}
          <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-800/40 p-4 rounded-xl border border-slate-800">
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">
                  Üretim İş Emri Partisi
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20 font-bold">
                  {(workOrder.models && workOrder.models.length > 0) ? workOrder.models.length : 1} Farklı Model
                </span>
              </div>
              <h3 className="text-base font-bold text-white">{workOrder.customerName}</h3>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
                <span>Hedef Termin: <strong>{workOrder.targetEndDate}</strong></span>
                <span>·</span>
                <span>
                  Genel Toplam Üretim: <strong className="text-emerald-400 font-mono text-sm">{workOrder.totalPairs} Çift</strong>
                </span>
              </div>
            </div>

            {/* Stock deduction indicator & button */}
            <div className="text-right flex-shrink-0">
              {workOrder.stockDeducted ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tüm Stoklardan Düşüldü</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onDeductStock(workOrder.id)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded text-xs text-amber-300 font-semibold transition-colors shadow-sm"
                >
                  <Layers className="w-4 h-4" />
                  <span>36-45 Taban & Hammaddeleri Stoktan Düş</span>
                </button>
              )}
            </div>
          </div>

          {/* LIST OF ALL MODELS IN THIS WORK ORDER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider">
                İş Emrine Dahil Olan Modeller & 36-45 Numara Dağılımları ({(workOrder.models && workOrder.models.length > 0) ? workOrder.models.length : 1} Model)
              </span>
              <span className="text-xs font-mono text-amber-400 font-bold">
                Genel Toplam: {workOrder.totalPairs} Çift
              </span>
            </div>

            {((workOrder.models && workOrder.models.length > 0)
              ? workOrder.models
              : [
                  {
                    id: 'single',
                    recipeId: workOrder.recipeId || '',
                    recipeName: workOrder.recipeName || 'Terlik Modeli',
                    recipeCode: '',
                    selectedColor: workOrder.selectedColor || 'Standart',
                    modelImageUrl: workOrder.modelImageUrl,
                    sizeDistribution: workOrder.sizeDistribution || ({} as any),
                    totalPairs: workOrder.totalPairs,
                  },
                ]
            ).map((modelItem, mIdx) => (
              <div
                key={modelItem.id || mIdx}
                className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3"
              >
                {/* Model Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400 font-mono">
                      {mIdx + 1}
                    </span>

                    <div className="w-12 h-12 rounded bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0">
                      {modelItem.modelImageUrl ? (
                        <img
                          src={modelItem.modelImageUrl}
                          alt={modelItem.recipeName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">
                          Resim Yok
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{modelItem.recipeName}</h4>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        {modelItem.recipeCode && <span className="font-mono text-amber-400">{modelItem.recipeCode}</span>}
                        {modelItem.recipeCode && <span>·</span>}
                        <span>Renk: <strong className="text-amber-300">{modelItem.selectedColor}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block">Model Üretim Adedi</span>
                    <span className="text-base font-bold font-mono text-emerald-400">
                      {modelItem.totalPairs} Çift
                    </span>
                  </div>
                </div>

                {/* 36 - 45 Size Matrix */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                  {ALL_SIZES.map((sz) => {
                    const count = modelItem.sizeDistribution?.[sz] || 0;
                    return (
                      <div
                        key={sz}
                        className={`p-1.5 rounded text-center border ${
                          count > 0
                            ? 'bg-slate-900 border-amber-500/50 text-white'
                            : 'bg-slate-950 border-slate-800/80 text-slate-500'
                        }`}
                      >
                        <span className="block text-[10px] font-semibold text-slate-400">
                          {sz} No
                        </span>
                        <span className="block text-xs font-bold font-mono my-0.5">
                          {count}
                        </span>
                        <span className="block text-[9px] text-slate-500">çift</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* STATION PROGRESS (Kesim, Saya, Pres, Paket) */}
          <div className="space-y-3">
            <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider block border-b border-slate-800 pb-2">
              Üretim İstasyonları & İlerleme
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { key: 'kesim', label: '1. Saya & Astar Kesim' },
                { key: 'saya', label: '2. Saya Montaj & Dikiş' },
                { key: 'montaj', label: '3. Taban Pres & Yapıştırma' },
                { key: 'paket', label: '4. Kalite & Kutulama' },
              ].map((st) => {
                const progress =
                  workOrder.stationProgress[st.key as keyof WorkOrder['stationProgress']] || 0;
                return (
                  <div
                    key={st.key}
                    className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/60 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-200">{st.label}</span>
                      <span className="font-mono font-bold text-amber-400">%{progress}</span>
                    </div>

                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex gap-1 pt-1">
                      {[0, 50, 100].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() =>
                            onUpdateStationProgress(
                              workOrder.id,
                              st.key as any,
                              val
                            )
                          }
                          className={`flex-1 py-0.5 text-[10px] rounded border transition-colors ${
                            progress === val
                              ? 'bg-amber-400 text-slate-950 font-bold border-amber-400'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                          }`}
                        >
                          %{val}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* REQUIRED MATERIALS / ÇIKIŞ FİŞİ */}
          <div className="space-y-3">
            <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider block border-b border-slate-800 pb-2">
              İmalat Reçetesi & Depo Çıkış Listesi
            </span>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Malzeme Adı</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3">Gerekli Miktar</th>
                    <th className="py-2.5 px-3">Tahsis Durumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {workOrder.requiredMaterials.map((rm, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-medium text-slate-100">
                        {rm.materialName}
                        {rm.isSole && (
                          <span className="block text-[10px] text-amber-400">
                            36-45 Asorti Taban Serisi
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 capitalize text-slate-400">{rm.category}</td>
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                        {formatNumber(rm.requiredQuantity)} {rm.unit}
                      </td>
                      <td className="py-2.5 px-3">
                        {workOrder.stockDeducted ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Depodan Çıkışı Yapıldı
                          </span>
                        ) : (
                          <span className="text-amber-400">Tahsis Bekliyor</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportWorkOrderToExcel(workOrder)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
              title="İş emrini ve 36-45 numara taban dağılımlarını Excel (.xlsx) olarak indir"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>İş Emrini Excel'e Aktar (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-colors"
              title="Sayfayı yazdır veya PDF olarak kaydet"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Yazdır (PDF)</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            {workOrder.status !== 'tamamlandi' ? (
              <button
                type="button"
                onClick={() => {
                  onUpdateStatus(workOrder.id, 'tamamlandi');
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-xs font-semibold text-slate-950 transition-colors shadow-sm"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Üretimi Tamamla & Mamul Stoğuna Al</span>
              </button>
            ) : (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Üretim Tamamlandı
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
