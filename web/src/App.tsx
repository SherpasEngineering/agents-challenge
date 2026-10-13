import { Link, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import ChatBurbuja from './components/ChatBurbuja';
import ClientePage from './pages/ClientePage';
import ClientesPage from './pages/ClientesPage';

export default function App() {
  return (
    <>
      <header className="header">
        <Link to="/clientes" className="logo">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M12 3 22 20H2L12 3Z" fill="currentColor" />
          </svg>
          Asesoría
        </Link>
        <span className="separador">/</span>
        <nav>
          <NavLink to="/clientes">Clientes</NavLink>
        </nav>
      </header>
      <main className="contenido">
        <Routes>
          <Route path="/" element={<Navigate to="/clientes" replace />} />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/:id" element={<ClientePage />} />
        </Routes>
      </main>
      <ChatBurbuja />
    </>
  );
}
