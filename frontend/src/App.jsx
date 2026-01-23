import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabaseClient';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';

// Módulos
import ComunicacionesPage from './pages/ComunicacionesPage'; 
import ComunicacionesEstudiante from './pages/ComunicacionesEstudiante'; 
import ReportesPage from './pages/ReportesPage'; 
import RegistroCompetencias from './pages/RegistroCompetencias';
import IGAEstadistica from './pages/IGAEstadistica'; // Asegúrate que sea el código en blanco

const App = () => {
  const [session, setSession] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [cursoActivo, setCursoActivo] = useState({ nombre: 'MATEMÁTICA', grado: '1° A' });

  // Función de carga de sesión y perfil (Manteniendo tu estructura)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      if (initialSession) {
        const { data } = await supabase.from('usuarios').select('rol_id, nombre_completo').eq('id_usuario', initialSession.user.id).single();
        setPerfilUsuario(data);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  // ✅ LOG DE CONTROL: Mira tu consola de Chrome, debe cambiar cuando hagas clic
  console.log("ESTADO ACTUAL DE LA VISTA:", currentView);

  if (loading) return <div className="h-screen flex items-center justify-center">Cargando...</div>;

  if (!session) return <LoginPage onLoginSuccess={setSession} />;

  return (
    <>
      <Toaster position="top-right" />
      <AppLayout 
        session={session} 
        userProfile={perfilUsuario} 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onLogout={() => supabase.auth.signOut()}
        onCursoSelect={(datos) => setCursoActivo(datos)} 
        cursoActivo={cursoActivo} 
      >
        <div className="w-full h-full">
          {/* ✅ LÓGICA DE RENDERIZADO PRIORITARIA */}
          {currentView === 'iga-estadistica' ? (
            <IGAEstadistica />
          ) : currentView === 'calificaciones' ? (
            <RegistroCompetencias 
              key={`${cursoActivo.nombre}-${cursoActivo.grado}`} 
              session={session} 
              areaNombre={cursoActivo.nombre}
              gradoSeccion={cursoActivo.grado}
            />
          ) : currentView === 'reportes' ? (
            <ReportesPage />
          ) : currentView === 'bandeja' ? (
            perfilUsuario?.rol_id === 6 ? <ComunicacionesEstudiante session={session} /> : <ComunicacionesPage session={session} userProfile={perfilUsuario} />
          ) : (
            /* VISTA DASHBOARD POR DEFECTO */
            <div className="p-8">
              <h1 className="text-2xl font-black uppercase tracking-tighter">
                {perfilUsuario?.rol_id === 1 ? "Panel de Control Administrativo" : "Mi Panel"}
              </h1>
              <p className="text-gray-500 italic">Bienvenido, {perfilUsuario?.nombre_completo}</p>
              
              {/* Si aquí tienes pegado el código de las tarjetas amarillas/verdes, 
                  esa es la razón por la que siempre se ven. */}
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
};

export default App;