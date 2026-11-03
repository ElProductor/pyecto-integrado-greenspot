import React, { useState } from 'react';
import { 
  ArrowRight, 
  Leaf, 
  Flame, 
  Coins, 
  ShieldCheck, 
  Sliders, 
  Layers, 
  TrendingUp, 
  HelpCircle,
  Sparkles,
  Droplets,
  Recycle
} from 'lucide-react';

export const MassBalanceFlowView: React.FC = () => {
  // Slider interactivo: toneladas de entrada
  const [inputTons, setInputTons] = useState(45);
  const [polymerType, setPolymerType] = useState<'HDPE' | 'EPS' | 'PP'>('HDPE');

  // Factores dinámicos según polímero
  const factors = {
    HDPE: {
      organicLoss: 0.025, // Incrustaciones de mejillones/algas
      shredLoss: 0.015,   // Pérdida por secado/finos
      extrusionLoss: 0.010, // Filtro malla 80
      yieldRate: 0.950,
      co2Factor: 1.85,
      pelletPriceUSD: 1.35,
      composterYield: 55 // Unidades compostera 120L por tonelada
    },
    EPS: {
      organicLoss: 0.012,
      shredLoss: 0.018,
      extrusionLoss: 0.012,
      yieldRate: 0.958,
      co2Factor: 2.10,
      pelletPriceUSD: 1.50,
      composterYield: 60
    },
    PP: {
      organicLoss: 0.030,
      shredLoss: 0.020,
      extrusionLoss: 0.015,
      yieldRate: 0.935,
      co2Factor: 1.75,
      pelletPriceUSD: 1.25,
      composterYield: 50
    }
  }[polymerType];

  // Cálculos de Balance de Masa
  const stage1Received = inputTons;
  const stage2Washed = Number((stage1Received * (1 - factors.organicLoss)).toFixed(2));
  const stage3Shredded = Number((stage2Washed * (1 - factors.shredLoss)).toFixed(2));
  const stage4Pellet = Number((stage3Shredded * (1 - factors.extrusionLoss)).toFixed(2));
  const totalScrapTons = Number((stage1Received - stage4Pellet).toFixed(2));

  // Impacto
  const co2AvoidedTons = Number(((stage4Pellet * 1000 * factors.co2Factor) / 1000).toFixed(1));
  const waterSavedM3 = Number(((stage4Pellet * 1000 * 5) / 1000).toFixed(0));
  const marketValueUSD = Math.round(stage4Pellet * 1000 * factors.pelletPriceUSD);
  const compostersMade = Math.round(stage4Pellet * factors.composterYield);

  // ROI vs Vertedero
  const landfillCostPerTonCLP = 55000; // Flete + Tipping fee vertedero regional
  const landfillCostUSD = Math.round((stage1Received * landfillCostPerTonCLP) / 950);
  const recyclingNetBenefitUSD = marketValueUSD - (stage1Received * 180); // Restando costo molienda

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              Balance de Masa Circular & Flujo Termodinámico
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
              Zero Waste System
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500">
            Simulador termodinámico del flujo de materia: desde pasivos marinos brutos hasta materia prima circular certificada
          </p>
        </div>

        {/* Polymer Toggle */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          {(['HDPE', 'EPS', 'PP'] as const).map((poly) => (
            <button
              key={poly}
              onClick={() => setPolymerType(poly)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                polymerType === poly
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-2xs'
                  : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
              }`}
            >
              {poly}
            </button>
          ))}
        </div>
      </div>

      {/* Control Interactivo de Entrada */}
      <div className="p-5 bg-white dark:bg-[#121316] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs space-y-3">
        <div className="flex justify-between items-baseline">
          <div>
            <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
              Materia Prima Marina Ingresada a Báscula
            </span>
            <span className="text-[11px] text-neutral-400">
              Boyas, tuberías y pasivos acuícolas recibidos desde centros de cultivo
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">{inputTons}</span>
            <span className="text-xs font-semibold text-neutral-500 ml-1">Toneladas</span>
          </div>
        </div>

        <input
          type="range"
          min="5"
          max="150"
          step="5"
          value={inputTons}
          onChange={(e) => setInputTons(Number(e.target.value))}
          className="w-full accent-emerald-600 cursor-pointer"
        />

        <div className="flex justify-between text-[10px] text-neutral-400 font-mono">
          <span>5 Toneladas</span>
          <span>50 Toneladas</span>
          <span>100 Toneladas</span>
          <span>150 Toneladas (Capacidad mensual nave)</span>
        </div>
      </div>

      {/* Diagrama de Flujo / Sankey Interactivo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {/* Etapa 1 */}
        <div className="p-4 bg-white dark:bg-[#121316] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">1. Recepción Bruta</span>
            <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">100%</span>
          </div>
          <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mb-1">
            {stage1Received.toFixed(1)} t
          </div>
          <p className="text-[11px] text-neutral-500 leading-snug">
            Pasivo marino sin procesar. Pesaje verificado en báscula de camión con tolva.
          </p>
          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-[10px] text-neutral-400">
            Pérdida por bioincrustaciones: -{(stage1Received - stage2Washed).toFixed(2)} t
          </div>
        </div>

        {/* Etapa 2 */}
        <div className="p-4 bg-white dark:bg-[#121316] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">2. Lavado & Flakes</span>
            <span className="text-xs font-bold text-emerald-600">97.5%</span>
          </div>
          <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mb-1">
            {stage2Washed.toFixed(1)} t
          </div>
          <p className="text-[11px] text-neutral-500 leading-snug">
            Triturado a escamas de 10mm, centrifugado con agua recirculada y secado.
          </p>
          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-[10px] text-neutral-400">
            Humedad desgasificada: -{(stage2Washed - stage3Shredded).toFixed(2)} t
          </div>
        </div>

        {/* Etapa 3 */}
        <div className="p-4 bg-white dark:bg-[#121316] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">3. Extrusión Filtrada</span>
            <span className="text-xs font-bold text-emerald-600">96.0%</span>
          </div>
          <div className="text-xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mb-1">
            {stage3Shredded.toFixed(1)} t
          </div>
          <p className="text-[11px] text-neutral-500 leading-snug">
            Fusión homogénea a 195°C y filtrado a través de malla continua de 80 mesh.
          </p>
          <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 text-[10px] text-neutral-400">
            Filtro de carbonilla: -{(stage3Shredded - stage4Pellet).toFixed(2)} t
          </div>
        </div>

        {/* Etapa 4 */}
        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 shadow-2xs relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">4. Pellet Circular</span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
              {(factors.yieldRate * 100).toFixed(1)}% Rto
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-900 dark:text-emerald-200 mb-1">
            {stage4Pellet.toFixed(1)} t
          </div>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-snug">
            Pellet 100% valorizado en Big Bags certificados con código QR para inyección.
          </p>
          <div className="mt-3 pt-2 border-t border-emerald-200/50 dark:border-emerald-800/50 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
            Merma reinyectada: {totalScrapTons} t (0% vertedero)
          </div>
        </div>
      </div>

      {/* Resultados de Monetización & Impacto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-[#121316] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400">
            <Coins className="w-4 h-4" />
            <span className="text-xs font-semibold">Valor de Mercado Pellet</span>
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
            ${marketValueUSD.toLocaleString('es-CL')} <span className="text-xs font-medium text-neutral-400">USD</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">A USD ${factors.pelletPriceUSD}/kg certificado</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#121316] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-1 text-sky-600 dark:text-sky-400">
            <Flame className="w-4 h-4" />
            <span className="text-xs font-semibold">Emisiones CO2eq Evitadas</span>
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {co2AvoidedTons} <span className="text-xs font-medium text-neutral-400">t CO2eq</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Acreditable en Scope 3 GHG Protocol</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#121316] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-1 text-blue-600 dark:text-blue-400">
            <Droplets className="w-4 h-4" />
            <span className="text-xs font-semibold">Recursos Hídricos</span>
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {waterSavedM3} <span className="text-xs font-medium text-neutral-400">m³ H2O</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Agua que no se usó en resina virgen</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#121316] rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xs">
          <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400">
            <Recycle className="w-4 h-4" />
            <span className="text-xs font-semibold">Eco-Productos Potenciales</span>
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100">
            {compostersMade.toLocaleString('es-CL')} <span className="text-xs font-medium text-neutral-400">Unidades</span>
          </div>
          <span className="text-[11px] text-neutral-400 mt-1 block">Composteras domiciliarias 120L Greenspot</span>
        </div>
      </div>

      {/* Comparativa: Disposición en Vertedero vs Valorización Greenspot */}
      <div className="p-5 bg-neutral-900 text-white rounded-2xl border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <h3 className="text-sm font-bold text-white">Análisis Financiero & Legal: Vertedero vs Greenspot</h3>
          </div>
          <span className="text-[10px] font-mono text-neutral-400">Ahorro para la salmonicultura</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-neutral-800/60 rounded-xl border border-neutral-700/60 space-y-1.5">
            <span className="font-bold text-rose-400 block mb-1">Ruta Lineal Tradicional (Vertedero Curaco / Industrial)</span>
            <div className="flex justify-between text-neutral-300">
              <span>Costo Flete + Tasa de vertedero:</span>
              <span className="font-mono font-bold text-rose-300">${landfillCostUSD.toLocaleString('es-CL')} USD</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Riesgo Sanción SMA (Ley REP):</span>
              <span className="text-rose-400 font-semibold">Exposición a multas graves</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Retorno en imagen de marca:</span>
              <span className="text-neutral-400">0% (Pasivo de reputación)</span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-950/40 rounded-xl border border-emerald-800/40 space-y-1.5">
            <span className="font-bold text-emerald-400 block mb-1">Ruta Circular Greenspot (Triple Impacto B)</span>
            <div className="flex justify-between text-neutral-300">
              <span>Valor económico generado:</span>
              <span className="font-mono font-bold text-emerald-300">+${recyclingNetBenefitUSD.toLocaleString('es-CL')} USD</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Certificado de Destino Final REP:</span>
              <span className="text-emerald-400 font-semibold">100% Extinción de responsabilidad</span>
            </div>
            <div className="flex justify-between text-neutral-300">
              <span>Acreditación de Huella de Carbono:</span>
              <span className="text-emerald-400 font-semibold">{co2AvoidedTons} t CO2eq certificadas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
