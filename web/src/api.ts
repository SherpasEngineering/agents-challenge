import { useEffect, useState } from 'react';

export type Asesor = { id: number; nombre: string; email: string };
export type ClienteFila = {
  id: number; nombre: string; nif: string | null; tipo: string; sector: string | null;
  asesor: string | null; num_facturas: number; num_documentos: number;
};
export type Cliente = {
  id: number; asesor_id: number | null; asesor: string | null; nombre: string; nif: string | null;
  tipo: 'autonomo' | 'sociedad'; sector: string | null; email: string | null; telefono: string | null; notas: string | null;
};
export type Factura = {
  id: number; tipo: 'emitida' | 'recibida'; numero: string | null; fecha: string; contraparte: string | null;
  contraparte_nif: string | null; concepto: string | null; categoria: string | null; base_imponible: number;
  iva_pct: number; iva_importe: number; irpf_pct: number; irpf_importe: number; total: number;
  documento_id: number | null; documento_nombre: string | null; origen: string;
};
export type Resultado = {
  id: number; anio: number; trimestre: number; ingresos: number; gastos: number; resultado: number;
  iva_repercutido: number; iva_soportado: number; iva_a_pagar: number; notas: string | null;
};
export type Documento = {
  id: number; nombre: string; content_type: string | null; tamano_bytes: number; estado: 'subido' | 'procesado';
  subido_en: string; num_facturas: number;
};
export type Resumen = {
  anio: number;
  resultados: { anio: number; trimestre: number; ingresos: number; gastos: number; resultado: number; iva_a_pagar: number }[];
  facturasPorTrimestre: { anio: number; trimestre: number; ventas: number; compras: number }[];
  gastosPorCategoria: { categoria: string; total: number }[];
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
const json = (method: string, body: unknown): RequestInit => ({
  method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});
const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][]);
  return s.size ? `?${s}` : '';
};

export const api = {
  asesores: () => req<Asesor[]>('/asesores'),
  clientes: (q?: string) => req<ClienteFila[]>(`/clientes${qs({ q })}`),
  cliente: (id: number) => req<Cliente>(`/clientes/${id}`),
  crearCliente: (b: Partial<Cliente>) => req<Cliente>('/clientes', json('POST', b)),
  editarCliente: (id: number, b: Partial<Cliente>) => req<Cliente>(`/clientes/${id}`, json('PUT', b)),
  borrarCliente: (id: number) => req<void>(`/clientes/${id}`, { method: 'DELETE' }),
  resumen: (id: number, anio: number) => req<Resumen>(`/clientes/${id}/resumen${qs({ anio })}`),

  facturas: (id: number, f: { tipo?: string; anio?: string; trimestre?: string }) => req<Factura[]>(`/clientes/${id}/facturas${qs(f)}`),
  crearFactura: (id: number, b: Record<string, unknown>) => req<Factura>(`/clientes/${id}/facturas`, json('POST', b)),
  borrarFactura: (id: number) => req<void>(`/facturas/${id}`, { method: 'DELETE' }),

  resultados: (id: number) => req<Resultado[]>(`/clientes/${id}/resultados`),
  guardarResultado: (id: number, b: Record<string, unknown>) => req<Resultado>(`/clientes/${id}/resultados`, json('PUT', b)),
  borrarResultado: (id: number) => req<void>(`/resultados/${id}`, { method: 'DELETE' }),

  documentos: (id: number) => req<Documento[]>(`/clientes/${id}/documentos`),
  subirDocumento: (id: number, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return req<Documento>(`/clientes/${id}/documentos`, { method: 'POST', body: fd });
  },
  borrarDocumento: (id: number) => req<void>(`/documentos/${id}`, { method: 'DELETE' }),
  urlDocumento: (id: number) => `/api/documentos/${id}/archivo`,
};

export function useDatos<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let vivo = true;
    fn().then((d) => vivo && setData(d)).catch((e: Error) => vivo && setError(e.message));
    return () => {
      vivo = false;
    };
  }, [...deps, version]);
  return { data, error, recargar: () => setVersion((v) => v + 1) };
}
