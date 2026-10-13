import { ExternalLink, FileText, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { api, useDatos, type Documento } from '../api';
import { fecha, kb } from '../format';

export default function DocumentosTab({ clienteId }: { clienteId: number }) {
  const { data: documentos, recargar } = useDatos(() => api.documentos(clienteId), [clienteId]);
  const [seleccionado, setSeleccionado] = useState<Documento>();

  async function borrar(d: Documento) {
    if (!confirm(`¿Borrar ${d.nombre}?`)) return;
    await api.borrarDocumento(d.id);
    if (seleccionado?.id === d.id) setSeleccionado(undefined);
    recargar();
  }

  const pendientes = documentos?.filter((d) => d.estado === 'subido').length ?? 0;

  return (
    <>
      <div className="toolbar">
        <p className="muted small">Todo lo que se ha subido de este cliente. Los PDFs se suben desde Facturas → Añadir desde PDF.</p>
        <div className="resumen-linea">
          <span><strong>{documentos?.length ?? 0}</strong> documentos</span>
          <span><i className="punto ambar" /> <strong>{pendientes}</strong> pendientes</span>
        </div>
      </div>

      <div className={seleccionado ? 'docs con-preview' : 'docs'}>
        <div className="tabla-wrap">
          <table className="tabla">
            <thead>
              <tr><th>Documento</th><th>Estado</th><th>Subido</th><th className="num col-tamano">Tamaño</th><th /></tr>
            </thead>
            <tbody>
              {documentos?.map((d) => (
                <tr key={d.id} className={seleccionado?.id === d.id ? 'sel clicable' : 'clicable'} onClick={() => setSeleccionado(d)}>
                  <td>
                    <span className="doc-nombre"><FileText size={15} />{d.nombre}</span>
                  </td>
                  <td>
                    <span className="badge">
                      <i className={d.estado === 'subido' ? 'punto ambar' : 'punto verde'} />
                      {d.estado === 'subido' ? 'Pendiente' : 'Con factura'}
                    </span>
                  </td>
                  <td className="muted">{fecha(d.subido_en)}</td>
                  <td className="num muted col-tamano">{kb(d.tamano_bytes)}</td>
                  <td>
                    <div className="acciones-fila" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => borrar(d)} title="Borrar"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {documentos?.length === 0 && <tr><td colSpan={5} className="vacio">Todavía no hay documentos.</td></tr>}
            </tbody>
          </table>
        </div>

        {seleccionado && (
          <section className="card preview">
            <header>
              <span className="doc-nombre"><FileText size={15} />{seleccionado.nombre}</span>
              <div className="grupo">
                <a className="btn btn-ghost btn-sm btn-icon" href={api.urlDocumento(seleccionado.id)} target="_blank" rel="noreferrer" title="Abrir en otra pestaña">
                  <ExternalLink size={15} />
                </a>
                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSeleccionado(undefined)} title="Cerrar"><X size={15} /></button>
              </div>
            </header>
            <iframe title={seleccionado.nombre} src={api.urlDocumento(seleccionado.id)} />
          </section>
        )}
      </div>
    </>
  );
}
