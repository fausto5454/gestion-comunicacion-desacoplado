import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import { Menu, Bell } from 'lucide-react';

import DashboardPage from '../pages/DashboardPage';
import UsuariosPage from '../pages/UsuariosPage';
import ComunicacionesPage from '../pages/ComunicacionesPage';
import DocumentosPage from '../pages/DocumentosPage';
import ReportesPage from '../pages/ReportesPage';
import AuditoriaPage from '../pages/AuditoriaPage';
import RegistroCompetencias from '../pages/RegistroCompetencias';
import IGAEstadistica from '../pages/IGAEstadistica'; 

// ✅ 1. IMPORTACIONES FALTANTES PARA ASISTENCIA
import AsistenciaAlumnos from './AsistenciaAlumnos';
import PanelAsistencia from './PanelAsistencia';
import ConsolidadoAsistencia from './ConsolidadoAsistencia';
import ImportarMatricula from './ImportarMatricula';
import Sidebar from './Sidebar';

const AppLayout = ({ session, onLogout, currentView, setCurrentView, onCursoSelect, cursoActivo }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [usuarioID, setUsuarioID] = useState(null);
    const [rolID, setRolID] = useState(null);
    const [userGrado, setUserGrado] = useState(null);
    const [userSeccion, setUserSeccion] = useState(null);
    const [perfilUsuario, setPerfilUsuario] = useState(null);
    
    const user = session?.user;
    const userEmail = user?.email || 'N/A';
    const userName = user?.user_metadata?.nombre_completo || user?.email || 'Usuario';

    const fetchUserData = useCallback(async () => {
    // 1. Guardia de seguridad: No ejecutar si no hay email o la sesión es nula
    if (!userEmail || userEmail === 'N/A' || userEmail === null) return;

    try {
        // --- VÍA A: Datos básicos en 'usuarios' ---
        // Simplificamos el SELECT para evitar el Error 406 (Not Acceptable)
        let { data: baseData, error: errorBase } = await supabase
            .from("usuarios")
            .select("id_usuario, rol_id, nombre_completo, correo_electronico")
            .eq("correo_electronico", userEmail)
            .maybeSingle();

        let finalProfile = null;

        if (baseData) {
            finalProfile = { ...baseData, asignaciones: [] };

            // --- CASO DOCENTE/ADMIN (Roles 1, 2, 3) ---
            if (baseData.rol_id !== 6) {
                const { data: asig } = await supabase
                    .from("docente_asignaciones")
                    .select("grado, seccion, area")
                    .eq("id_usuario", baseData.id_usuario);
                
                finalProfile.asignaciones = asig || [];
                // Para docentes, el grado/seccion principal suele ser el primero de su lista
                finalProfile.grado = asig?.[0]?.grado || null;
                finalProfile.seccion = asig?.[0]?.seccion || null;
            } 
            // --- CASO ESTUDIANTE (Rol 6) ---
            else {
                const { data: mat } = await supabase
                    .from("matriculas")
                    .select("grado, seccion, dni_estudiante")
                    .eq("id_usuario", baseData.id_usuario) // O usa correo si el ID es NULL
                    .maybeSingle();

                if (mat) {
                    finalProfile.grado = mat.grado;
                    finalProfile.seccion = mat.seccion;
                    finalProfile.dni = mat.dni_estudiante;
                }
            }
        } 
        // --- VÍA B: Si no existe en 'usuarios', buscar por DNI (Fallback Estudiantes) ---
        else {
            const dniEstudiante = userEmail.split('@')[0]; 
            const { data: matricula } = await supabase
                .from("matriculas")
                .select("id_matricula, nombres, apellido_paterno, apellido_materno, grado, seccion")
                .eq("dni_estudiante", dniEstudiante)
                .maybeSingle();

            if (matricula) {
                finalProfile = {
                    id_usuario: matricula.id_matricula,
                    rol_id: 6, 
                    nombre_completo: `${matricula.apellido_paterno} ${matricula.apellido_materno}, ${matricula.nombres}`.toUpperCase(),
                    grado: matricula.grado,
                    seccion: matricula.seccion,
                    asignaciones: []
                };
            }
        }

        // --- ACTUALIZACIÓN DE ESTADOS ---
        if (finalProfile) {
            setPerfilUsuario(finalProfile); 
            setRolID(finalProfile.rol_id);
            setUsuarioID(finalProfile.id_usuario);
            setUserGrado(finalProfile.grado);
            setUserSeccion(finalProfile.seccion);
            
            console.log("✅ Acceso híbrido y quirúrgico completado para:", finalProfile.nombre_completo);
        }

    } catch (err) {
        console.error("❌ Error en la operación quirúrgica de acceso:", err.message);
    }
    }, [userEmail]);

    useEffect(() => {
       fetchUserData();
    }, [fetchUserData]);;

  const fetchUnreadMessages = useCallback(async () => {
    const currentUserId = session?.user?.id;
    if (!currentUserId) return;

    // Contamos solo mensajes "no leídos" destinados al usuario o globales
    const { count, error } = await supabase
        .from('comunicaciones')
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'no leído')
        .or(`usuario_destino_id.eq.${currentUserId},es_global.eq.true`)
        // CRÍTICO: No contar lo que el propio usuario envió para no auto-notificarse
        .neq('remitente_id', currentUserId);

      if (!error) {
        setUnreadCount(count || 0);
    }
    }, [session, session?.user?.id]);

    // Suscripción Realtime para que el número baje solo al marcar como leído
    useEffect(() => {
    fetchUnreadMessages();

    const channel = supabase
        .channel('db-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'comunicaciones' }, 
            () => fetchUnreadMessages()
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }, [fetchUnreadMessages]);

    // ✅ 2. ACTUALIZACIÓN DEL MAPEO DE VISTAS
    const viewComponents = {
        dashboard: DashboardPage,
        usuarios: UsuariosPage,
        comunicaciones: ComunicacionesPage,
        documentos: DocumentosPage,
        reportes: ReportesPage,
        auditoria: AuditoriaPage,
        enviar: ComunicacionesPage,
        bandeja: ComunicacionesPage,
        calificaciones: RegistroCompetencias,
        'iga-estadistica': IGAEstadistica,
        // Agregamos asistencia (usaremos una función para decidir qué mostrar)
        asistencia: cursoActivo ? AsistenciaAlumnos : PanelAsistencia,
        consolidado: ConsolidadoAsistencia,
        matricula: ImportarMatricula,
    };

    const renderContent = () => {
        // Obtenemos el componente según la vista actual
        const CurrentComponent = viewComponents[currentView] || DashboardPage;
        
        // Props estandarizadas para todos los componentes
        const props = { 
            session, 
            userEmail, 
            userName, 
            usuarioID, 
            rolID, 
            setCurrentView, 
            fetchUnreadMessages,
            // Props específicas para Registro y Asistencia
            areaNombre: cursoActivo?.nombre || '', 
            grado: cursoActivo?.grado || '',
            seccion: cursoActivo?.seccion || 'A',
            gradoSeccion: cursoActivo?.grado || ''
        }; 
        
        return <CurrentComponent {...props} />;
    };

   return (
    <div className="flex h-screen bg-[#f1f5f9] text-slate-900 overflow-hidden font-sans">
        
        {/* Sidebar Desktop */}
        <div className="hidden md:block">
            <Sidebar 
                rol_id={rolID} 
                userName={userName} 
                userEmail={userEmail} 
                onLogout={onLogout} 
                currentView={currentView} 
                setCurrentView={setCurrentView}
                onCursoSelect={onCursoSelect} 
            />
        </div>

        {/* Sidebar Mobile */}
        {isSidebarOpen && (
            <div className="fixed inset-0 z-[60] md:hidden">
                <div className="absolute inset-0 bg-gray-500/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                <div className="relative w-72 h-full">
                    <Sidebar 
                        rol_id={rolID} userName={userName} userEmail={userEmail} 
                        onLogout={onLogout} currentView={currentView} setCurrentView={setCurrentView}
                        isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
                        onCursoSelect={onCursoSelect}
                    />
                </div>
            </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header */}
            <header className="h-20 flex items-center justify-between bg-green-600 px-4 md:px-8 sticky top-0 z-40 shadow-sm text-white">
                <div className="flex items-center gap-4">
                    <button className="md:hidden p-2 rounded-lg hover:bg-green-700" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="w-7 h-7" />
                    </button>
                    <h1 className="hidden md:block text-xl font-black tracking-tighter uppercase">
                        {currentView.replace('-', ' ')}
                    </h1>
                </div>

                <div className="flex items-center gap-1">
                    <div className="flex items-center gap-2 pr-3 border-r border-white/20">
                        <div className="flex flex-col items-end leading-none hidden sm:flex">
                            <span className="text-xs font-bold">{userName.split(' ')[0]}</span>
                            <span className="text-[10px] font-medium text-green-100 uppercase">En línea</span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center font-black text-green-600 border-2 border-green-400">
                            {userName?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                   <div className="relative p-2 cursor-pointer transition-transform hover:scale-110" onClick={() => setCurrentView('bandeja')}>
                        <Bell className="w-7 h-7 fill-yellow-400 text-yellow-400 drop-shadow-md" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-green-600 shadow-lg z-50 animate-bounce">
                                {unreadCount}
                            </span>
                          )}
                     </div>
                   </div>
                 </header>
                 {/* Main Content con Integración de Perfil */}
                <main className="flex-1 overflow-y-auto bg-slate-50">
               {currentView === 'asistencia' ? (
              <AsistenciaAlumnos 
              perfilUsuario={perfilUsuario} // Inyectamos las asignaciones detectadas
             session={session} 
            cursoActivo={cursoActivo} 
          />
          ) : currentView === 'calificaciones' ? (
           <RegistroCompetencias 
             perfilUsuario={perfilUsuario} 
               session={session} 
                 areaNombre={cursoActivo?.area} 
                   gradoSeccion={cursoActivo?.grado} 
                    />
                   ) : (
                  renderContent()
                 )}
             </main>
         </div>
      </div>
   );
};

export default AppLayout;