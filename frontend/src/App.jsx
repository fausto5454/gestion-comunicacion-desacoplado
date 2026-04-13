import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './config/supabaseClient';
import { toast, Toaster } from 'sonner';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';

// Módulos (Asegúrate de que las rutas sean correctas)
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
  const [isRecovery, setIsRecovery] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [cursoActivo, setCursoActivo] = useState({ nombre: 'MATEMÁTICA', grado: '1° A' });

  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    const hash = window.location.hash;
    if (hash.includes('error_code=otp_expired')) {
    toast.error("El enlace de recuperación ha expirado. Por favor, solicita uno nuevo.");
    window.location.hash = ''; // Limpiamos la URL
    }
    const inicializarApp = async () => {
  // 1. Verificación Crítica: Si hay un hash con token, NO cargamos el perfil aún
  const tieneToken = window.location.hash.includes('access_token') || 
                     window.location.hash.includes('type=recovery');

  if (tieneToken) {
    console.log("🛑 Deteniendo carga de perfil: Proceso de recuperación en curso");
    setLoading(false);
    return; // Salimos de la función para que no vincule al usuario al Dashboard
  }

  try {
    const { data: { session: initialSession } } = await supabase.auth.getSession();
    setSession(initialSession);

    if (initialSession?.user) {
      // Solo vinculamos el perfil si NO estamos recuperando clave
      const { data } = await supabase
        .from('usuarios')
        .select('id_usuario, rol_id, nombre_completo, correo_electronico')
        .eq('correo_electronico', initialSession.user.email)
        .maybeSingle();

      if (data) {
        setPerfilUsuario({ ...data, id: data.id_usuario, correo_electronico: data.correo_electronico });
      }
    }
    } catch (err) {
      console.error("Error:", err);
    } finally {
    setLoading(false);
   }
  };

    inicializarApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      } else if (event === 'SIGNED_IN') {
        setSession(session);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setPerfilUsuario(null);
        setIsRecovery(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- RENDERIZADO POR PRIORIDAD ---
  const esCambioObligatorio = localStorage.getItem('require_password_change') === 'true';
  const isRecoveryURL = window.location.hash.includes('type=recovery') || window.location.pathname === '/recovery';

  // PRIORIDAD MÁXIMA
  if (isRecoveryURL || esCambioObligatorio) {
    return (
       <UpdatePasswordPage 
       onComplete={async () => {
          localStorage.removeItem('require_password_change');
          await supabase.auth.signOut(); // Forzamos nueva sesión con clave nueva
          window.location.href = '/';
        }} 
      />
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-medium">
        Cargando SIGESCOM 2026...
      </div>
    );
  }

  if (!session) {
    return <LoginPage onLoginSuccess={setSession} />;
  }

  return (
    <>
      <Toaster position="top-right" richColors />
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
              perfilUsuario={perfilUsuario} 
              key={`${cursoActivo.nombre}-${cursoActivo.grado}`} 
              session={session} 
              areaNombre={cursoActivo.nombre}
              gradoSeccion={cursoActivo.grado}
            />
          ) : currentView === 'reportes' ? (
            <ReportesPage />
          ) : currentView === 'auditoria' ? (
            <AuditoriaPage />
          ) : currentView === 'bandeja' ? (
            perfilUsuario?.rol_id === 6 ? 
              <ComunicacionesEstudiante session={session} /> : 
              <ComunicacionesPage session={session} userProfile={perfilUsuario} />
          ) : (
            <div className="p-8 max-w-5xl mx-auto">
              <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate-100">
                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
                  {perfilUsuario?.rol_id === 1 ? "🛡️ Administración" : "📊 Mi Panel"}
                </h1>
                <p className="text-slate-500 mt-2 text-xl font-medium">
                  Bienvenido, <span className="text-green-600 font-bold">{perfilUsuario?.nombre_completo || 'Usuario'}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </>
  );
};

export default App;