import React from 'react';
import { 
  Search, 
  Database,
  Bell,
  FileSpreadsheet,
  ShieldCheck
} from 'lucide-react';
import { getStoredSupabaseConfig } from '../lib/supabase';
import { useIAM } from '../context/IAMContext';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenWeighing?: () => void;
  onOpenExcelSync: () => void;
  criticalAlertsCount: number;
  onViewInventoryWithAlerts: () => void;
  onOpenCommandPalette: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onOpenWeighing,
  onOpenExcelSync,
  criticalAlertsCount,
  onViewInventoryWithAlerts,
  onOpenCommandPalette
}) => {
  const { isConfigured } = getStoredSupabaseConfig();
  const { role, user, permissions, setIsRoleModalOpen } = useIAM();

  return (
    <header className="h-20 bg-white border-b border-slate-300 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20">
      {/* Brand & Subtitle con tipografía nítida y minimalista */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-base shrink-0">
          GS
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              GREENSPOT
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">
              Economía Circular
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-semibold">
            Trazabilidad de Residuos Acuícolas & Ley REP
          </p>
        </div>
      </div>

      {/* Acciones principales limpias y despejadas */}
      <div className="flex items-center gap-3">
        {/* Buscador grande y nítido */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors w-64 justify-between"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-800">Buscar...</span>
          </div>
          <kbd className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-700 font-bold">
            Ctrl K
          </kbd>
        </button>

        {/* Alerta de stock crítico (solo si hay alertas) */}
        {criticalAlertsCount > 0 && (
          <button
            onClick={onViewInventoryWithAlerts}
            className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded-xl text-xs sm:text-sm font-bold transition-colors"
            title="Ver materiales con stock bajo"
          >
            <Bell className="w-4 h-4 text-amber-800" />
            <span>{criticalAlertsCount} Alertas</span>
          </button>
        )}

        {/* Botón Excel (.xlsx) */}
        <button
          onClick={onOpenExcelSync}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-bold transition-colors shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-white" />
          <span>Excel (.xlsx)</span>
        </button>

        {/* Switcher de Rol IAM (Admin / Operario) */}
        <button
          onClick={() => setIsRoleModalOpen(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all shadow-2xs ${
            role === 'admin'
              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
              : 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
          }`}
          title="Gestión de Acceso y Roles (IAM): Cambiar entre Administrador y Operario"
        >
          <span>{role === 'admin' ? '👔 Administrador' : '👷 Operario Planta'}</span>
          <span className="hidden lg:inline text-[10px] opacity-80 font-mono">({user.name.split(' ')[0]})</span>
        </button>

        {/* Conexión Base de Datos (Solo Administrador) */}
        {permissions.canAccessDatabaseSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
            title={isConfigured ? 'Supabase Conectado' : 'Configurar Base de Datos'}
          >
            <div className="relative">
              <Database className="w-5 h-5 text-slate-700" />
              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${isConfigured ? 'bg-emerald-600 ring-2 ring-white' : 'bg-amber-500 ring-2 ring-white'}`} />
            </div>
          </button>
        )}
      </div>
    </header>
  );
};
