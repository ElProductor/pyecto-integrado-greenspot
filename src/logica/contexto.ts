import { createContext, useContext } from 'react';
import type { Warehouse, Stakeholder, MaterialProduct, Batch, InventoryMovement, ValorizationCertificate, StockRow, Perfil } from '../datos/tipos';

/* ---------- datos compartidos por todas las pantallas ---------- */
export interface Datos {
  mat: MaterialProduct[]; lotes: Batch[]; mov: InventoryMovement[]; bod: Warehouse[];
  emp: Stakeholder[]; cert: ValorizationCertificate[]; stock: StockRow[]; usuarios: Perfil[];
}
export type Vista = 'inicio' | 'lotes' | 'mat' | 'mov' | 'emp' | 'cert' | 'rep' | 'conf';
export type PanelSel = { t: 'lote' | 'mat' | 'emp' | 'cert' | 'usuario' | 'mov'; id: string } | null;
export type Flujo = 'mov' | 'camion' | 'salida' | 'mover' | 'contar' | 'cert';
export type DlgSel = { t: 'flujo'; f: Flujo; pre?: string } | { t: 'form'; nombre: 'empresa' | 'material'; id?: string } | { t: 'cambio' } | { t: 'mipin' } | { t: 'ajuste'; id: string; modo: 'anular' | 'corregir' } | null;

export interface Ctx {
  D: Datos; esAdmin: boolean; usuario: string; uid: string;
  recargar: () => Promise<void>;
  aviso: (t: string) => void;
  setPanel: (p: PanelSel) => void;
  setDlg: (d: DlgSel) => void;
  ir: (v: Vista) => void;
}
export const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => { const c = useContext(AppCtx); if (!c) throw new Error('useApp fuera de AppCtx'); return c; };
