import React, { useState } from 'react';
import { 
  Database, 
  Key, 
  Link as LinkIcon, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  FolderDown, 
  RefreshCw, 
  Upload, 
  FileCode, 
  ExternalLink,
  ShieldCheck,
  Server
} from 'lucide-react';
import { 
  getStoredSupabaseConfig, 
  saveSupabaseConfig, 
  testSupabaseConnection 
} from '../lib/supabase';
import { uploadFileToStorage } from '../lib/storage';
import { apiService } from '../services/api';

interface SupabaseSettingsViewProps {
  onRefreshData: () => Promise<void>;
}

export const SupabaseSettingsView: React.FC<SupabaseSettingsViewProps> = ({
  onRefreshData
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  // Prueba de Storage
  const [storageTestStatus, setStorageTestStatus] = useState<string | null>(null);
  const [storageResultUrl, setStorageResultUrl] = useState<string | null>(null);
  const [uploadingTest, setUploadingTest] = useState(false);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testSupabaseConnection(url, key);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Error desconocido' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, key);
    await handleTestConnection();
    await onRefreshData();
  };

  const handleResetDemo = () => {
    if (confirm('¿Restablecer datos demo a los valores originales de Greenspot?')) {
      apiService.resetToInitialDemo();
      window.location.reload();
    }
  };

  const handleStorageTestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setUploadingTest(true);
      setStorageTestStatus('Subiendo archivo de prueba a bucket greenspot-media...');
      const res = await uploadFileToStorage(file, 'greenspot-media', 'test');
      setStorageResultUrl(res.url);
      setStorageTestStatus(
        res.isSupabaseHosted 
          ? '¡Archivo subido exitosamente a Supabase Storage!' 
          : 'Archivo procesado localmente con éxito (modo fallback activo).'
      );
    } catch (err: any) {
      setStorageTestStatus(`Error en subida: ${err.message}`);
    } finally {
      setUploadingTest(false);
    }
  };

  const handleCopySchemaSql = () => {
    const sql = `-- Ejecuta este script en Supabase SQL Editor
-- Crea las tablas, triggers para balance de stock y políticas de Storage de Greenspot
-- Archivo completo ubicado en: /supabase/schema.sql`;
    navigator.clipboard.writeText(sql);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Configuración de Supabase (PostgreSQL & Storage)
        </h1>
        <p className="text-sm text-slate-500">
          Conecta la base de datos en la nube y los buckets de almacenamiento de documentos y fotografías
        </p>
      </div>

      {/* Tarjeta de Conexión */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Credenciales del Proyecto Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Disponibles en tu panel: Project Settings → API
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${currentConfig.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-xs font-bold text-slate-700">
              {currentConfig.isConfigured ? 'Conexión Configurada' : 'Modo Demo Local'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Project URL (VITE_SUPABASE_URL)</span>
            </label>
            <input
              type="url"
              placeholder="https://xyzabcdefg.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              <span>Anon Public Key (VITE_SUPABASE_ANON_KEY)</span>
            </label>
            <input
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                <span>{testing ? 'Comprobando...' : 'Probar Conexión'}</span>
              </button>

              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all"
              >
                Guardar Credenciales
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDemo}
              className="text-xs text-slate-500 hover:text-rose-600 font-medium underline"
            >
              Reiniciar datos de demostración
            </button>
          </div>
        </form>

        {/* Resultado del Test */}
        {testResult && (
          <div className={`p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 ${
            testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="block font-bold mb-0.5">
                {testResult.success ? 'Diagnóstico Positivo' : 'Aviso de Conexión'}
              </strong>
              <p>{testResult.message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Probar Supabase Storage */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Prueba de Supabase Storage (DB Storage)
            </h2>
            <p className="text-xs text-slate-500">
              Buckets configurados: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">greenspot-media</code> y <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">greenspot-docs</code>
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          Sube un archivo de prueba (foto de residuo, ticket de pesaje en PDF o imagen) para verificar la subida al bucket de Storage.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="cursor-pointer px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span>Seleccionar y Subir Archivo de Prueba</span>
            <input
              type="file"
              onChange={handleStorageTestUpload}
              className="hidden"
            />
          </label>

          {uploadingTest && (
            <span className="text-xs text-sky-600 font-bold flex items-center gap-2 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Subiendo a Supabase Storage...
            </span>
          )}
        </div>

        {storageTestStatus && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
            <span className="font-semibold">{storageTestStatus}</span>
            {storageResultUrl && (
              <div className="mt-2 pt-2 border-t border-slate-200/60 break-all">
                <span className="text-slate-400 block mb-0.5">URL del recurso generado:</span>
                <a 
                  href={storageResultUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-700 font-mono font-bold hover:underline flex items-center gap-1"
                >
                  <span>{storageResultUrl.slice(0, 80)}...</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scripts SQL para Supabase */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Scripts SQL para el Supabase SQL Editor
              </h2>
              <p className="text-xs text-slate-500">
                Copia y pega en la consola de tu proyecto Supabase para inicializar las tablas
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                1. Schema DDL Completo (schema.sql)
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Crea las 7 tablas maestras, Enums de polímeros, triggers para actualización automática de stock, y buckets de storage con políticas RLS.
              </p>
              <div className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-[11px] mb-3 overflow-x-auto">
                CREATE TABLE public.materials_and_products ...<br/>
                CREATE TRIGGER trg_apply_inventory_movement ...<br/>
                INSERT INTO storage.buckets ...
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Ubicación: <code className="text-slate-800 font-bold">/supabase/schema.sql</code>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 mb-1">
                2. Datos Semilla Operativos (seed.sql)
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Poblamiento con datos reales de la salmonicultura (AquaChile, Cermaq, Camanchaca, boyas, EPS plumavit, pellets certificados).
              </p>
              <div className="bg-slate-900 text-sky-400 p-2.5 rounded-lg font-mono text-[11px] mb-3 overflow-x-auto">
                INSERT INTO public.warehouses ...<br/>
                INSERT INTO public.stakeholders ...<br/>
                INSERT INTO public.valorization_certificates ...
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Ubicación: <code className="text-slate-800 font-bold">/supabase/seed.sql</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
