import React from 'react';
import { 
  ShieldCheck, 
  HardHat, 
  Check, 
  X, 
  Lock, 
  Eye, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useIAM } from '../context/IAMContext';
import { useToast } from './Toast';

export const RoleSwitcherModal: React.FC = () => {
  const { role, switchRole, isRoleModalOpen, setIsRoleModalOpen } = useIAM();
  const { success } = useToast();

  if (!isRoleModalOpen) return null;

  const handleSelectRole = (newRole: 'admin' | 'operator') => {
    switchRole(newRole);
    success(
      `Perfil cambiado a ${newRole === 'admin' ? 'Administrador' : 'Operario de Planta'}`,
      newRole === 'admin' 
        ? 'Acceso total habilitado: finanzas, clientes y certificados' 
        : 'Interfaz simplificada: solo funciones operativas de planta'
    );
    setIsRoleModalOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-300 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Control de Acceso y Roles (IAM)
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Define qué puede ver y modificar cada trabajador en Greenspot
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsRoleModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido con 2 roles */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-700 font-semibold">
            Selecciona el perfil de usuario para alternar la sesión actual:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opción 1: Administrador */}
            <div
              onClick={() => handleSelectRole('admin')}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                role === 'admin'
                  ? 'border-slate-900 bg-slate-50/80 shadow-md ring-2 ring-slate-900/10'
                  : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👔</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-900 text-white uppercase tracking-wider">
                      Acceso Total
                    </span>
                  </div>
                  {role === 'admin' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      <Check className="w-3.5 h-3.5" />
                      Activo
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-900">
                  Administrador General
                </h3>
                <p className="text-xs text-slate-600 font-semibold mb-3">
                  Gerencia, Finanzas & Dirección
                </p>

                <p className="text-xs text-slate-700 leading-relaxed mb-4">
                  Visualiza y gestiona el 100% de la plataforma: costos y precios USD, clientes, certificados legales Ley REP, base de datos y eliminación.
                </p>

                <div className="space-y-1.5 text-xs text-slate-700 font-medium pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Todas las secciones visibles</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Ver costos, márgenes y precios</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Agregar, editar y eliminar clientes</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Emitir y descargar certificados REP</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Configuración & claves Supabase</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`mt-5 w-full py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  role === 'admin'
                    ? 'bg-slate-900 text-white cursor-default'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                }`}
              >
                {role === 'admin' ? 'Perfil Seleccionado' : 'Cambiar a Administrador'}
              </button>
            </div>

            {/* Opción 2: Operario de Planta */}
            <div
              onClick={() => handleSelectRole('operator')}
              className={`p-5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                role === 'operator'
                  ? 'border-emerald-700 bg-emerald-50/50 shadow-md ring-2 ring-emerald-700/10'
                  : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👷</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-800 text-white uppercase tracking-wider">
                      Planta & Patio
                    </span>
                  </div>
                  {role === 'operator' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      <Check className="w-3.5 h-3.5" />
                      Activo
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-900">
                  Operario de Planta
                </h3>
                <p className="text-xs text-slate-600 font-semibold mb-3">
                  Patio, Molienda & Romana
                </p>

                <p className="text-xs text-slate-700 leading-relaxed mb-4">
                  Interfaz simplificada y enfocada. Solo ve lo necesario para la faena física de recepción, pesaje en romana y avance de etapas.
                </p>

                <div className="space-y-1.5 text-xs text-slate-700 font-medium pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Panel, Inventario & Lotes activos</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Recepción de camiones y pesaje</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Avanzar etapas (Lavado, Molienda)</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Costos y precios USD ocultos</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-700">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>Clientes y Base de Datos ocultos</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={`mt-5 w-full py-2.5 rounded-lg text-xs font-bold transition-colors ${
                  role === 'operator'
                    ? 'bg-emerald-800 text-white cursor-default'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900'
                }`}
              >
                {role === 'operator' ? 'Perfil Seleccionado' : 'Cambiar a Operario'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 font-medium">
          <span>El rol seleccionado se guarda localmente en el navegador</span>
          <button
            onClick={() => setIsRoleModalOpen(false)}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};
