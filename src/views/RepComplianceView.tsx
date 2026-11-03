import React, { useState } from 'react';
import { 
  Target, 
  ShieldCheck, 
  TrendingUp, 
  Building2, 
  Leaf, 
  Calculator, 
  CheckCircle2, 
  AlertTriangle,
  Scale
} from 'lucide-react';
import { RepTargetCompliance } from '../types';

interface RepComplianceViewProps {
  targets: RepTargetCompliance[];
}

export const RepComplianceView: React.FC<RepComplianceViewProps> = ({ targets }) => {
  // Simulador interactivo
  const [selectedCompanyId, setSelectedCompanyId] = useState(targets[0]?.id || '');
  const [projectedAdditionalKg, setProjectedAdditionalKg] = useState(12000);

  const selectedTarget = targets.find((t) => t.id === selectedCompanyId) || targets[0];

  const simulatedTotalKg = selectedTarget 
    ? selectedTarget.current_valorized_kg + Number(projectedAdditionalKg)
    : 0;

  const simulatedPercentage = selectedTarget && selectedTarget.annual_target_kg > 0
    ? Number(((simulatedTotalKg / selectedTarget.annual_target_kg) * 100).toFixed(1))
    : 0;

  const totalTargetAllKg = targets.reduce((acc, t) => acc + t.annual_target_kg, 0);
  const totalValorizedAllKg = targets.reduce((acc, t) => acc + t.current_valorized_kg, 0);
  const globalCompliancePct = totalTargetAllKg > 0 
    ? Math.round((totalValorizedAllKg / totalTargetAllKg) * 100) 
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Metas Ley REP & Cumplimiento Acuícola
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Ley N° 20.920 (Chile)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Seguimiento de metas legales de recolección y valorización de plásticos para empresas salmoneras y mitilicultoras
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Año Operativo:</span>
          <span className="font-mono text-xs font-bold bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
            2026
          </span>
        </div>
      </div>

      {/* KPI Cards Globales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Cumplimiento Global Cartera</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{globalCompliancePct}%</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> En Meta Anual
            </span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Meta fija de valorización sectorial</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Acreditado Greenspot</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">{(totalValorizedAllKg / 1000).toFixed(1)}</span>
            <span className="text-xs font-semibold text-slate-500">t de {(totalTargetAllKg / 1000).toFixed(1)} t</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Acreditación mediante Certificados REP</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Sanciones SMA Evitadas</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-700">100%</span>
            <span className="text-xs font-semibold text-slate-500">Protección Legal</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Trazabilidad fehaciente ante la SMA</span>
        </div>
      </div>

      {/* Grid de Cumplimiento por Empresa */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">Estado de Empresas Generadoras Reguladas</h2>
        
        <div className="space-y-4">
          {targets.map((t) => {
            const isAchieved = t.compliance_percentage >= 90;
            return (
              <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <span className="font-bold text-base text-slate-900">{t.stakeholder?.name || 'Salmonera'}</span>
                    <span className="text-xs text-slate-500 font-mono">({t.stakeholder?.tax_id})</span>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      isAchieved 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {isAchieved ? 'Meta Cumplida' : 'En Progreso'}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">
                    Valorizado: <strong className="text-slate-900">{t.current_valorized_kg.toLocaleString('es-CL')} kg</strong> de {t.annual_target_kg.toLocaleString('es-CL')} kg exigidos
                  </div>
                </div>

                <div className="sm:w-72 space-y-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-slate-600">Cumplimiento:</span>
                    <span className={isAchieved ? 'text-emerald-700 font-bold' : 'text-slate-900'}>
                      {t.compliance_percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all ${
                        isAchieved ? 'bg-emerald-600' : 'bg-slate-700'
                      }`}
                      style={{ width: `${Math.min(100, t.compliance_percentage)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulador Interactivo Ley REP - Diseño Claro, Minimalista y Descansado */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2 text-slate-900">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold">Simulador de Cumplimiento Ley REP</h2>
        </div>
        <p className="text-sm text-slate-600 mb-6 max-w-2xl leading-relaxed">
          Proyecta el impacto de nuevas entregas de boyas o plumavit de centros de cultivo para verificar el porcentaje de cumplimiento de metas antes de fin de año.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Seleccionar Empresa</label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:border-slate-400"
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.stakeholder?.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Entrega Proyectada (kg)</label>
            <input
              type="number"
              step="1000"
              value={projectedAdditionalKg}
              onChange={(e) => setProjectedAdditionalKg(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:border-slate-400"
            />
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
            <span className="text-xs text-slate-500 block mb-1 font-medium">Cumplimiento Proyectado</span>
            <span className="text-3xl font-extrabold text-emerald-700">{simulatedPercentage}%</span>
            <span className="text-xs text-slate-500 block mt-1">
              Total estimado: {(simulatedTotalKg / 1000).toFixed(1)} t / {(selectedTarget?.annual_target_kg / 1000).toFixed(1)} t
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
