import { Info, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, useDatos } from '../api';
import Avatar from '../components/Avatar';
import ClienteModal from '../components/ClienteModal';
import DocumentosTab from '../components/DocumentosTab';
import FacturasTab from '../components/FacturasTab';
import ResultadosTab from '../components/ResultadosTab';
import ResumenTab from '../components/ResumenTab';

const TABS = { resumen: 'Resumen', facturas: 'Facturas', resultados: 'Resultados', documentos: 'Documentos' } as const;
type Tab = keyof typeof TABS;

export default function ClientePage() {
  const id = Number(useParams().id);
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) in TABS ? (params.get('tab') as Tab) : 'resumen';
  const [editando, setEditando] = useState(false);
  const { data: cliente, error, recargar } = useDatos(() => api.cliente(id), [id]);
  const navigate = useNavigate();

  if (error) return <p className="error">{error}</p>;
  if (!cliente) return null;

  async function borrar() {
    if (!confirm(`¿Borrar ${cliente!.nombre} con todas sus facturas, resultados y documentos?`)) return;
    await api.borrarCliente(id);
    navigate('/clientes');
  }

  return (
    <>
      <nav className="migas">
        <Link to="/clientes">Clientes</Link>
        <span>/</span>
        <span className="actual">{cliente.nombre}</span>
      </nav>

      <div className="page-header">
        <div className="titulo">
          <Avatar nombre={cliente.nombre} size={48} />
          <div>
            <h1>{cliente.nombre}</h1>
            <p className="muted meta">
              <span className="mono">{cliente.nif}</span>
              <span>{cliente.tipo === 'sociedad' ? 'Sociedad' : 'Autónomo'}</span>
              {cliente.sector && <span>{cliente.sector}</span>}
              <span>{cliente.asesor ?? 'Sin asesor'}</span>
            </p>
          </div>
        </div>
        <div className="grupo">
          <button className="btn btn-secondary" onClick={() => setEditando(true)}>Editar</button>
          <button className="btn btn-secondary btn-icon btn-peligro" onClick={borrar} title="Borrar cliente">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {cliente.notas && (
        <div className="nota">
          <Info size={16} />
          {cliente.notas}
        </div>
      )}

      <nav className="tabs">
        {(Object.keys(TABS) as Tab[]).map((t) => (
          <button key={t} className={t === tab ? 'tab activa' : 'tab'} onClick={() => setParams({ tab: t })}>{TABS[t]}</button>
        ))}
      </nav>

      {tab === 'resumen' && <ResumenTab clienteId={id} />}
      {tab === 'facturas' && <FacturasTab clienteId={id} />}
      {tab === 'resultados' && <ResultadosTab clienteId={id} />}
      {tab === 'documentos' && <DocumentosTab clienteId={id} />}

      {editando && (
        <ClienteModal
          inicial={cliente}
          onCerrar={() => setEditando(false)}
          onGuardar={async (c) => {
            await api.editarCliente(id, c);
            setEditando(false);
            recargar();
          }}
        />
      )}
    </>
  );
}
