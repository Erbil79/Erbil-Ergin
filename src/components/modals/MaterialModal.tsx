import React, { useState } from 'react';
import {
  X,
  Package,
  Layers,
  Image as ImageIcon,
  DollarSign,
  Truck,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  RawMaterial,
  Supplier,
  MaterialCategory,
  MaterialUnit,
  SoleSize,
  ALL_SIZES,
} from '../../types';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: RawMaterial | null;
  suppliers: Supplier[];
  onSave: (material: RawMaterial) => void;
}

export const MaterialModal: React.FC<MaterialModalProps> = ({
  isOpen,
  onClose,
  material,
  suppliers,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = !!material;

  const [code, setCode] = useState(material?.code || `MAT-${Date.now().toString().slice(-4)}`);
  const [name, setName] = useState(material?.name || '');
  const [category, setCategory] = useState<MaterialCategory>(material?.category || 'saya');
  const [unit, setUnit] = useState<MaterialUnit>(material?.unit || (material?.category === 'taban' ? 'cift' : 'metre'));
  const [unitPrice, setUnitPrice] = useState<number>(material?.unitPrice || 50);
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>(material?.currency || 'TRY');
  const [supplierId, setSupplierId] = useState(material?.supplierId || (suppliers[0]?.id || ''));
  const [colorsText, setColorsText] = useState((material?.colors || ['Siyah', 'Beyaz']).join(', '));
  const [imageUrl, setImageUrl] = useState(material?.imageUrl || '');
  const [notes, setNotes] = useState(material?.notes || '');

  // Sole specific 36-45 stock
  const [isSoleFamily, setIsSoleFamily] = useState<boolean>(
    material?.isSoleFamily ?? category === 'taban'
  );

  const [soleStocks, setSoleStocks] = useState<Record<SoleSize, number>>(
    material?.soleStocks || {
      36: 100,
      37: 150,
      38: 200,
      39: 200,
      40: 150,
      41: 120,
      42: 100,
      43: 70,
      44: 40,
      45: 30,
    }
  );

  const [soleMinStocks, setSoleMinStocks] = useState<Record<SoleSize, number>>(
    material?.soleMinStocks || {
      36: 50,
      37: 60,
      38: 80,
      39: 80,
      40: 60,
      41: 50,
      42: 50,
      43: 40,
      44: 30,
      45: 25,
    }
  );

  // General material stock
  const [currentStock, setCurrentStock] = useState<number>(material?.currentStock || 500);
  const [minStockLevel, setMinStockLevel] = useState<number>(material?.minStockLevel || 150);

  // Update unit default if category changes to taban
  const handleCategoryChange = (newCat: MaterialCategory) => {
    setCategory(newCat);
    if (newCat === 'taban') {
      setUnit('cift');
      setIsSoleFamily(true);
    } else if (newCat === 'saya' || newCat === 'astar') {
      setUnit('metre');
      setIsSoleFamily(false);
    } else if (newCat === 'yapistirici') {
      setUnit('kg');
      setIsSoleFamily(false);
    } else {
      setUnit('adet');
      setIsSoleFamily(false);
    }
  };

  const handleSoleStockChange = (size: SoleSize, val: number) => {
    setSoleStocks((prev) => ({
      ...prev,
      [size]: Math.max(0, val || 0),
    }));
  };

  const handleSoleMinChange = (size: SoleSize, val: number) => {
    setSoleMinStocks((prev) => ({
      ...prev,
      [size]: Math.max(0, val || 0),
    }));
  };

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

  const totalSoleStock = ALL_SIZES.reduce((sum, sz) => sum + (soleStocks[sz] || 0), 0);
  const totalSoleMin = ALL_SIZES.reduce((sum, sz) => sum + (soleMinStocks[sz] || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Lütfen hammadde adını giriniz.');
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);
    const cleanedColors = colorsText
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const savedMaterial: RawMaterial = {
      id: material?.id || `mat-${Date.now()}`,
      code: code.trim(),
      name: name.trim(),
      category,
      unit,
      unitPrice: Number(unitPrice) || 0,
      currency,
      supplierId,
      supplierName: selectedSupplier?.name || 'Tedarikçi Belirtilmedi',
      currentStock: isSoleFamily ? totalSoleStock : Number(currentStock) || 0,
      minStockLevel: isSoleFamily ? totalSoleMin : Number(minStockLevel) || 0,
      colors: cleanedColors.length > 0 ? cleanedColors : ['Standart'],
      imageUrl,
      isSoleFamily,
      soleStocks: isSoleFamily ? soleStocks : undefined,
      soleMinStocks: isSoleFamily ? soleMinStocks : undefined,
      notes,
      createdAt: material?.createdAt || new Date().toISOString(),
    };

    onSave(savedMaterial);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isEditing ? 'Hammaddeyi Düzenle' : 'Yeni Hammadde & Taban Tanımla'}
              </h2>
              <p className="text-xs text-slate-400">
                Birim, renk varyantı, tedarikçi ve 36-45 numara taban stok takibi
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Hammadde Kodu *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Örn: TBN-MNT-01"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Malzeme / Ürün Adı *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Anatomik Mantar & EVA Taban Serisi"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as MaterialCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="taban">Taban (36-45 Seri)</option>
                <option value="saya">Saya / Üst Malzeme (Deri, PU, Kumaş)</option>
                <option value="astar">Astar Malzemesi</option>
                <option value="toka">Toka & Metal Aksesuar</option>
                <option value="yapistirici">Yapıştırıcı & Kimyasal</option>
                <option value="iplik">İplik & Dikiş</option>
                <option value="ped">İç Taban Pedi / Eva Destek</option>
                <option value="ambalaj">Ambalaj & Kutu / Koli</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Ölçü Birimi
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as MaterialUnit)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                <option value="cift">Çift</option>
                <option value="adet">Adet</option>
                <option value="metre">Metre (m)</option>
                <option value="m2">Metrekare (m²)</option>
                <option value="kg">Kilogram (kg)</option>
                <option value="litre">Litre (L)</option>
                <option value="gram">Gram (g)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Birim Alış Fiyatı (₺) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tedarikçi Firma *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Renk Varyantları (Virgülle ayırın)
              </label>
              <input
                type="text"
                value={colorsText}
                onChange={(e) => setColorsText(e.target.value)}
                placeholder="Örn: Siyah, Beyaz, Haki, Taba, Bej"
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Image & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Görsel / Resim (URL veya Bilgisayardan Seç)
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
                />
                <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-medium text-slate-200 cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
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
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0">
                {imageUrl ? (
                  <img src={imageUrl} alt="Önizleme" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px]">
                    Resim Yok
                  </div>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Tedarikçi ve sipariş fişlerinde malzeme görseli olarak gösterilir.
              </div>
            </div>
          </div>

          {/* SOLE MATRIX OR GENERAL STOCK */}
          {category === 'taban' || isSoleFamily ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div>
                  <span className="font-semibold text-sm text-amber-400 uppercase tracking-wider">
                    Taban Numara Serisi (36 - 45 Stok Dağılımı)
                  </span>
                  <p className="text-xs text-slate-400">
                    Sipariş girildiğinde buradaki numaralardan otomatik olarak düşülür.
                  </p>
                </div>
                <div className="text-right text-xs">
                  <span className="text-slate-400">Toplam Taban Stoğu:</span>{' '}
                  <span className="font-bold text-white font-mono">{totalSoleStock} Çift</span>
                </div>
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {ALL_SIZES.map((sz) => {
                  const stock = soleStocks[sz] ?? 0;
                  const min = soleMinStocks[sz] ?? 40;
                  const isCrit = stock < min;

                  return (
                    <div
                      key={sz}
                      className={`p-2 rounded-lg border text-center ${
                        isCrit
                          ? 'bg-rose-950/30 border-rose-600/70'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <span className="block text-xs font-bold text-slate-300 mb-1">
                        {sz} No
                      </span>
                      <label className="text-[9px] text-slate-500 uppercase block mb-0.5">
                        Mevcut
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={stock}
                        onChange={(e) =>
                          handleSoleStockChange(sz, parseInt(e.target.value) || 0)
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded py-1 px-1 text-center text-xs font-bold text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                      <label className="text-[9px] text-slate-500 uppercase block mt-1 mb-0.5">
                        Asgari
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={min}
                        onChange={(e) =>
                          handleSoleMinChange(sz, parseInt(e.target.value) || 0)
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded py-0.5 px-1 text-center text-[11px] text-slate-400 font-mono focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* General Material Stock Input */
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mevcut Depo Stoğu ({unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={currentStock}
                  onChange={(e) => setCurrentStock(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Kritik / Asgari Stok Eşiği ({unit}) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  value={minStockLevel}
                  onChange={(e) => setMinStockLevel(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Stok bu miktarın altına düştüğünde sistem otomatik satın alma uyarısı verir.
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Notlar & Raf / Depo Konumu
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Örn: Depo 2, Raf B-14, 1. Kalite ham madde"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors"
          >
            {isEditing ? 'Hammaddeyi Güncelle' : 'Hammaddeyi Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
};
