import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabaseClient';
import { Toaster, toast } from 'react-hot-toast';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';

// Importamos los módulos
import ComunicacionesPage from './pages/ComunicacionesPage'; 
import ComunicacionesEstudiante from './pages/ComunicacionesEstudiante'; 
import ReportesPage from './pages/ReportesPage'; 
// Reemplazamos el uso de CalificacionesPage por RegistroCompetencias para el flujo profesional
import RegistroCompetencias from './pages/RegistroCompetencias';

const App = () => {
  const [session, setSession] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  
  // ✅ ESTADO CRÍTICO: Mantiene la información del curso seleccionado
  const [cursoActivo, setCursoActivo] = useState({ nombre: 'MATEMÁTICA', grado: '1° A' });

  // --- MEJORA: FUNCIÓN DE CIERRE DE SESIÓN PROFESIONAL ---
 const handleLogout = async () => {
  try {
    // 1. Limpieza INMEDIATA de estados (UI se vuelve blanca/login rápido)
    setSession(null);
    setPerfilUsuario(null);
    setCurrentView('dashboard');

    // 2. Limpieza de almacenamiento local
    localStorage.clear();
    sessionStorage.clear();

    // 3. Ejecutamos la salida de Supabase (sin await si queremos velocidad extrema, 
    // o con un catch para que no detenga el flujo)
    supabase.auth.signOut().catch(console.error);

    // 4. Redirección forzada
    // Usamos .replace para que no puedan volver atrás con el botón del navegador
    window.location.replace('/'); 
    
  } catch (err) {
    console.error("Error crítico en logout:", err);
    // Si todo falla, forzamos el reset
    window.location.href = '/';
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
    console.log("DEBUG - Renderizando vista:", currentView, "Curso:", cursoActivo.nombre);

    if (session && !perfilUsuario) {
        return (
            <div className="p-20 text-center flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold text-gray-500">Validando permisos...</p>
            </div>
        );
    }

    // ✅ INTEGRACIÓN: Ahora 'calificaciones' carga el registro por competencias avanzado
    if (currentView === 'calificaciones') {
        return (
            <RegistroCompetencias 
                key={`${cursoActivo.nombre}-${cursoActivo.grado}`} // FORZA EL REFRESCO VISUAL AL CAMBIAR DE ÁREA
                session={session} 
                areaNombre={cursoActivo.nombre}
                gradoSeccion={cursoActivo.grado}
            />
        );
    }

    if (currentView === 'reportes') {
        return <ReportesPage />;
    }

    if (currentView === 'bandeja') {
        return perfilUsuario?.rol_id === 6 
            ? <ComunicacionesEstudiante session={session} /> 
            : <ComunicacionesPage session={session} userProfile={perfilUsuario} />;
    }

    if (currentView === 'dashboard') {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-black uppercase tracking-tighter">
                    {perfilUsuario?.rol_id === 1 ? "Panel de Control Administrativo" : "Mi Panel de Estudiante"}
                </h1>
                <p className="text-gray-500">Bienvenido, {perfilUsuario?.nombre_completo}</p>
            </div>
        );
    }

    return (
        <div className="p-10 border-4 border-dashed rounded-[3rem] text-center text-gray-400">
            <p className="font-black uppercase tracking-widest text-xs">Módulo en construcción o no encontrado</p>
            <p className="text-[10px] mt-2">ID Vista: {currentView}</p>
        </div>
    );
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
          onLogout={handleLogout}
          // ✅ Estas dos líneas permiten que el Layout y el Sidebar actualicen la vista
          onCursoSelect={(datos) => setCursoActivo(datos)} 
          cursoActivo={cursoActivo} 
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