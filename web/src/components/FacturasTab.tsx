import { ExternalLink, FileText, PencilLine, Sparkles, Trash2, Upload } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { api, useDatos, type Documento } from '../api';
import { eur, fecha, kb } from '../format';
import Modal, { Campo } from './Modal';

const VACIA = {
  tipo: 'recibida', numero: '', fecha: new Date().toISOString().slice(0, 10), contraparte: '', contraparte_nif: '',
  concepto: '', categoria: '', base_imponible: '', iva_pct: '21', irpf_pct: '0',
};

const SIN_IA = 'IA de extracción: es parte del reto, no está implementada';

export default function FacturasTab({ clienteId }: { clienteId: number }) {
  const [filtros, setFiltros] = useState({ tipo: '', anio: String(new Date().getFullYear()), trimestre: '' });
  const { data: facturas, recargar } = useDatos(() => api.facturas(clienteId, filtros), [clienteId, filtros]);
  const { data: documentos, recargar: recargarDocs } = useDatos(() => api.documentos(clienteId), [clienteId]);
  const [form, setForm] = useState<typeof VACIA | null>(null);
  const [desdePdf, setDesdePdf] = useState<Documento>();
  const [subiendo, setSubiendo] = useState(false);
  const [encima, setEncima] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const setF = (k: keyof typeof filtros) => (e: { target: { value: string } }) => setFiltros({ ...filtros, [k]: e.target.value });
  const set = (k: keyof typeof VACIA) => (e: { target: { value: string } }) => setForm({ ...form!, [k]: e.target.value });

  function abrir(doc?: Documento) {
    setDesdePdf(doc);
    setForm(VACIA);
  }

  function cerrar() {
    setForm(null);
    setDesdePdf(undefined);
  }

  async function guardar() {
    await api.crearFactura(clienteId, {
      ...form,
      base_imponible: Number(form!.base_imponible),
      iva_pct: Number(form!.iva_pct),
      irpf_pct: Number(form!.irpf_pct),
      documento_id: desdePdf?.id ?? null,
    });
    cerrar();
    recargar();
    recargarDocs();
  }

  async function borrar(id: number) {
    if (!confirm('¿Borrar esta factura?')) return;
    await api.borrarFactura(id);
    recargar();
    recargarDocs();
  }

  async function subir(files: File[]) {
    if (!files.length) return;
    setSubiendo(true);
    try {
      for (const f of files) await api.subirDocumento(clienteId, f);
    } finally {
      setSubiendo(false);
      recargarDocs();
    }
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setEncima(false);
    subir([...e.dataTransfer.files]);
  }

  async function borrarDoc(d: Documento) {
    if (!confirm(`¿Borrar ${d.nombre}?`)) return;
    await api.borrarDocumento(d.id);
    recargarDocs();
  }

  const total = (tipo: string) => (facturas ?? []).filter((f) => f.tipo === tipo).reduce((s, f) => s + f.base_imponible, 0);
  const pendientes = documentos?.filter((d) => d.estado === 'subido') ?? [];

  return (
    <>
      <div className="entradas">
        <button type="button" className="entrada" onClick={() => abrir()}>
          <span className="entrada-icono"><PencilLine size={18} /></span>
          <span className="entrada-texto">
            <strong>Añadir a mano</strong>
            <span>Rellena los datos de la factura en un formulario.</span>
          </span>
        </button>
        <div
          className={encima ? 'entrada entrada-pdf encima' : 'entrada entrada-pdf'}
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setEncima(true); }}
          onDragLeave={() => setEncima(false)}
          onDrop={soltar}
        >
          <span className="entrada-icono"><Upload size={18} /></span>
          <span className="entrada-texto">
            <strong>{subiendo ? 'Subiendo…' : 'Añadir desde PDF'}</strong>
            <span>Arrastra uno o varios PDFs aquí, o haz clic. La IA sacaría los datos; hoy quedan pendientes.</span>
          </span>
          <span className="badge"><Sparkles size={12} /> IA</span>
          <input
            ref={input} type="file" multiple accept="application/pdf,image/*" hidden
            onChange={(e) => { subir([...(e.target.files ?? [])]); e.target.value = ''; }}
          />
        </div>
      </div>

      {pendientes.length > 0 && (
        <section className="card pendientes">
          <header>
            <h3>PDFs pendientes</h3>
            <span className="badge"><i className="punto ambar" />{pendientes.length}</span>
            <span className="muted small">Subidos, sin factura todavía.</span>
          </header>
          <ul>
            {pendientes.map((d) => (
              <li key={d.id}>
                <span className="doc-nombre"><FileText size={15} />{d.nombre}</span>
                <span className="muted small">{fecha(d.subido_en)} · {kb(d.tamano_bytes)}</span>
                <div className="acciones-fila">
                  <button className="btn btn-secondary btn-sm" disabled title={SIN_IA}><Sparkles size={14} /> Extraer con IA</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => abrir(d)}><PencilLine size={14} /> Rellenar a mano</button>
                  <a className="btn btn-ghost btn-sm btn-icon" href={api.urlDocumento(d.id)} target="_blank" rel="noreferrer" title="Abrir PDF">
                    <ExternalLink size={15} />
                  </a>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => borrarDoc(d)} title="Borrar"><Trash2 size={15} /></button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="toolbar">
        <div className="grupo">
          <select value={filtros.tipo} onChange={setF('tipo')}>
            <option value="">Emitidas y recibidas</option>
            <option value="emitida">Emitidas</option>
            <option value="recibida">Recibidas</option>
          </select>
          <select value={filtros.anio} onChange={setF('anio')}>
            <option value="">Todos los años</option>
            <option>2026</option>
            <option>2025</option>
          </select>
          <select value={filtros.trimestre} onChange={setF('trimestre')}>
            <option value="">Todo el año</option>
            {[1, 2, 3, 4].map((t) => <option key={t} value={t}>{t}T</option>)}
          </select>
        </div>
        <div className="resumen-linea">
          <span><strong>{facturas?.length ?? 0}</strong> facturas</span>
          <span><i className="punto verde" /> Emitidas <strong>{eur(total('emitida'))}</strong></span>
          <span><i className="punto ambar" /> Recibidas <strong>{eur(total('recibida'))}</strong></span>
        </div>
      </div>

      <div className="tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Fecha</th><th>Número</th><th>Tipo</th><th>Contraparte</th><th className="col-concepto">Concepto</th><th>Categoría</th>
              <th className="num">Base</th><th className="num">IVA</th><th className="num">IRPF</th><th className="num">Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {facturas?.map((f) => (
              <tr key={f.id}>
                <td className="muted">{fecha(f.fecha)}</td>
                <td className="mono">{f.numero}</td>
                <td>
                  <span className="badge"><i className={f.tipo === 'emitida' ? 'punto verde' : 'punto ambar'} />{f.tipo === 'emitida' ? 'Emitida' : 'Recibida'}</span>
                </td>
                <td className="recorte" title={`${f.contraparte ?? ''} · ${f.contraparte_nif ?? ''}`}>{f.contraparte}</td>
                <td className="recorte muted col-concepto" title={f.concepto ?? ''}>{f.concepto}</td>
                <td className="muted">{f.categoria}</td>
                <td className="num">{eur(f.base_imponible)}</td>
                <td className="num muted">{f.iva_pct}%</td>
                <td className="num muted">{f.irpf_pct ? `−${f.irpf_pct}%` : ''}</td>
                <td className="num"><strong>{eur(f.total)}</strong></td>
                <td>
                  <div className="acciones-fila">
                    {f.documento_id && (
                      <a className="btn btn-ghost btn-sm btn-icon" href={api.urlDocumento(f.documento_id)} target="_blank" rel="noreferrer" title={f.documento_nombre ?? 'Ver PDF'}>
                        <FileText size={15} />
                      </a>
                    )}
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => borrar(f.id)} title="Borrar">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {facturas?.length === 0 && <tr><td colSpan={11} className="vacio">No hay facturas con estos filtros.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal
          titulo={desdePdf ? 'Factura desde PDF' : 'Nueva factura'}
          descripcion={desdePdf ? `Pasa a mano los datos de ${desdePdf.nombre}. El IVA, la retención y el total se calculan solos.` : 'El IVA, la retención y el total se calculan solos.'}
          textoBoton="Crear factura"
          ancho={desdePdf ? 1180 : 640}
          lateral={desdePdf && <iframe title={desdePdf.nombre} src={api.urlDocumento(desdePdf.id)} />}
          onCerrar={cerrar}
          onGuardar={guardar}
        >
          <Campo label="Tipo">
            <select value={form.tipo} onChange={set('tipo')}>
              <option value="recibida">Recibida (gasto)</option>
              <option value="emitida">Emitida (venta)</option>
            </select>
          </Campo>
          <Campo label="Fecha"><input type="date" required value={form.fecha} onChange={set('fecha')} /></Campo>
          <Campo label="Número"><input value={form.numero} onChange={set('numero')} /></Campo>
          <Campo label="Categoría"><input value={form.categoria} onChange={set('categoria')} placeholder="suministros, compras…" /></Campo>
          <Campo label={form.tipo === 'emitida' ? 'Cliente' : 'Proveedor'}><input value={form.contraparte} onChange={set('contraparte')} /></Campo>
          <Campo label="NIF"><input value={form.contraparte_nif} onChange={set('contraparte_nif')} /></Campo>
          <Campo label="Concepto" ancho><input value={form.concepto} onChange={set('concepto')} /></Campo>
          <Campo label="Base imponible"><input type="number" step="0.01" required value={form.base_imponible} onChange={set('base_imponible')} /></Campo>
          <Campo label="IVA">
            <select value={form.iva_pct} onChange={set('iva_pct')}>
              {['21', '10', '4', '0'].map((v) => <option key={v} value={v}>{v}%</option>)}
            </select>
          </Campo>
          <Campo label="Retención IRPF">
            <select value={form.irpf_pct} onChange={set('irpf_pct')}>
              {['0', '7', '15', '19'].map((v) => <option key={v} value={v}>{v}%</option>)}
            </select>
          </Campo>
        </Modal>
      )}
    </>
  );
}
