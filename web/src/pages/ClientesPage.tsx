import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, useDatos } from '../api';
import Avatar from '../components/Avatar';
import ClienteModal from '../components/ClienteModal';

export default function ClientesPage() {
  const [q, setQ] = useState('');
  const [creando, setCreando] = useState(false);
  const { data: clientes, error } = useDatos(() => api.clientes(q), [q]);
  const navigate = useNavigate();

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p className="muted">Autónomos y empresas que lleva la asesoría.</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="buscador">
          <Search size={16} />
          <input placeholder="Buscar por nombre o NIF…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => setCreando(true)}>
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      <div className="grid-clientes">
        {clientes?.map((c) => (
          <Link key={c.id} to={`/clientes/${c.id}`} className="card cliente-card">
            <div className="cliente-card-top">
              <Avatar nombre={c.nombre} size={36} />
              <div>
                <strong>{c.nombre}</strong>
                <span className="muted">
                  {c.tipo === 'sociedad' ? 'Sociedad' : 'Autónomo'}{c.sector && ` · ${c.sector}`}
                </span>
              </div>
            </div>
            <dl className="datos">
              <div><dt>NIF</dt><dd className="mono">{c.nif ?? '—'}</dd></div>
              <div><dt>Asesor</dt><dd>{c.asesor ?? 'Sin asignar'}</dd></div>
              <div><dt>Facturas</dt><dd>{c.num_facturas}</dd></div>
              <div><dt>Documentos</dt><dd>{c.num_documentos}</dd></div>
            </dl>
          </Link>
        ))}
      </div>
      {clientes?.length === 0 && <div className="vacio card">No hay clientes que coincidan con “{q}”.</div>}

      {creando && (
        <ClienteModal
          onCerrar={() => setCreando(false)}
          onGuardar={async (c) => {
            const nuevo = await api.crearCliente(c);
            navigate(`/clientes/${nuevo.id}`);
          }}
        />
      )}
    </>
  );
}
