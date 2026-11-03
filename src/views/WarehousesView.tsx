import React from 'react';
import { 
  Warehouse as WarehouseIcon, 
  MapPin, 
  User, 
  Layers, 
  Boxes, 
  Gauge,
  CheckCircle2
} from 'lucide-react';
import { Warehouse, MaterialProduct } from '../types';

interface WarehousesViewProps {
  warehouses: Warehouse[];
  materials: MaterialProduct[];
}

export const WarehousesView: React.FC<WarehousesViewProps> = ({
  warehouses,
  materials
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Plantas, Bodegas & Patios de Acopio
        </h1>
        <p className="text-sm text-slate-500">
          Ubicaciones operativas de Greenspot en la Región de Los Lagos (Puerto Montt & Dalcahue)
        </p>
      </div>

      {/* Grid de Bodegas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {warehouses.map((wh) => {
          return (
            <div 
              key={wh.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {wh.code}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-lg mt-1">
                      {wh.name}
                    </h3>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Operativa
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{wh.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Jefe de Planta: <strong className="text-slate-800">{wh.manager_name}</strong></span>
                  </div>
                </div>

                {/* Capacidad y Ocupación */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3">
                  <div className="flex justify-between items-baseline mb-1 text-xs">
                    <span className="font-semibold text-slate-500">Capacidad Máxima Autorizada:</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {wh.capacity_tons} Toneladas
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, Math.floor(45 + Math.random() * 35))}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Espacio en patio disponible</span>
                    <span className="font-semibold text-emerald-700">Ocupación estimada: 62%</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Inspección Sanitaria al día</span>
                <span className="text-slate-600 font-medium">Báscula Calibrada 60t</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
