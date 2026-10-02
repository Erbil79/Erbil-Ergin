import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Percent,
  Sparkles,
  Layers,
  Clock,
  ShieldCheck,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import {
  SlipperRecipe,
  ProductionHistoryLog,
  CustomerOrder,
  RawMaterial,
  ALL_SIZES,
} from '../../types';
import { calculateRecipeCost, formatTRY, formatNumber } from '../../utils/calculationUtils';
import {
  analyzeProductionEfficiency,
  EfficiencyAdvice,
} from '../../services/geminiEfficiencyService';

interface AnalyticsTabProps {
  recipes: SlipperRecipe[];
  history: ProductionHistoryLog[];
  orders: CustomerOrder[];
  materials: RawMaterial[];
  onAddHistoryLog: (log: ProductionHistoryLog) => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  recipes,
  history,
  orders,
  materials,
  onAddHistoryLog,
}) => {
  const [aiAdvice, setAiAdvice] = useState<EfficiencyAdvice | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Aggregated KPIs
  const totalProducedPairs = history.reduce((sum, h) => sum + h.totalPairs, 0);
  const avgScrapRate =
    history.length > 0
      ? (history.reduce((sum, h) => sum + h.actualScrapRate, 0) / history.length).toFixed(1)
      : '3.8';
  const avgEfficiencyScore =
    history.length > 0
      ? Math.round(history.reduce((sum, h) => sum + h.efficiencyScore, 0) / history.length)
      : 92;

  const totalOrderRevenue = orders.reduce((sum, o) => sum + o.totalRevenue, 0);
  const totalOrderProfit = orders.reduce((sum, o) => sum + o.estimatedGrossProfit, 0);

  // Size distribution breakdown across all orders
  const sizeDistributionMap: Record<number, number> = {};
  ALL_SIZES.forEach((sz) => {
    sizeDistributionMap[sz] = 0;
  });

  orders.forEach((o) => {
    ALL_SIZES.forEach((sz) => {
      sizeDistributionMap[sz] = (sizeDistributionMap[sz] || 0) + (o.sizeDistribution[sz] || 0);
    });
  });

  const maxSizeCount = Math.max(...Object.values(sizeDistributionMap), 1);

  // AI analysis trigger
  const handleRunAiAnalysis = async () => {
    setIsLoadingAi(true);
    try {
      const result = await analyzeProductionEfficiency(recipes, history, orders, materials);
      setAiAdvice(result);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Üretim Verimliliği & Fire Analiz Raporları</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Geçmiş parti verileri, numara popülerlik ısı haritası ve yapay zeka maliyet danışmanı
          </p>
        </div>

        <button
          onClick={handleRunAiAnalysis}
          disabled={isLoadingAi}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-lg text-xs sm:text-sm shadow-md transition-all"
        >
          {isLoadingAi ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>{isLoadingAi ? 'Analiz Ediliyor...' : 'Yapay Zeka Verimlilik Analizi'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Tamamlanan Üretim
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-white">
            {formatNumber(totalProducedPairs)} Çift
          </span>
          <span className="text-[10px] text-slate-500 block">
            {history.length} üretim partisi kaydı
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Ortalama Fire Oranı
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            %{avgScrapRate}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Sektör ortalaması: %4.5
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Fabrika Verimlilik Skoru
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            {avgEfficiencyScore} / 100
          </span>
          <span className="text-[10px] text-slate-500 block">
            Zamanında teslimat & düşük fire
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
            Sipariş Kar Marjı
          </span>
          <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {totalOrderRevenue > 0
              ? `%${((totalOrderProfit / totalOrderRevenue) * 100).toFixed(1)}`
              : '%0'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Toplam Brüt Kar: {formatTRY(totalOrderProfit)}
          </span>
        </div>
      </div>

      {/* AI EFFICIENCY ADVICE CARD (IF TRIGGERED) */}
      {aiAdvice && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-amber-500/40 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Yapay Zeka Fabrika Verimlilik & Maliyet Optimizasyon Raporu</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-3.5 rounded-lg border border-slate-800">
            {aiAdvice.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Column 1: Key Insights */}
            <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-blue-400">
                <Lightbulb className="w-4 h-4" />
                Önemli Tespitler
              </span>
              <ul className="space-y-1.5 text-slate-300">
                {aiAdvice.keyInsights.map((ins, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-blue-400 font-bold">•</span>
                    <span>{ins}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Cost Reduction */}
            <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                Maliyet Düşürme Fırsatları
              </span>
              <ul className="space-y-1.5 text-slate-300">
                {aiAdvice.costReductionSuggestions.map((sug, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{sug}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Scrap & Sole tips */}
            <div className="bg-slate-950/70 p-3.5 rounded-lg border border-slate-800 space-y-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-amber-400">
                <Layers className="w-4 h-4" />
                Fire Azaltma & 36-45 Taban Tavsiyesi
              </span>
              <ul className="space-y-1.5 text-slate-300">
                {aiAdvice.scrapReductionTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">★</span>
                    <span>{tip}</span>
                  </li>
                ))}
                {aiAdvice.soleInventoryAdvice.map((adv, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-amber-300/90">
                    <span className="text-amber-400 font-bold">★</span>
                    <span>{adv}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 36 - 45 NUMARA POPÜLERLİK ISI HARİTASI (SIZE DISTRIBUTION CHART) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              36 - 45 Numara Sipariş Dağılımı & Taban Tüketim Analizi
            </h3>
            <p className="text-xs text-slate-400">
              Müşteri siparişlerinde en çok talep gören numara ve taban yoğunluğu
            </p>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 items-end h-40 pt-4 px-2 bg-slate-950/60 rounded-lg border border-slate-800">
          {ALL_SIZES.map((sz) => {
            const count = sizeDistributionMap[sz] || 0;
            const heightPercent = Math.max((count / maxSizeCount) * 100, 8);
            const isTopSeller = count >= maxSizeCount * 0.7 && count > 0;

            return (
              <div key={sz} className="h-full flex flex-col justify-end items-center gap-1 group">
                <span className="text-[10px] font-mono font-bold text-slate-300">
                  {count}
                </span>
                <div
                  className={`w-full rounded-t transition-all duration-300 ${
                    isTopSeller
                      ? 'bg-amber-400 group-hover:bg-amber-300'
                      : 'bg-slate-700 group-hover:bg-slate-600'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                />
                <span
                  className={`text-[11px] font-semibold ${
                    isTopSeller ? 'text-amber-400' : 'text-slate-400'
                  }`}
                >
                  {sz}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500 text-center">
          * Sarı renkle vurgulanan numaralar fabrikanızın en çok satan ana asorti gövdesini oluşturur.
        </p>
      </div>

      {/* PAST PRODUCTION LOGS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Geçmiş Üretim Partileri & Gerçekleşen Veriler
            </h3>
            <p className="text-xs text-slate-400">
              Planlanan vs Gerçekleşen fire, işçilik maliyeti ve verimlilik puanları
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">İş Emri / Model</th>
                <th className="py-2.5 px-3">Üretim Miktarı</th>
                <th className="py-2.5 px-3">Gerçekleşen Fire</th>
                <th className="py-2.5 px-3">Çift Başı İşçilik</th>
                <th className="py-2.5 px-3">Üretim Süresi</th>
                <th className="py-2.5 px-3">Verimlilik Skoru</th>
                <th className="py-2.5 px-3">Tarih / Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
              {history.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3">
                    <span className="font-mono text-amber-400 font-bold block text-[11px]">
                      {log.workOrderId}
                    </span>
                    <span className="font-medium text-white">{log.recipeName}</span>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-200">
                    {formatNumber(log.totalPairs)} Çift
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span
                      className={`font-bold ${
                        log.actualScrapRate <= 4 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      %{log.actualScrapRate}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {formatTRY(log.actualLaborCost)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {log.actualDurationDays} gün
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                      {log.efficiencyScore} / 100
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate">
                    <span className="text-slate-500 text-[10px] block">{log.completionDate}</span>
                    <span>{log.notes || '-'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
