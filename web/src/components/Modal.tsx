import { useEffect, useState, type FormEvent, type ReactNode } from 'react';

type Props = {
  titulo: string;
  descripcion?: string;
  textoBoton?: string;
  ancho?: number;
  lateral?: ReactNode;
  onCerrar: () => void;
  onGuardar: () => Promise<void>;
  children: ReactNode;
};

export default function Modal({ titulo, descripcion, textoBoton = 'Guardar', ancho = 560, lateral, onCerrar, onGuardar, children }: Props) {
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCerrar]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      await onGuardar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className={lateral ? 'modal con-lateral' : 'modal'} style={{ maxWidth: ancho }} onSubmit={submit}>
        {lateral && <div className="modal-lateral">{lateral}</div>}
        <div className="modal-principal">
          <div className="modal-cuerpo">
            <div>
              <h2>{titulo}</h2>
              {descripcion && <p className="muted">{descripcion}</p>}
            </div>
            <div className="campos">{children}</div>
            {error && <p className="error">{error}</p>}
          </div>
          <footer className="modal-pie">
            <button type="button" className="btn btn-secondary" onClick={onCerrar}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={enviando}>{textoBoton}</button>
          </footer>
        </div>
      </form>
    </div>
  );
}

export function Campo({ label, ancho, children }: { label: string; ancho?: boolean; children: ReactNode }) {
  return (
    <label className={ancho ? 'campo ancho' : 'campo'}>
      <span>{label}</span>
      {children}
    </label>
  );
}
