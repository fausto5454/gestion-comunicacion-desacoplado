import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './config/supabaseClient';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';

// Módulos
import ComunicacionesPage from './pages/ComunicacionesPage'; 
import ComunicacionesEstudiante from './pages/ComunicacionesEstudiante'; 
import ReportesPage from './pages/ReportesPage'; 
import RegistroCompetencias from './pages/RegistroCompetencias';
import IGAEstadistica from './pages/IGAEstadistica';
import AuditoriaPage from './pages/AuditoriaPage';

const App = () => {
  const [session, setSession] = useState(null);
  const [perfilUsuario, setPerfilUsuario] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [cursoActivo, setCursoActivo] = useState({ nombre: 'MATEMÁTICA', grado: '1° A' });
    

  // 1. Carga de Sesión y Perfil Sincronizada con la DB
  const isInitialized = useRef(false);

  useEffect(() => {
    // 🛡️ CERROJO: Evita que el código se ejecute dos veces y cause bucles
    if (isInitialized.current) return;
    isInitialized.current = true;

    const inicializarApp = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);

        if (initialSession?.user) {
          // 🔍 BUSQUEDA POR CORREO: Evita el error 400 de IDs incompatibles
          const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, rol_id, nombre_completo, correo_electronico')
            .eq('correo_electronico', initialSession.user.email)
            .maybeSingle();

          if (error) {
            console.error("❌ Error de Supabase:", error.message);
          } else if (data) {
            // ✅ NORMALIZACIÓN: Mapeamos id_usuario a 'id' para que la App no falle
            const perfilCompleto = { 
              ...data, 
              id: data.id_usuario,
              correo: data.correo_electronico 
            };
            setPerfilUsuario(perfilCompleto);
            console.log("✅ Sistema - Perfil Vinculado:", perfilCompleto.nombre_completo);
          }
        }
      } catch (err) {
        console.error("❌ Error crítico:", err);
      } finally {
        // 🔓 LIBERACIÓN: Quita la pantalla de "Cargando"
        setLoading(false);
      }
    };

    inicializarApp();

    // 📡 SUSCRIPCIÓN: Maneja entradas y salidas de usuario
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setPerfilUsuario(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
   }, []);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
      <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-slate-600 font-bold animate-pulse">CARGANDO SISTEMA 2026...</p>
    </div>
  );

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
          {currentView === 'iga-estadistica' ? (
            <IGAEstadistica />
          ) : currentView === 'calificaciones' ? (
            
            <RegistroCompetencias 
              perfilUsuario={perfilUsuario} // Pasa el rol_id 1 para activar 'puedeEditar'
              key={`${cursoActivo.nombre}-${cursoActivo.grado}`} 
              session={session} 
              areaNombre={cursoActivo.nombre}
              gradoSeccion={cursoActivo.grado}
            />
          ) : currentView === 'reportes' ? (
            <ReportesPage />
          ) : currentView === 'auditoria' ? ( // <--- NUEVA CONDICIÓN
              <AuditoriaPage />
          ) : currentView === 'bandeja' ? (
            perfilUsuario?.rol_id === 6 ? 
              <ComunicacionesEstudiante session={session} /> : 
              <ComunicacionesPage session={session} userProfile={perfilUsuario} />
          ) : (
            /* VISTA DASHBOARD PRINCIPAL */
            <div className="p-8 max-w-5xl mx-auto">
              <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate-100">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
                  {perfilUsuario?.rol_id === 1 ? "🛡️ Administración Central" : "📊 Mi Panel Escolar"}
                </h1>
                <p className="text-slate-500 mt-2 text-xl font-medium">
                  Bienvenido, <span className="text-green-600 font-bold">{perfilUsuario?.nombre_completo || 'Usuario'}</span>
                </p>
                <div className="mt-8 flex gap-3">
                  <div className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase">
                    ID ROL: {perfilUsuario?.rol_id || 'SIN ROL'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
};

export default App;