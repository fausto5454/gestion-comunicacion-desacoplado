// src/components/AppLayout.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabaseClient';
import toast from 'react-hot-toast'; 
import { Menu, Home, Users, MessageSquare, FileText, BarChart2, Shield, Bell } from 'lucide-react';

import DashboardPage from '../pages/DashboardPage';
import UsuariosPage from '../pages/UsuariosPage';
import ComunicacionesPage from '../pages/ComunicacionesPage';
import DocumentosPage from '../pages/DocumentosPage';
import ReportesPage from '../pages/ReportesPage';
import AuditoriaPage from '../pages/AuditoriaPage';
import BellNotificaciones from './BellNotificaciones';
import Sidebar from './Sidebar';

const AppLayout = ({ session, onLogout, currentView, setCurrentView }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [usuarioID, setUsuarioID] = useState(null);
    const [rolID, setRolID] = useState(null);
    const user = session?.user;
    const userEmail = user?.email || 'N/A';
    const userName = user?.user_metadata?.nombre_completo || user?.email || 'Usuario';

    // ... (Mantengo tus useEffects de Supabase intactos para no romper la lógica)
    useEffect(() => {
        const fetchUserData = async () => {
            if (!userEmail) return;
            try {
                const { data, error } = await supabase
                    .from("usuarios")
                    .select("id_usuario, rol_id")
                    .eq("correo_electronico", userEmail)
                    .single();
                if (error) throw error;
                setUsuarioID(data.id_usuario);
                setRolID(data.rol_id);
            } catch (err) {
                console.error("❌ Error:", err.message);
            }
        };
        fetchUserData();
    }, [userEmail]);

    const fetchUnreadMessages = useCallback(async () => {
        if (!usuarioID) return;
        try {
            const { data, error } = await supabase
                .from('comunicaciones')
                .select('id_comunicacion')
                .eq('destinatario_id', usuarioID)
                .eq('estado', 'no leído');
            if (error) throw error;
            setUnreadCount(data ? data.length : 0);
        } catch (err) {
            console.error('❌ Error:', err.message);
        }
    }, [usuarioID]);

    useEffect(() => {
        if (usuarioID) fetchUnreadMessages();
    }, [usuarioID, fetchUnreadMessages]);

    const viewComponents = {
        dashboard: DashboardPage,
        usuarios: UsuariosPage,
        comunicaciones: ComunicacionesPage,
        documentos: DocumentosPage,
        reportes: ReportesPage,
        auditoria: AuditoriaPage,
        enviar: ComunicacionesPage,
        bandeja: ComunicacionesPage,
    };

    const renderContent = () => {
        const CurrentComponent = viewComponents[currentView] || DashboardPage;
        const props = { session, userEmail, userName, usuarioID, rolID, setCurrentView, fetchUnreadMessages }; 
        return <CurrentComponent {...props} />;
    };

  return (
        <div className="flex h-screen bg-[#f1f5f9] text-slate-900 overflow-hidden">
            
            {/* Sidebar Desktop */}
            <div className="hidden md:block">
                <Sidebar 
                    rol_id={rolID} userName={userName} userEmail={userEmail} 
                    onLogout={onLogout} currentView={currentView} setCurrentView={setCurrentView}
                />
            </div>

            {/* Sidebar Mobile Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    <div className="absolute inset-0 bg-gray-700 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
                    <div className="relative w-72 h-full">
                        <Sidebar 
                            rol_id={rolID} userName={userName} userEmail={userEmail} 
                            onLogout={onLogout} currentView={currentView} setCurrentView={setCurrentView}
                            isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}
                        />
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* HEADER REDISEÑADO */}
                <header className="h-22 flex items-center justify-between bg-green-600 px-4 md:px-8 sticky top-0 z-40 shadow-sm">
                    
                    {/* IZQUIERDA: Botón Menú (Solo Móvil) + Dashboard (Solo Escritorio) */}
                    <div className="flex items-center gap-4">
                        <button 
                            className="md:hidden p-2 rounded-lg text-white hover:bg-green-600 transition-colors" 
                            onClick={() => setIsSidebarOpen(true)}
                        >
                            <Menu className="w-7 h-7" />
                        </button>
                        
                        {/* Texto Dashboard: Oculto en móviles (sm), visible en escritorio (md) */}
                        <h1 className="hidden md:block text-xl font-black text-white tracking-tighter">
                            Dashboard
                        </h1>
                    </div>

                    {/* LADO DERECHO DEL HEADER */}
                    <div className="flex items-center gap-1 md:gap-1">
    
                     {/* Perfil de Usuario */}
                          <div className="flex items-center gap-1 pr-1 border-r border-white/20">
                           <div className="flex flex-col items-end leading-none hidden sm:flex">
                             <span className="text-xs font-bold text-white">{userName.split(' ')[0]}</span>
                               <span className="text-[10px] font-medium text-green-100 uppercase">Online</span>
                                 </div>
                                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center font-black text-[#22c55e] border-2 border-green-400 shadow-sm">
                                      {userName?.charAt(0).toUpperCase()}
                                       </div>
                                            </div>

                                              {/* Campana Oro con Contador en Tiempo Real a la derecha */}
                                           <div 
                                         className="relative p-2 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                        onClick={() => setCurrentView('comunicaciones')}
                                        >
                                        <Bell 
                                      className="w-7 h-7 fill-[#FFD700] text-[#FFD700] drop-shadow-md" 
                                     />
        
                                   {/* Contador Rojo Sincronizado con Supabase */}
                                   {unreadCount > 0 && (
                                 <span className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-[#22c55e] shadow-lg animate-in zoom-in duration-300">
                                {unreadCount > 9 ? '9+' : unreadCount}
                               </span>
                               )}
                            </div>
                          </div>
                        </header>

                        <main className="flex-1 overflow-y-auto bg-transparent">
                          <div className="max-w-[1600px] mx-auto p-4 md:p-8">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AppLayout;