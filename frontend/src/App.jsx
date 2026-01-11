import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';

// Importamos los módulos
import ComunicacionesPage from './pages/ComunicacionesPage'; 
import ComunicacionesEstudiante from './pages/ComunicacionesEstudiante'; 
import ReportesPage from './pages/ReportesPage'; 

const App = () => {
  const [session, setSession] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  // --- MEJORA: FUNCIÓN DE CIERRE DE SESIÓN PROFESIONAL ---
  const handleLogout = async () => {
    try {
      // 1. Cerramos sesión en Supabase
      await supabase.auth.signOut();
      
      // 2. Limpieza total de rastros en el navegador
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Reset de estados locales
      setSession(null);
      setPerfilUsuario(null);
      setCurrentView('dashboard');

      // 4. Redirección forzada para limpiar el historial y evitar "Atrás"
      window.location.replace('/'); 
      
    } catch (err) {
      toast.error("Error al cerrar sesión");
      console.error(err);
    }
  };

  const cargarPerfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('rol_id, nombre_completo')
        .eq('id_usuario', userId)
        .single();

      if (data) {
        setPerfilUsuario(data);
      }
    } catch (err) {
      console.error("Error al cargar perfil:", err);
    } finally {
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
      case 'reportes': 
        return <ReportesPage />;

      case 'bandeja': // Vinculado al nombre de vista que definimos en el Sidebar
        if (perfilUsuario?.rol_id === 6) {
          return <ComunicacionesEstudiante session={session} />;
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
        return <div className="p-8 font-bold text-gray-400 uppercase tracking-widest">Módulo en Desarrollo: {currentView}</div>;
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
          onLogout={handleLogout} // ✅ Usamos la nueva función robusta
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