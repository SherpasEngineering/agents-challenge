import { Info } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { api, useDatos } from '../api';
import { eur, eurK, trimestre } from '../format';

const C = { ingresos: '#171717', gastos: '#c7c7c7', resultado: '#0070f3', grid: '#f0f0f0', texto: '#8f8f8f' };
const eje = { tickLine: false, axisLine: false, tick: { fill: C.texto, fontSize: 12 } };
const tooltip = {
  formatter: (v: unknown) => eur(Number(v)),
  cursor: { fill: '#fafafa' },
  contentStyle: { border: '1px solid #eaeaea', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgb(0 0 0 / 0.06)' },
};
const leyenda = {
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
  formatter: (valor: string) => <span style={{ color: '#666' }}>{valor}</span>,
};

function Grafica({ titulo, descripcion, children }: { titulo: string; descripcion: string; children: ReactNode }) {
  return (
    <section className="card grafica">
      <header>
        <h3>{titulo}</h3>
        <p>{descripcion}</p>
      </header>
      {children}
    </section>
  );
}

export default function ResumenTab({ clienteId }: { clienteId: number }) {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const { data } = useDatos(() => api.resumen(clienteId, anio), [clienteId, anio]);
  if (!data) return null;

  const anios = [...new Set(data.facturasPorTrimestre.map((f) => f.anio))];
  const delAnio = data.resultados.filter((r) => r.anio === anio);
  const suma = (k: 'ingresos' | 'gastos' | 'resultado' | 'iva_a_pagar') => delAnio.reduce((s, r) => s + r[k], 0);
  const cerrados = new Set(data.resultados.map((r) => `${r.anio}-${r.trimestre}`));
  const sinCerrar = data.facturasPorTrimestre.filter((f) => !cerrados.has(`${f.anio}-${f.trimestre}`));
  const q = (a: number, t: number) => `${t}T ${String(a).slice(2)}`;

  const stats = [
    { label: 'Ingresos', valor: suma('ingresos') },
    { label: 'Gastos', valor: suma('gastos') },
    { label: 'Resultado', valor: suma('resultado') },
    { label: 'IVA a pagar', valor: suma('iva_a_pagar') },
  ];

  return (
    <>
      <div className="toolbar">
        <div>
          <h2>Resultados {anio}</h2>
          <p className="muted small">
            Trimestres cerrados: {delAnio.map((r) => trimestre(r.anio, r.trimestre)).join(', ') || 'ninguno'}
          </p>
        </div>
        <div className="segmentado">
          {anios.map((a) => (
            <button key={a} className={a === anio ? 'activo' : ''} onClick={() => setAnio(a)}>{a}</button>
          ))}
        </div>
      </div>

      <div className="card stats">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <span>{s.label}</span>
            <strong className={s.valor < 0 ? 'negativo' : ''}>{eur(s.valor)}</strong>
          </div>
        ))}
      </div>

      {sinCerrar.length > 0 && (
        <p className="aviso">
          <Info size={14} />
          Con facturas pero sin resultados cerrados: {sinCerrar.map((f) => trimestre(f.anio, f.trimestre)).join(', ')}
        </p>
      )}

      <div className="graficas">
        <Grafica titulo="Resultados por trimestre" descripcion="Ingresos y gastos de la contabilidad, con el resultado.">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data.resultados.map((r) => ({ ...r, q: q(r.anio, r.trimestre) }))} barGap={4}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="q" {...eje} />
              <YAxis tickFormatter={eurK} width={64} {...eje} />
              <Tooltip {...tooltip} />
              <Legend {...leyenda} />
              <Bar dataKey="ingresos" name="Ingresos" fill={C.ingresos} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="gastos" name="Gastos" fill={C.gastos} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Line dataKey="resultado" name="Resultado" stroke={C.resultado} strokeWidth={2} dot={{ r: 3, fill: C.resultado }} />
            </ComposedChart>
          </ResponsiveContainer>
        </Grafica>

        <Grafica titulo="Facturas registradas" descripcion="Base imponible de emitidas y recibidas.">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.facturasPorTrimestre.map((f) => ({ ...f, q: q(f.anio, f.trimestre) }))} barGap={4}>
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="q" {...eje} />
              <YAxis tickFormatter={eurK} width={64} {...eje} />
              <Tooltip {...tooltip} />
              <Legend {...leyenda} />
              <Bar dataKey="ventas" name="Emitidas" fill={C.ingresos} radius={[4, 4, 0, 0]} maxBarSize={20} />
              <Bar dataKey="compras" name="Recibidas" fill={C.gastos} radius={[4, 4, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </Grafica>

        <Grafica titulo="Gastos por categoría" descripcion={`Facturas recibidas en ${anio}.`}>
          <ResponsiveContainer width="100%" height={Math.max(160, data.gastosPorCategoria.length * 36)}>
            <BarChart data={data.gastosPorCategoria} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tickFormatter={eurK} {...eje} />
              <YAxis type="category" dataKey="categoria" width={110} {...eje} tick={{ fill: '#666', fontSize: 12 }} />
              <Tooltip {...tooltip} />
              <Bar dataKey="total" name="Base imponible" fill={C.ingresos} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </Grafica>
      </div>
    </>
  );
}
