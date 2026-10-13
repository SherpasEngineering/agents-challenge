import { ArrowUp, MessageCircle, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { matchPath, useLocation, useSearchParams } from 'react-router-dom';
import { api, useDatos } from '../api';

// Solo la carcasa: el asistente es parte del reto (ver CHALLENGE.md).
export default function ChatBurbuja() {
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const clienteId = Number(matchPath('/clientes/:id', pathname)?.params.id) || undefined;
  const { data: cliente } = useDatos(async () => (clienteId ? api.cliente(clienteId) : undefined), [clienteId]);

  return (
    <div className="chat">
      {abierto && (
        <section className="chat-panel">
          <header className="chat-cabecera">
            <div><Sparkles size={16} /> Asistente <span className="badge">No implementado</span></div>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setAbierto(false)} title="Cerrar"><X size={16} /></button>
          </header>
          <div className="chat-cuerpo">
            <div className="mensaje">
              Aquí irá el asistente del asesor: hablar de un cliente, pedir insights de sus datos y documentos, y hacer
              cosas en la app. Es parte del reto.
            </div>
            <div className="contexto">
              <strong>Contexto que recibiría</strong>
              {clienteId ? `Cliente · ${params.get('tab') ?? 'resumen'}` : 'Listado de clientes'}
              {cliente && <> · {cliente.nombre} (#{cliente.id})</>}
            </div>
          </div>
          <div className="chat-entrada">
            <input disabled placeholder="¿Cómo va este cliente respecto al año pasado?" />
            <button className="btn btn-primary btn-icon" disabled><ArrowUp size={16} /></button>
          </div>
        </section>
      )}
      <button className="chat-boton" onClick={() => setAbierto(!abierto)} aria-label="Abrir asistente">
        {abierto ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </div>
  );
}
