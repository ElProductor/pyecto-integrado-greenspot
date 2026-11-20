/* ---------- formato ---------- */
export const num = (n: number) => (Number(n) || 0).toLocaleString('es-CL', { maximumFractionDigits: 2 });
export const uni = (u: string) => (u === 'units' ? 'u' : u === 'big_bag' ? 'maxisacos' : u);
export const cant = (n: number, u = 'kg') => num(n) + ' ' + uni(u);
export const toneladas = (kg: number) => (kg / 1000).toLocaleString('es-CL', { maximumFractionDigits: 1 });
export function fecha(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso), hoy = new Date(), ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
  const h = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoy.toDateString()) return 'Hoy ' + h;
  if (d.toDateString() === ayer.toDateString()) return 'Ayer ' + h;
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: d.getFullYear() === hoy.getFullYear() ? undefined : '2-digit' }) + ' ' + h;
}
export const RUT_OK = /^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$/;
