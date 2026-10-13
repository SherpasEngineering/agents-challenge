const eurFmt = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const eurCorto = new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 });

export const eur = (n: number) => eurFmt.format(n);
export const eurK = (n: number) => `${eurCorto.format(n)} €`;
export const fecha = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
export const trimestre = (anio: number, t: number) => `${t}T ${anio}`;
export const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;
