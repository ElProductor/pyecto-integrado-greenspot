import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Layers, 
  Boxes, 
  ArrowLeftRight, 
  Warehouse, 
  Users2, 
  FileCheck2, 
  Database, 
  Target, 
  PlusCircle, 
  ArrowRight,
  Scale,
  FileSpreadsheet,
  Truck
} from 'lucide-react';
import { TabType } from './Sidebar';
import { MaterialProduct, Batch } from '../types';
import { useIAM } from '../context/IAMContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab: (tab: TabType) => void;
  materials: MaterialProduct[];
  batches: Batch[];
  onOpenNewBatch: () => void;
  onOpenNewMovement: () => void;
  onOpenNewCert: () => void;
  onOpenExcelSync?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  materials,
  batches,
  onOpenNewBatch,
  onOpenNewMovement,
  onOpenNewCert,
  onOpenExcelSync
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { permissions } = useIAM();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allNavItems: { label: string; tab: TabType; icon: React.ComponentType<{ className?: string }>; visible: boolean }[] = [
    { label: 'Panel Principal', tab: 'dashboard', icon: Boxes, visible: true },
    { label: 'Inventario & Silos', tab: 'inventory', icon: Boxes, visible: true },
    { label: 'Lotes & Trazabilidad', tab: 'batches', icon: Layers, visible: true },
    { label: 'Clientes & Empresas', tab: 'clients', icon: Users2, visible: permissions.canViewClients },
    { label: 'Certificados Ley REP', tab: 'certificates', icon: FileCheck2, visible: permissions.canIssueCertificates },
    { label: 'Configuración & BD', tab: 'supabase', icon: Database, visible: permissions.canAccessDatabaseSettings },
  ];

  const allActionItems = [
    { label: 'Sincronizar con Excel (.xlsx)', action: () => { onClose(); onOpenExcelSync?.(); }, icon: FileSpreadsheet, visible: true },
    { label: 'Pesaje de Camión en Romana', action: () => { onClose(); onOpenNewBatch(); }, icon: Scale, visible: permissions.canWeighTrucks },
    { label: 'Registrar Movimiento en Kardex', action: () => { onClose(); onOpenNewMovement(); }, icon: PlusCircle, visible: permissions.canRecordMovements },
    { label: 'Emitir Certificado Ley REP', action: () => { onClose(); onOpenNewCert(); }, icon: PlusCircle, visible: permissions.canIssueCertificates },
  ];

  const filteredNav = allNavItems
    .filter((i) => i.visible && i.label.toLowerCase().includes(query.toLowerCase()));
  const filteredActions = allActionItems
    .filter((i) => i.visible && i.label.toLowerCase().includes(query.toLowerCase()));
  const filteredMaterials = materials
    .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()) || m.code.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div 
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar material, lote, bodega o acción..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-base font-medium text-slate-800 placeholder:text-slate-400 bg-transparent focus:outline-hidden"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono font-semibold text-slate-400 bg-slate-100 rounded border border-slate-200">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-3 space-y-3">
          {filteredActions.length > 0 && (
            <div>
              <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Acciones Rápidas
              </div>
              <div className="space-y-1">
                {filteredActions.map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={i}
                      onClick={act.action}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-emerald-700" />
                        <span>{act.label}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredNav.length > 0 && (
            <div>
              <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Módulos
              </div>
              <div className="space-y-1">
                {filteredNav.map((nav, i) => {
                  const Icon = nav.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        onSelectTab(nav.tab);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span>{nav.label}</span>
                      </div>
                      <span className="text-xs text-slate-400">Ir</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredMaterials.length > 0 && (
            <div>
              <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                Materiales
              </div>
              <div className="space-y-1">
                {filteredMaterials.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => {
                      onSelectTab('inventory');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-left hover:bg-slate-100 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{mat.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{mat.code} • {mat.polymer_type}</div>
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-800">{mat.current_stock.toLocaleString('es-CL')} {mat.unit}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
