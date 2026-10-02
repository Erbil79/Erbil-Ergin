import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  PackageCheck,
  Printer,
  Send,
  CheckCircle2,
  Trash2,
  ShoppingBag,
} from 'lucide-react';
import { Supplier, SupplierPurchaseOrder, RawMaterial, MaterialCategory } from '../../types';
import { formatTRY, formatNumber } from '../../utils/calculationUtils';

interface SuppliersTabProps {
  suppliers: Supplier[];
  supplierPOs: SupplierPurchaseOrder[];
  materials: RawMaterial[];
  onOpenNewSupplier: () => void;
  onOpenNewPO: (supplierId?: string) => void;
  onReceivePO: (poId: string) => void;
  onDeletePO: (poId: string) => void;
}

export const SuppliersTab: React.FC<SuppliersTabProps> = ({
  suppliers,
  supplierPOs,
  materials,
  onOpenNewSupplier,
  onOpenNewPO,
  onReceivePO,
  onDeletePO,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'suppliers' | 'pos'>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPOs = supplierPOs.filter(
    (po) =>
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplierName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Tedarikçi Yönetimi & Satın Alma Siparişleri</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Hammadde tedarikçileri, acil sipariş talepleri, WhatsApp/E-posta siparişleri ve mal kabul
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenNewPO()}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs sm:text-sm shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Satın Alma Siparişi Aç</span>
          </button>
          <button
            onClick={onOpenNewSupplier}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs sm:text-sm border border-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Tedarikçi Ekle</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveSubTab('suppliers')}
            className={`py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeSubTab === 'suppliers'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Tedarikçi Firmalar ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveSubTab('pos')}
            className={`py-2 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
              activeSubTab === 'pos'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Satın Alma Emirleri / Mal Kabul ({supplierPOs.length})
          </button>
        </div>

        <div className="relative w-64 hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ara..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* VIEW 1: SUPPLIERS LIST */}
      {activeSubTab === 'suppliers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((sup) => {
            const suppliedMaterials = materials.filter((m) => m.supplierId === sup.id);

            return (
              <div
                key={sup.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 font-medium">
                      {sup.city}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {sup.leadTimeDays} gün teslim
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white leading-tight">
                    {sup.name}
                  </h3>

                  <div className="text-xs text-slate-400 space-y-1 pt-1">
                    <div className="text-slate-300 font-medium">
                      Yetkili: {sup.contactPerson}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-mono">{sup.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sup.email}</span>
                    </div>
                    {sup.address && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-400" />
                        <span className="line-clamp-2">{sup.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Tedarik Edilen Hammadde:</span>
                    <strong className="text-white font-mono">{suppliedMaterials.length} Kalem</strong>
                  </div>

                  <button
                    onClick={() => onOpenNewPO(sup.id)}
                    className="w-full py-2 px-3 bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Bu Tedarikçiye Sipariş Ver</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: PURCHASE ORDERS / MAL KABUL */}
      {activeSubTab === 'pos' && (
        <div className="space-y-4">
          {filteredPOs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
              <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-300">Henüz Satın Alma Emri Yok</h3>
              <p className="text-xs text-slate-500 mt-1">
                Eksik hammadde olduğunda veya planlı alımlarda tedarikçiye sipariş açabilirsiniz.
              </p>
            </div>
          ) : (
            filteredPOs.map((po) => {
              const isReceived = po.status === 'teslim_alindi';

              return (
                <div
                  key={po.id}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                          {po.poNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          Tarih: <strong>{po.orderDate}</strong>
                        </span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            isReceived
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isReceived ? 'DEPOYA TESLİM ALINDI' : 'SİPARİŞ VERİLDİ / YOLDA'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white">
                        {po.supplierName}
                      </h3>
                      <p className="text-xs text-slate-400">Tel: {po.supplierPhone}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Sipariş Tutarı
                        </span>
                        <span className="text-base font-bold text-emerald-400 font-mono">
                          {formatTRY(po.totalAmount)}
                        </span>
                      </div>

                      {!isReceived ? (
                        <button
                          onClick={() => onReceivePO(po.id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>Depoya Al & Stoğa Ekle</span>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-medium flex items-center gap-1 px-3 py-1.5 bg-emerald-500/10 rounded border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4" />
                          Stoğa Eklendi
                        </span>
                      )}

                      <button
                        onClick={() => onDeletePO(po.id)}
                        className="p-2 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded-lg transition-colors"
                        title="Siparişi Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* PO Items Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2 px-3">Malzeme Adı</th>
                          <th className="py-2 px-3">Renk</th>
                          <th className="py-2 px-3">Miktar</th>
                          <th className="py-2 px-3">Birim Fiyat</th>
                          <th className="py-2 px-3 text-right">Toplam</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                        {po.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2 px-3 font-medium text-slate-100">
                              {it.materialName}
                            </td>
                            <td className="py-2 px-3 text-slate-400">{it.colorVariant || '-'}</td>
                            <td className="py-2 px-3 font-mono font-medium text-slate-200">
                              {formatNumber(it.quantity)} {it.unit}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-300">
                              {formatTRY(it.unitPrice)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-400 font-medium">
                              {formatTRY(it.totalPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
