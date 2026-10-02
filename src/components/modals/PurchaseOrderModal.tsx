import React, { useState } from 'react';
import {
  X,
  Truck,
  Plus,
  Trash2,
  Send,
  Printer,
  Copy,
  Check,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import {
  Supplier,
  SupplierPurchaseOrder,
  RawMaterial,
  MaterialUnit,
  SoleSize,
  ALL_SIZES,
} from '../../types';
import { formatTRY, formatNumber } from '../../utils/calculationUtils';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  materialsList: RawMaterial[];
  initialMaterialId?: string;
  initialShortageQty?: number;
  onSavePO: (po: SupplierPurchaseOrder) => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  materialsList,
  initialMaterialId,
  initialShortageQty,
  onSavePO,
}) => {
  if (!isOpen) return null;

  // Determine initial supplier & item
  const initialMaterial = initialMaterialId
    ? materialsList.find((m) => m.id === initialMaterialId)
    : undefined;

  const defaultSupplierId =
    initialMaterial?.supplierId || (suppliers[0]?.id || '');

  const [selectedSupplierId, setSelectedSupplierId] = useState(defaultSupplierId);
  const supplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Line items state
  const [items, setItems] = useState<SupplierPurchaseOrder['items']>(() => {
    if (initialMaterial) {
      const isSole = initialMaterial.isSoleFamily;
      return [
        {
          materialId: initialMaterial.id,
          materialName: initialMaterial.name,
          unit: initialMaterial.unit,
          quantity: initialShortageQty ? Math.ceil(initialShortageQty) : 100,
          unitPrice: initialMaterial.unitPrice,
          totalPrice: (initialShortageQty ? Math.ceil(initialShortageQty) : 100) * initialMaterial.unitPrice,
          colorVariant: initialMaterial.colors[0] || 'Standart',
          sizeBreakdown: isSole
            ? { 36: 10, 37: 20, 38: 20, 39: 20, 40: 15, 41: 10, 42: 5 }
            : undefined,
        },
      ];
    }
    return [];
  });

  const [notes, setNotes] = useState('Acil üretim hattı ihtiyacı için lütfen ivedi teslimat sağlayınız.');
  const [copied, setCopied] = useState(false);

  // Add material to PO
  const handleAddItem = (matId: string) => {
    const raw = materialsList.find((m) => m.id === matId);
    if (!raw) return;

    const newItem = {
      materialId: raw.id,
      materialName: raw.name,
      unit: raw.unit,
      quantity: 100,
      unitPrice: raw.unitPrice,
      totalPrice: 100 * raw.unitPrice,
      colorVariant: raw.colors[0] || 'Standart',
      sizeBreakdown: raw.isSoleFamily
        ? { 36: 10, 37: 20, 38: 20, 39: 20, 40: 10, 41: 10, 42: 10 }
        : undefined,
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (index: number, updates: any) => {
    const next = [...items];
    const updated = { ...next[index], ...updates };
    updated.totalPrice = updated.quantity * updated.unitPrice;
    next[index] = updated;
    setItems(next);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Generate WhatsApp message text
  const generateWhatsAppMessage = () => {
    if (!supplier) return '';
    const dateStr = new Date().toLocaleDateString('tr-TR');
    let msg = `*SATIN ALMA SİPARİŞİ - TERLİK FABRİKASI*\n`;
    msg += `Tarih: ${dateStr}\n`;
    msg += `Sayın ${supplier.name} (${supplier.contactPerson}),\n`;
    msg += `Aşağıdaki hammadde ve malzemeler için sipariş talebimizdir:\n\n`;

    items.forEach((it, idx) => {
      msg += `${idx + 1}. *${it.materialName}*\n`;
      msg += `   • Miktar: ${it.quantity} ${it.unit}\n`;
      if (it.colorVariant) msg += `   • Renk: ${it.colorVariant}\n`;
      if (it.sizeBreakdown) {
        const sizesStr = Object.entries(it.sizeBreakdown)
          .filter(([_, qty]) => (qty || 0) > 0)
          .map(([sz, qty]) => `${sz} No: ${qty} çift`)
          .join(', ');
        if (sizesStr) msg += `   • Numara Dağılımı: ${sizesStr}\n`;
      }
      msg += `   • Birim Fiyat: ${formatTRY(it.unitPrice)}\n\n`;
    });

    msg += `*Toplam Tutar:* ${formatTRY(totalAmount)}\n`;
    msg += `Not: ${notes}\n\n`;
    msg += `Teslim süresi ve sipariş onayı hakkında bilgi vermenizi rica ederiz. İyi çalışmalar.`;
    return msg;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenWhatsAppWeb = () => {
    const cleanPhone = (supplier?.phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(generateWhatsAppMessage());
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  };

  const handleSubmit = (status: 'taslak' | 'siparis_verildi' = 'siparis_verildi') => {
    if (!supplier) {
      alert('Lütfen tedarikçi seçiniz.');
      return;
    }
    if (items.length === 0) {
      alert('Lütfen siparişe en az 1 hammadde ekleyiniz.');
      return;
    }

    const po: SupplierPurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `SAT-2026-${Date.now().toString().slice(-4)}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierPhone: supplier.phone,
      supplierEmail: supplier.email,
      orderDate: new Date().toISOString().split('T')[0],
      status,
      items,
      totalAmount,
      notes,
    };

    onSavePO(po);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Tedarikçi Satın Alma Siparişi (Satınalma Emri)
              </h2>
              <p className="text-xs text-slate-400">
                Eksik hammadde ve tabanları doğrudan tedarikçiye sipariş edin
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
          {/* Supplier Info */}
          <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tedarikçi Firma *
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} - {s.city} (Yetkili: {s.contactPerson})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                İletişim & Teslimat
              </label>
              <div className="text-xs text-slate-300 space-y-0.5 pt-1">
                <div>Tel: <span className="font-mono text-amber-400">{supplier?.phone || '-'}</span></div>
                <div>Teslim Süresi: <span className="text-emerald-400">{supplier?.leadTimeDays || 2} gün</span></div>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-sm text-slate-200 uppercase tracking-wider">
                Sipariş Edilecek Hammaddeler
              </span>

              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddItem(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-medium rounded px-2.5 py-1.5 cursor-pointer focus:outline-none"
                defaultValue=""
              >
                <option value="" disabled>
                  + Malzeme Ekle...
                </option>
                {materialsList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.category.toUpperCase()} - {formatTRY(m.unitPrice)})
                  </option>
                ))}
              </select>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-lg border border-dashed border-slate-800">
                Henüz sipariş kalemi eklenmedi. Yukarıdan malzeme seçebilirsiniz.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Malzeme</th>
                      <th className="py-2.5 px-3 w-32">Renk Varyantı</th>
                      <th className="py-2.5 px-3 w-28">Miktar</th>
                      <th className="py-2.5 px-3 w-24">Birim Fiyat</th>
                      <th className="py-2.5 px-3 text-right">Tutar</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3">
                          <span className="font-medium text-slate-100">{it.materialName}</span>
                          <span className="block text-[10px] text-slate-400 uppercase">
                            Birim: {it.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={it.colorVariant || ''}
                            onChange={(e) =>
                              handleUpdateItem(idx, { colorVariant: e.target.value })
                            }
                            placeholder="Siyah / Taba"
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, {
                                  quantity: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                            />
                            <span className="text-[11px] text-slate-400">{it.unit}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={it.unitPrice}
                            onChange={(e) =>
                              handleUpdateItem(idx, {
                                unitPrice: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-400">
                          {formatTRY(it.totalPrice)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-950 font-semibold border-t border-slate-800 text-xs">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right text-slate-300">
                        Toplam Satın Alma Tutarı:
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-mono text-sm">
                        {formatTRY(totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Quick Communication Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-4 h-4 text-emerald-400" />
                Hızlı Tedarikçi İletişim Metni (WhatsApp & E-posta)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Kopyalandı!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Metni Kopyala</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenWhatsAppWeb}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>WhatsApp'tan Gönder</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
              {generateWhatsAppMessage()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs text-slate-300"
          >
            <Printer className="w-4 h-4" />
            <span>Yazdır / PDF</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Vazgeç
            </button>
            <button
              onClick={() => handleSubmit('siparis_verildi')}
              className="px-5 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors"
            >
              Siparişi Onayla & Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
