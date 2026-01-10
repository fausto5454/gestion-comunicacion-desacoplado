import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabaseClient';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';

// Importamos los módulos
import ComunicacionesPage from './pages/ComunicacionesPage'; 
import ComunicacionesEstudiante from './pages/ComunicacionesEstudiante'; 
import ReportesPage from './pages/ReportesPage'; // ✅ Asegúrate de importar la página de reportes

const App = () => {
  const [session, setSession] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  const cargarPerfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol_id, nombre_completo')
        .eq('id_usuario', userId)
        .single();

      if (data) {
        setPerfilUsuario(data);
        console.log("Rol detectado:", data.rol_id); 
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
    } finally {
      // ✅ CRÍTICO: Una vez cargado el perfil (o si falla), quitamos el loading
      setLoading(false); 
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      
      if (initialSession) {
        await cargarPerfil(initialSession.user.id);
      } else {
        setLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
        setSession(currentSession);
        if (currentSession) {
          await cargarPerfil(currentSession.user.id);
        } else {
          setPerfilUsuario(null);
          setLoading(false);
        }
      });

      return () => subscription.unsubscribe();
    };

    checkSession();
  }, []);

  const renderView = () => {
    const esAdminAutorizado = perfilUsuario?.rol_id === 1;

    if (session && !perfilUsuario) {
      return (
        <div className="p-20 text-center flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-gray-500">Validando permisos de seguridad...</p>
        </div>
      );
    }

    switch (currentView) {
      case 'reportes': // ✅ Agregamos el caso para reportes
        return <ReportesPage />;

      case 'comunicaciones':
        if (!esAdminAutorizado) {
          return (
            <div className="p-10 bg-slate-50 min-h-screen">
              <div className="bg-emerald-600 text-white p-10 rounded-[3rem] shadow-2xl">
                <h1 className="text-4xl font-black italic uppercase">Mi Bandeja de Entrada</h1>
                <p className="opacity-70 font-bold text-xs tracking-[0.4em] mt-2">Portal Oficial de Alumno</p>
              </div>
              <div className="mt-10 bg-white border-4 border-dashed border-slate-200 rounded-[4rem] p-20 text-center">
                <p className="text-slate-400 font-black text-xl uppercase">No hay comunicados nuevos</p>
              </div>
            </div>
          );
        } 
        return <ComunicacionesPage session={session} userProfile={perfilUsuario} />;

      case 'dashboard':
        return (
          <div className="p-8">
            <h1 className="text-2xl font-black uppercase tracking-tighter">
              {esAdminAutorizado ? "Panel de Control Administrativo" : "Mi Panel de Estudiante"}
            </h1>
            <p className="text-gray-500">Bienvenido, {perfilUsuario?.nombre_completo}</p>
          </div>
        );
      
      default:
        return <div className="p-8 font-bold text-gray-400">MÓDULO EN DESARROLLO</div>;
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-black text-green-600 uppercase tracking-widest text-[11px] animate-pulse">Iniciando Sistema...</p>
      </div>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      {session ? (
        <AppLayout 
          session={session} 
          userProfile={perfilUsuario} 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          onLogout={() => supabase.auth.signOut()}
        >
          <div className="animate-in fade-in duration-500">
            {renderView()}
          </div>
        </AppLayout>
      ) : (
        <LoginPage onLoginSuccess={setSession} />
      )}
    </>
  );
};

export default App;