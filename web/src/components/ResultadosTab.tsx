import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api, useDatos, type Resultado } from '../api';
import { eur, trimestre } from '../format';
import Modal, { Campo } from './Modal';

type Form = Record<'anio' | 'trimestre' | 'ingresos' | 'gastos' | 'iva_repercutido' | 'iva_soportado' | 'notas', string>;
const VACIO: Form = { anio: String(new Date().getFullYear()), trimestre: '1', ingresos: '', gastos: '', iva_repercutido: '', iva_soportado: '', notas: '' };
const aForm = (r: Resultado): Form => ({
  anio: String(r.anio), trimestre: String(r.trimestre), ingresos: String(r.ingresos), gastos: String(r.gastos),
  iva_repercutido: String(r.iva_repercutido), iva_soportado: String(r.iva_soportado), notas: r.notas ?? '',
});

export default function ResultadosTab({ clienteId }: { clienteId: number }) {
  const { data: resultados, recargar } = useDatos(() => api.resultados(clienteId), [clienteId]);
  const [form, setForm] = useState<Form | null>(null);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setForm({ ...form!, [k]: e.target.value });

  async function guardar() {
    const f = form!;
    await api.guardarResultado(clienteId, {
      anio: Number(f.anio), trimestre: Number(f.trimestre), ingresos: Number(f.ingresos), gastos: Number(f.gastos),
      iva_repercutido: Number(f.iva_repercutido || 0), iva_soportado: Number(f.iva_soportado || 0), notas: f.notas || null,
    });
    setForm(null);
    recargar();
  }

  async function borrar(r: Resultado) {
    if (!confirm(`¿Borrar el resultado del ${trimestre(r.anio, r.trimestre)}?`)) return;
    await api.borrarResultado(r.id);
    recargar();
  }

  return (
    <>
      <div className="toolbar">
        <p className="muted">Resultados que cierra el asesor cada trimestre a partir de la contabilidad.</p>
        <button className="btn btn-primary" onClick={() => setForm(VACIO)}>
          <Plus size={16} /> Añadir trimestre
        </button>
      </div>

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Trimestre</th><th className="num">Ingresos</th><th className="num">Gastos</th><th className="num">Resultado</th>
              <th className="num">IVA repercutido</th><th className="num">IVA soportado</th><th className="num">IVA a pagar</th>
              <th>Notas</th><th />
            </tr>
          </thead>
          <tbody>
            {resultados?.map((r) => (
              <tr key={r.id}>
                <td><strong>{trimestre(r.anio, r.trimestre)}</strong></td>
                <td className="num">{eur(r.ingresos)}</td>
                <td className="num">{eur(r.gastos)}</td>
                <td className={`num ${r.resultado < 0 ? 'negativo' : ''}`}><strong>{eur(r.resultado)}</strong></td>
                <td className="num muted">{eur(r.iva_repercutido)}</td>
                <td className="num muted">{eur(r.iva_soportado)}</td>
                <td className="num">{eur(r.iva_a_pagar)}</td>
                <td className="recorte muted" title={r.notas ?? ''}>{r.notas}</td>
                <td>
                  <div className="acciones-fila">
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setForm(aForm(r))} title="Editar"><Pencil size={15} /></button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => borrar(r)} title="Borrar"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {resultados?.length === 0 && <tr><td colSpan={9} className="vacio">Sin resultados todavía.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal titulo="Resultado trimestral" descripcion="Si el trimestre ya existe, se sobrescribe." onCerrar={() => setForm(null)} onGuardar={guardar}>
          <Campo label="Año"><input type="number" required value={form.anio} onChange={set('anio')} /></Campo>
          <Campo label="Trimestre">
            <select value={form.trimestre} onChange={set('trimestre')}>
              {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{t}T</option>)}
            </select>
          </Campo>
          <Campo label="Ingresos"><input type="number" step="0.01" required value={form.ingresos} onChange={set('ingresos')} /></Campo>
          <Campo label="Gastos"><input type="number" step="0.01" required value={form.gastos} onChange={set('gastos')} /></Campo>
          <Campo label="IVA repercutido"><input type="number" step="0.01" value={form.iva_repercutido} onChange={set('iva_repercutido')} /></Campo>
          <Campo label="IVA soportado"><input type="number" step="0.01" value={form.iva_soportado} onChange={set('iva_soportado')} /></Campo>
          <Campo label="Notas" ancho><input value={form.notas} onChange={set('notas')} /></Campo>
        </Modal>
      )}
    </>
  );
}
