import React from 'react';
import { 
  LayoutDashboard, 
  Boxes, 
  Layers, 
  Building2,
  FileCheck2, 
  Database,
  Scale,
  FileSpreadsheet,
  ShieldCheck,
  ChevronRight,
  ArrowLeftRight
} from 'lucide-react';
import { KpiMetrics } from '../types';
import { useIAM } from '../context/IAMContext';

export type TabType = 
  | 'dashboard' 
  | 'inventory' 
  | 'batches' 
  | 'movements'
  | 'clients'
  | 'certificates' 
  | 'supabase';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  metrics: KpiMetrics | null;
  onOpenWeighing?: () => void;
  onOpenExcelSync?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  metrics,
  onOpenExcelSync
}) => {
  const { role, user, permissions, setIsRoleModalOpen } = useIAM();

  // Navegación adaptativa según rol IAM (Admin ve todo, Operario ve solo operaciones de planta)
  const allNavItems: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number; visible: boolean }[] = [
    { id: 'dashboard', label: 'Panel Principal', icon: LayoutDashboard, visible: true },
    { id: 'inventory', label: 'Inventario & Silos', icon: Boxes, visible: true },
    { id: 'batches', label: 'Lotes & Trazabilidad', icon: Layers, badge: metrics?.activeBatchesCount, visible: true },
    { id: 'movements', label: 'Movimientos (Kardex)', icon: ArrowLeftRight, visible: permissions.canRecordMovements },
    { id: 'clients', label: 'Clientes & Empresas', icon: Building2, visible: permissions.canViewClients },
    { id: 'certificates', label: 'Certificados Ley REP', icon: FileCheck2, visible: permissions.canIssueCertificates },
    { id: 'supabase', label: 'Configuración & BD', icon: Database, visible: permissions.canAccessDatabaseSettings },
  ];

  const navItems = allNavItems.filter(item => item.visible);

  const tonsRecycled = metrics ? (metrics.totalRecycledKg / 1000).toFixed(1) : '19.7';
  const co2AvoidedTons = metrics ? (metrics.totalCo2AvoidedKg / 1000).toFixed(1) : '37.7';

  return (
    <aside className="w-64 bg-white text-slate-900 flex flex-col shrink-0 border-r border-slate-300 select-none">
      {/* Menú de navegación principal */}
      <nav className="p-5 pt-6 space-y-2 flex-1">
        <div className="flex items-center justify-between px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>Menú</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold ${
            role === 'admin' ? 'bg-slate-900 text-white' : 'bg-emerald-800 text-white'
          }`}>
            {role === 'admin' ? 'ADMIN' : 'OPERARIO'}
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-semibold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (typeof item.badge === 'number' ? item.badge > 0 : Boolean(item.badge)) && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-800'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sincronización Excel Rápida en el lateral */}
      {onOpenExcelSync && (
        <div className="px-5 pb-3">
          <button
            onClick={onOpenExcelSync}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 rounded-xl text-xs font-bold transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Sincronizar con Excel</span>
          </button>
        </div>
      )}

      {/* Tarjeta Limpia de Impacto Ambiental */}
      <div className="p-4 m-4 bg-slate-50 rounded-xl border border-slate-300">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
          <span>Impacto Acreditado</span>
          <span className="text-emerald-800 font-extrabold">Sistema B</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="p-2 bg-white rounded-lg border border-slate-300">
            <div className="font-extrabold text-slate-900 text-sm">{tonsRecycled} t</div>
            <div className="text-xs text-slate-600 font-medium">Recicladas</div>
          </div>
          <div className="p-2 bg-white rounded-lg border border-slate-300">
            <div className="font-extrabold text-emerald-800 text-sm">{co2AvoidedTons} t</div>
            <div className="text-xs text-slate-600 font-medium">CO2eq Evit.</div>
          </div>
        </div>
      </div>

      {/* Perfil de Usuario IAM & Switcher */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60">
        <button
          onClick={() => setIsRoleModalOpen(true)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-200/70 border border-slate-300 transition-colors text-left"
          title="Gestión de Acceso y Roles (IAM): Cambiar entre Administrador y Operario"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs text-white shrink-0 ${
              role === 'admin' ? 'bg-slate-900' : 'bg-emerald-800'
            }`}>
              {user.avatarInitials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-slate-900 truncate">
                {user.name}
              </div>
              <div className="text-[11px] font-bold text-slate-600 truncate">
                {role === 'admin' ? '👔 Administrador' : '👷 Operario Planta'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-300 shrink-0">
            IAM
          </span>
        </button>
      </div>
    </aside>
  );
};
