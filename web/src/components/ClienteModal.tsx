import { useState } from 'react';
import { api, useDatos, type Cliente } from '../api';
import Modal, { Campo } from './Modal';

type Props = {
  inicial?: Partial<Cliente>;
  onGuardar: (c: Partial<Cliente>) => Promise<void>;
  onCerrar: () => void;
};

export default function ClienteModal({ inicial, onGuardar, onCerrar }: Props) {
  const { data: asesores } = useDatos(() => api.asesores(), []);
  const [c, setC] = useState<Partial<Cliente>>({ tipo: 'autonomo', ...inicial });
  const set = (k: keyof Cliente) => (e: { target: { value: string } }) => setC({ ...c, [k]: e.target.value });

  return (
    <Modal
      titulo={inicial ? 'Editar cliente' : 'Nuevo cliente'}
      descripcion={inicial ? undefined : 'Autónomo o sociedad que lleva la asesoría.'}
      textoBoton={inicial ? 'Guardar cambios' : 'Crear cliente'}
      onCerrar={onCerrar}
      onGuardar={() => onGuardar({ ...c, asesor_id: c.asesor_id ? Number(c.asesor_id) : null })}
    >
      <Campo label="Nombre o razón social" ancho><input required autoFocus value={c.nombre ?? ''} onChange={set('nombre')} /></Campo>
      <Campo label="NIF / CIF"><input value={c.nif ?? ''} onChange={set('nif')} /></Campo>
      <Campo label="Tipo">
        <select value={c.tipo} onChange={set('tipo')}>
          <option value="autonomo">Autónomo</option>
          <option value="sociedad">Sociedad</option>
        </select>
      </Campo>
      <Campo label="Sector"><input value={c.sector ?? ''} onChange={set('sector')} /></Campo>
      <Campo label="Asesor">
        <select value={c.asesor_id ?? ''} onChange={set('asesor_id')}>
          <option value="">Sin asignar</option>
          {asesores?.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
      </Campo>
      <Campo label="Email"><input type="email" value={c.email ?? ''} onChange={set('email')} /></Campo>
      <Campo label="Teléfono"><input value={c.telefono ?? ''} onChange={set('telefono')} /></Campo>
      <Campo label="Notas" ancho><textarea rows={3} value={c.notas ?? ''} onChange={set('notas')} /></Campo>
    </Modal>
  );
}
