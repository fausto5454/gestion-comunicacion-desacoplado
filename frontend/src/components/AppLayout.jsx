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
    
    const user = session?.user;
    const userEmail = user?.email || 'N/A';
    const userName = user?.user_metadata?.nombre_completo || user?.email || 'Usuario';

    
   const fetchUserData = useCallback(async () => {
    if (!userEmail) return;
    try {
        // La consulta debe ser una sola cadena continua hasta el final
        const { data, error } = await supabase
            .from("usuarios")
            .select("id_usuario, rol_id, grado, seccion")
            .eq("correo_electronico", userEmail)
            .single();

        if (error) throw error;

        // Una vez que tenemos los datos, ejecutamos los estados
        if (data) {
            console.log("✅ Perfil Completo Cargado:", data);
            setUsuarioID(data.id_usuario);
            setRolID(data.rol_id);
            setUserGrado(data.grado);   // Ahora sí se "despierta"
            setUserSeccion(data.seccion); // Ahora sí se "despierta"
        }
    } catch (err) {
        console.error("❌ Error cargando perfil:", err.message);
    }
    }, [userEmail]);

    useEffect(() => {
       fetchUserData();
    }, [fetchUserData]);;


   const fetchUnreadMessages = useCallback(async () => {
    if (!usuarioID) return;

    try {
        // Consultamos mensajes no leídos: Directos OR Globales
        const { count, error } = await supabase
            .from('comunicaciones')
            .select('*', { count: 'exact', head: true })
            .or(`usuario_destino_id.eq.${usuarioID},es_global.eq.true`)
            .eq('estado', 'no leído');

        if (error) throw error;
        setUnreadCount(count || 0);
    } catch (error) {
        console.error("Error en conteo de campanita:", error.message);
        setUnreadCount(0);
    }
    }, [usuarioID]);

  useEffect(() => {
    if (!usuarioID) return;

    //EFECTO REAL-TIME
    fetchUnreadMessages();

    const channel = supabase
        .channel('cambios-notificaciones-global')
        .on(
            'postgres_changes',
            { 
                event: '*', 
                schema: 'public', 
                table: 'comunicaciones' 
            },
            (payload) => {
                // Notificación sonora solo si el nuevo mensaje es para este usuario
                if (payload.eventType === 'INSERT' && payload.new.usuario_destino_id === String(usuarioID)) {
                    const horaLima = new Date().toLocaleString('es-PE', {
                        timeZone: 'America/Lima',
                        hour: '2-digit', minute: '2-digit', hour12: true
                    });
                    console.log(`🔔 Notificación recibida ${horaLima}`);
                    new Audio('/notificacion.mp3').play().catch(() => {});
                }

                // Recargar el contador siempre (ante insert, update o delete)
                fetchUnreadMessages(); 
            }
        )
        .subscribe();

       return () => {
          supabase.removeChannel(channel);
      };
    }, [usuarioID, fetchUnreadMessages]);

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
            
            {/* Sidebar (Desktop y Mobile se mantienen igual) */}
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

            {/* ... (Resto del código del Sidebar Mobile y Header igual) ... */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div className="absolute inset-0 bg-gray-500 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
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
                <header className="h-20 flex items-center justify-between bg-green-600 px-4 md:px-8 sticky top-0 z-40 shadow-sm text-white">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden p-2 rounded-lg hover:bg-green-700" onClick={() => setIsSidebarOpen(true)}>
                            <Menu className="w-7 h-7" />
                        </button>
                        <h1 className="hidden md:block text-xl font-black tracking-tighter uppercase">
                            {currentView.replace('-', ' ')}
                        </h1>
                    </div>
                    {/* ... rest of header ... */}
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
                <main className="flex-1 overflow-y-auto bg-slate-50">
                    <div className="max-w-[1600px] mx-auto p-4 md:p-8 animate-in fade-in duration-500">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;