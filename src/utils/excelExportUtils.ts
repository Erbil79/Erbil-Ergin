import * as XLSX from 'xlsx';
import {
  SlipperRecipe,
  WorkOrder,
  RawMaterial,
  CustomerOrder,
  ALL_SIZES,
} from '../types';
import { calculateRecipeCost, formatTRY, formatNumber } from './calculationUtils';

/**
 * Reçete ve Maliyet Analizini Excel (.xlsx) dosyasına aktarır
 */
export function exportRecipeToExcel(recipe: SlipperRecipe, materialsList?: RawMaterial[]) {
  const wb = XLSX.utils.book_new();
  const costBreakdown = calculateRecipeCost(recipe);

  // ---------------- SHEET 1: REÇETE VE MALİYET ÖZETİ ----------------
  const summaryData: (string | number)[][] = [
    ['TERLİK İMALAT REÇETESİ VE BİRİM MALİYET RAPORU'],
    ['Rapor Tarihi:', new Date().toLocaleDateString('tr-TR'), '', 'Sistem:', 'Terlik Üretim ERP'],
    [],
    ['--- MODEL KİMLİK BİLGİLERİ ---'],
    ['Model Adı:', recipe.name],
    ['Model Kodu (Stok Kodu):', recipe.code],
    ['Kategori:', recipe.category],
    ['Renk Varyantları:', (recipe.colors || []).join(', ')],
    ['Açıklama / Notlar:', recipe.description || recipe.notes || '-'],
    ['Son Güncelleme:', new Date(recipe.updatedAt || recipe.createdAt).toLocaleDateString('tr-TR')],
    [],
    ['--- MALİYET VE KARLILIK ANALİZİ (1 ÇİFT İÇİN) ---'],
    ['1 Çift Hammadde Tüketim Maliyeti (TL):', Number(costBreakdown.materialCostPerPair.toFixed(2))],
    ['1 Çift Üretim Masrafları Toplamı (TL):', Number(costBreakdown.expenseCostPerPair.toFixed(2))],
    ['1 ÇİFT TOPLAM MALİYETİ (TL):', Number(costBreakdown.totalCostPerPair.toFixed(2))],
    ['Hedef Toptan Satış Fiyatı (TL):', Number(recipe.targetWholesalePrice.toFixed(2))],
    ['Çift Başına Tahmini Brüt Kar (TL):', Number(costBreakdown.grossProfitPerPair.toFixed(2))],
    ['Tahmini Brüt Kar Marjı (%):', Number(costBreakdown.grossProfitMarginPercent.toFixed(1))],
    ['Hedef Perakende Satış Fiyatı (TL):', recipe.targetRetailPrice ? Number(recipe.targetRetailPrice.toFixed(2)) : '-'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 38 }, { wch: 35 }, { wch: 15 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Maliyet Özeti');

  // ---------------- SHEET 2: HAMMADDE SARFİYAT LİSTESİ (BOM) ----------------
  const bomHeaders = [
    'Sıra',
    'Malzeme Adı',
    'Kategori',
    'Birim',
    'Birim Sarfiyat (1 Çift)',
    'Fire Payı (%)',
    'Fireli Toplam Tüketim',
    'Birim Fiyat (TL)',
    'Çift Başı Maliyet (TL)',
    'Renk / Varyant',
    'Tedarikçi Firma',
  ];

  const bomRows = (recipe.materials || []).map((m, idx) => {
    const raw = materialsList?.find((mat) => mat.id === m.materialId);
    const scrapFactor = 1 + (m.scrapPercentage || 0) / 100;
    const grossQty = Number(((m.quantityPerPair || 0) * scrapFactor).toFixed(4));
    const cost = Number(((m.quantityPerPair || 0) * (m.unitCost || 0) * scrapFactor).toFixed(2));

    return [
      idx + 1,
      m.materialName,
      m.category.toUpperCase(),
      m.unit,
      m.quantityPerPair,
      m.scrapPercentage || 0,
      grossQty,
      m.unitCost || 0,
      cost,
      m.colorVariant || '-',
      raw?.supplierName || '-',
    ];
  });

  // Toplam satırı
  const totalMaterialCost = bomRows.reduce((sum, r) => sum + (Number(r[8]) || 0), 0);
  bomRows.push([
    '',
    'TOPLAM HAMMADDE MALİYETİ',
    '',
    '',
    '',
    '',
    '',
    '',
    Number(totalMaterialCost.toFixed(2)),
    '',
    '',
  ]);

  const bomData = [
    [`${recipe.name} (${recipe.code}) - 1 ÇİFT İÇİN HAMMADDE VE MALZEME SARFİYATI`],
    [],
    bomHeaders,
    ...bomRows,
  ];

  const wsBom = XLSX.utils.aoa_to_sheet(bomData);
  wsBom['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 15 },
    { wch: 10 },
    { wch: 22 },
    { wch: 14 },
    { wch: 20 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(wb, wsBom, 'Hammadde Sarfiyatı (BOM)');

  // ---------------- SHEET 3: ÜRETİM GİDERLERİ & İŞÇİLİK ----------------
  const expenseHeaders = ['Sıra', 'Masraf / Operasyon Adı', 'Gider Türü', '1 Çift İçin Masraf Payı (TL)'];
  const expenseRows = (recipe.expenses || []).map((exp, idx) => [
    idx + 1,
    exp.name,
    exp.type.replace('_', ' ').toUpperCase(),
    Number(exp.costPerPair.toFixed(2)),
  ]);

  const totalExpenseCost = (recipe.expenses || []).reduce((sum, e) => sum + (e.costPerPair || 0), 0);
  expenseRows.push(['', 'TOPLAM ÜRETİM MASRAFLARI', '', Number(totalExpenseCost.toFixed(2))]);

  const expenseData = [
    [`${recipe.name} (${recipe.code}) - ÜRETİM MASRAFLARI VE İŞÇİLİK GİDERLERİ`],
    [],
    expenseHeaders,
    ...expenseRows,
  ];

  const wsExpense = XLSX.utils.aoa_to_sheet(expenseData);
  wsExpense['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 25 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, wsExpense, 'Üretim Masrafları');

  // Dosyayı İndir
  const safeCode = (recipe.code || 'model').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Recete_${safeCode}_${new Date().toISOString().split('T')[0]}.xlsx`;

  try {
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('Excel yazma hatası:', err);
  }
}

/**
 * İş Emrini (Tekli veya 1-10 Çoklu Model) Excel (.xlsx) dosyasına aktarır
 */
export function exportWorkOrderToExcel(workOrder: WorkOrder, materialsList?: RawMaterial[]) {
  const wb = XLSX.utils.book_new();

  const modelsList =
    workOrder.models && workOrder.models.length > 0
      ? workOrder.models
      : [
          {
            id: 'm-1',
            recipeId: workOrder.recipeId || '',
            recipeName: workOrder.recipeName || 'Terlik Modeli',
            recipeCode: '',
            selectedColor: workOrder.selectedColor || 'Standart',
            modelImageUrl: workOrder.modelImageUrl,
            sizeDistribution: workOrder.sizeDistribution || ({} as any),
            totalPairs: workOrder.totalPairs,
          },
        ];

  // ---------------- SHEET 1: İŞ EMRİ GENEL BİLGİLERİ VE MODELLER ----------------
  const headerData: (string | number)[][] = [
    ['FABRİKA İMALAT İŞ EMRİ FORMU'],
    ['İş Emri No:', workOrder.workOrderNumber, '', 'Düzenleme Tarihi:', new Date().toLocaleDateString('tr-TR')],
    ['Sipariş Referansı:', workOrder.orderNumber || '-', '', 'Başlangıç Tarihi:', workOrder.startDate],
    ['Müşteri / Parti Ref:', workOrder.customerName, '', 'Hedef Termin Tarihi:', workOrder.targetEndDate],
    ['Üretim Durumu:', workOrder.status.replace('_', ' ').toUpperCase(), '', 'Depo Stok Düşümü:', workOrder.stockDeducted ? 'DÜŞÜLDÜ' : 'BEKLİYOR'],
    ['Model Çeşidi:', `${modelsList.length} Farklı Model`, '', 'GENEL TOPLAM ÜRETİM:', `${workOrder.totalPairs} ÇİFT`],
    ['Notlar:', workOrder.notes || '-'],
    [],
    ['--- İŞ EMRİNE DAHİL OLAN MODELLER VE 36-45 NUMARA DAĞILIMI ---'],
  ];

  // 36-45 numara tablosu başlıkları
  const sizeHeaders = ['Sıra', 'Model Adı', 'Model Kodu', 'Renk Varyantı', ...ALL_SIZES.map((sz) => `${sz} No`), 'Toplam (Çift)'];

  const modelRows = modelsList.map((m, idx) => {
    const sizeCounts = ALL_SIZES.map((sz) => m.sizeDistribution?.[sz] || 0);
    return [
      idx + 1,
      m.recipeName,
      m.recipeCode || '-',
      m.selectedColor,
      ...sizeCounts,
      m.totalPairs,
    ];
  });

  // Toplam asorti satırı
  const totalsPerSize = ALL_SIZES.map((sz) =>
    modelsList.reduce((sum, m) => sum + (m.sizeDistribution?.[sz] || 0), 0)
  );
  modelRows.push([
    '',
    'GENEL NUMARA TOPLAMLARI',
    '',
    '',
    ...totalsPerSize,
    workOrder.totalPairs,
  ]);

  const sheet1Data = [...headerData, sizeHeaders, ...modelRows];
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 14 },
    { wch: 16 },
    ...ALL_SIZES.map(() => ({ wch: 9 })),
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'İş Emri & Modeller');

  // ---------------- SHEET 2: DEPO ÇIKIŞ FİŞİ & HAMMADDE İHTİYAÇLARI ----------------
  const matHeaders = [
    'Sıra',
    'Malzeme Adı',
    'Kategori',
    'Gerekli Miktar',
    'Birim',
    'Tahsis / Çıkış Durumu',
    '36-45 Asorti Dağılımı (Tabanlar İçin)',
  ];

  const matRows = (workOrder.requiredMaterials || []).map((rm, idx) => {
    let sizeDetail = '-';
    if (rm.isSole && rm.sizeBreakdown) {
      sizeDetail = Object.entries(rm.sizeBreakdown)
        .filter(([_, qty]) => (qty as number) > 0)
        .map(([sz, qty]) => `${sz} No: ${qty} çift`)
        .join(' | ');
    }

    return [
      idx + 1,
      rm.materialName,
      rm.category.toUpperCase(),
      rm.requiredQuantity,
      rm.unit,
      workOrder.stockDeducted ? 'DEPO ÇIKIŞI YAPILDI' : 'TAHSİS BEKLİYOR',
      sizeDetail,
    ];
  });

  const sheet2Data = [
    [`${workOrder.workOrderNumber} - İMALAT REÇETESİ VE DEPO ÇIKIŞ LİSTESİ`],
    ['Toplam Üretim:', `${workOrder.totalPairs} Çift`],
    [],
    matHeaders,
    ...matRows,
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 15 },
    { wch: 16 },
    { wch: 10 },
    { wch: 24 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Depo Çıkış Fişi');

  // ---------------- SHEET 3: İSTASYON İLERLEME TAKİBİ ----------------
  const stationData = [
    [`${workOrder.workOrderNumber} - FABRİKA ÜRETİM İSTASYONLARI DURUMU`],
    [],
    ['İstasyon No', 'İstasyon Adı', 'Tamamlanma Oranı (%)', 'Durum'],
    ['1', 'Saya & Astar Kesim İstasyonu', workOrder.stationProgress.kesim, workOrder.stationProgress.kesim === 100 ? 'TAMAMLANDI' : 'DEVAM EDİYOR'],
    ['2', 'Saya Montaj & Dikiş İstasyonu', workOrder.stationProgress.saya, workOrder.stationProgress.saya === 100 ? 'TAMAMLANDI' : 'DEVAM EDİYOR'],
    ['3', 'Taban Pres & Yapıştırma İstasyonu', workOrder.stationProgress.montaj, workOrder.stationProgress.montaj === 100 ? 'TAMAMLANDI' : 'DEVAM EDİYOR'],
    ['4', 'Kalite Kontrol & Kutulama İstasyonu', workOrder.stationProgress.paket, workOrder.stationProgress.paket === 100 ? 'TAMAMLANDI' : 'DEVAM EDİYOR'],
  ];

  const ws3 = XLSX.utils.aoa_to_sheet(stationData);
  ws3['!cols'] = [{ wch: 14 }, { wch: 38 }, { wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'İstasyon Takibi');

  // Dosyayı İndir
  const safeNumber = workOrder.workOrderNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `IsEmri_${safeNumber}_${new Date().toISOString().split('T')[0]}.xlsx`;

  try {
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('Excel yazma hatası:', err);
  }
}

/**
 * Müşteri Siparişini ve Malzeme İhtiyaç Planlamasını (MRP) Excel (.xlsx) dosyasına aktarır
 */
export function exportOrderToExcel(
  order: CustomerOrder,
  recipe?: SlipperRecipe,
  materialsList?: RawMaterial[]
) {
  const wb = XLSX.utils.book_new();

  // ---------------- SHEET 1: SİPARİŞ ÖZETİ & ASORTİ ----------------
  const orderSummary: (string | number)[][] = [
    ['MÜŞTERİ SİPARİŞİ VE İMALAT TALEP FORMU'],
    ['Sipariş No:', order.orderNumber, '', 'Sipariş Tarihi:', order.orderDate],
    ['Müşteri Firma / Kişi:', order.customerName, '', 'Hedef Teslimat:', order.deliveryDate],
    ['Model Adı:', order.recipeName, '', 'Model Kodu:', order.recipeCode || '-'],
    ['Seçilen Renk Varyantı:', order.selectedColor, '', 'Sipariş Durumu:', order.status.replace('_', ' ').toUpperCase()],
    ['Toplam Miktar:', `${order.totalPairs} ÇİFT`, '', 'Birim Satış Fiyatı:', `${order.unitSalePrice} TL`],
    ['Toplam Sipariş Tutarı:', `${order.totalRevenue} TL`, '', 'Tahmini Brüt Kar:', `${order.estimatedGrossProfit} TL`],
    ['Notlar:', order.notes || '-'],
    [],
    ['--- 36-45 NUMARA ASORTİ DAĞILIMI (ÇİFT) ---'],
    [...ALL_SIZES.map((sz) => `${sz} No`), 'TOPLAM'],
    [...ALL_SIZES.map((sz) => order.sizeDistribution[sz] || 0), order.totalPairs],
  ];

  const wsOrder = XLSX.utils.aoa_to_sheet(orderSummary);
  wsOrder['!cols'] = [
    { wch: 22 },
    { wch: 28 },
    { wch: 20 },
    { wch: 25 },
    ...ALL_SIZES.map(() => ({ wch: 9 })),
  ];
  XLSX.utils.book_append_sheet(wb, wsOrder, 'Sipariş Detayı');

  // ---------------- SHEET 2: MRP MALZEME VE TABAN İHTİYACI ----------------
  if (recipe) {
    const matHeaders = [
      'Sıra',
      'Malzeme Adı',
      'Kategori',
      'Gerekli Miktar',
      'Birim',
      'Mevcut Depo Stoğu',
      'Eksik Miktar (İhtiyaç)',
      'Stok Durumu',
      'Tedarikçi Firma',
    ];

    const matRows = (recipe.materials || []).map((m, idx) => {
      const raw = materialsList?.find((mat) => mat.id === m.materialId);
      const scrapFactor = 1 + (m.scrapPercentage || 0) / 100;
      const reqQty = Number(((m.quantityPerPair || 0) * order.totalPairs * scrapFactor).toFixed(2));
      const availStock = raw?.currentStock ?? 0;
      const isShort = availStock < reqQty;
      const shortQty = isShort ? Number((reqQty - availStock).toFixed(2)) : 0;

      return [
        idx + 1,
        m.materialName,
        m.category.toUpperCase(),
        reqQty,
        m.unit,
        availStock,
        shortQty > 0 ? shortQty : 0,
        isShort ? 'EKSİK (SİPARİŞ VERİLMELİ)' : 'STOK YETERLİ',
        raw?.supplierName || '-',
      ];
    });

    const mrpData = [
      [`${order.orderNumber} - MALZEME İHTİYAÇ PLANLAMASI (MRP)`],
      ['Toplam Üretim:', `${order.totalPairs} Çift`],
      [],
      matHeaders,
      ...matRows,
    ];

    const wsMrp = XLSX.utils.aoa_to_sheet(mrpData);
    wsMrp['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 15 },
      { wch: 16 },
      { wch: 10 },
      { wch: 18 },
      { wch: 22 },
      { wch: 24 },
      { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, wsMrp, 'Malzeme İhtiyaç Raporu (MRP)');
  }

  const safeNum = order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Siparis_${safeNum}_${new Date().toISOString().split('T')[0]}.xlsx`;

  try {
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error('Excel yazma hatası:', err);
  }
}
