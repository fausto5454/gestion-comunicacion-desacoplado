import { supabase } from '../config/supabaseClient';
import React, { useState } from 'react';
import { 
    LayoutDashboard, Users, Send, Inbox, FileText, BarChart, 
    ShieldCheck, X, GraduationCap, CalendarCheck, Bell, LogOut, 
    Loader2, ChevronDown, ChevronRight, MessageSquare, BookOpen, FolderTree 
} from 'lucide-react';
import { COLOR_IE_GREEN_LIGHT, COLOR_IE_GREEN } from '../styles/CustomStyles';

const Sidebar = ({ rol_id, userName, userEmail, setCurrentView, currentView, isSidebarOpen, setIsSidebarOpen }) => {
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    // Estado para controlar qué menús desplegables están abiertos
    const [openMenus, setOpenMenus] = useState({});

    const toggleMenu = (name) => {
        setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
    };
    const navItems = [
        { name: 'Panel Principal', view: 'dashboard', icon: LayoutDashboard, roles: [1, 2, 3, 4, 5, 6] },
        { name: 'Gestión de Usuarios', view: 'usuarios', icon: Users, roles: [1] },
        { 
            name: 'Comunicaciones', 
            icon: MessageSquare, 
            roles: [1, 2, 3, 4, 5, 6],
            children: [
                { name: 'Enviar Mensaje', view: 'enviar', icon: Send, roles: [1, 2, 3, 4, 5] },
                { name: 'Bandeja de Entrada', view: 'bandeja', icon: Inbox, roles: [1, 2, 3, 4, 5, 6] },
                { name: 'Comunicados', view: 'comunicados', icon: Bell, roles: [1, 6] },
            ]
        },
        { 
            name: 'Gestión Académica', 
            icon: BookOpen, 
            roles: [1, 2, 3, 5, 6],
            children: [
                { name: 'Calificaciones', view: 'calificaciones', icon: GraduationCap, roles: [1, 3, 5, 6] },
                { name: 'Asistencia', view: 'asistencia', icon: CalendarCheck, roles: [1, 3, 5, 6] },
                { name: 'IGA-Estadística', view: 'iga-estadistica', icon: BarChart, roles: [1, 2, 3, 5] },
            ]
        },
        { 
            name: 'Documentos y Reportes', 
            icon: FolderTree, 
            roles: [1, 2, 3, 4, 5],
            children: [
                { name: 'Documentos', view: 'documentos', icon: FileText, roles: [1, 2, 3, 4, 5] },
                { name: 'Reportes', view: 'reportes', icon: BarChart, roles: [1, 2] },
            ]
        },
        { 
            name: 'Seguridad', 
            icon: ShieldCheck, 
            roles: [1],
            children: [
                { name: 'Auditoría', view: 'auditoria', icon: ShieldCheck, roles: [1] },
            ]
        },
    ];

    const filterByRole = (items) => {
        return items.filter(item => {
            const hasRole = item.roles.includes(rol_id);
            if (item.children) {
                item.filteredChildren = item.children.filter(child => child.roles.includes(rol_id));
                return hasRole && item.filteredChildren.length > 0;
            }
            return hasRole;
        });
    };

    const filteredNavItems = filterByRole(navItems);
    return (
        <div className={`flex flex-col h-full bg-gray-900 text-white w-64 fixed md:relative z-40 shadow-2xl transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            {/* Header */}
            <div className="p-5 flex items-center justify-between border-b border-gray-800">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black tracking-tight" style={{ color: COLOR_IE_GREEN }}>I.E. N.° 2079</h2>
                    <span className="text-[11px] text-gray-400 font-bold tracking-widest uppercase">Sistema de Gestión</span>
                </div>
                <button className="md:hidden text-gray-400" onClick={() => setIsSidebarOpen(false)}>
                    <X className="w-6 h-6" />
                </button>
            </div>
            {/* Navegación */}
            <nav className="flex-grow p-4 space-y-1 overflow-y-auto custom-scrollbar">
                {filteredNavItems.map((item) => {
                    const hasChildren = !!item.children;
                    const isOpen = openMenus[item.name];
                    const isActive = currentView === item.view || (hasChildren && item.filteredChildren.some(c => c.view === currentView));
                    return (
                        <div key={item.name} className="space-y-1">
                            <button
                                onClick={() => {
                                    if (hasChildren) {
                                        toggleMenu(item.name);
                                    } else {
                                        setCurrentView(item.view);
                                        if (window.innerWidth < 768) setIsSidebarOpen(false);
                                    }
                                }}
                                className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200 group
                                    ${isActive && !hasChildren ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                                >
                                <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-white' : 'group-hover:text-white'}`} />
                                <span className="text-sm font-semibold flex-grow text-left">{item.name}</span>
                                {hasChildren && (
                                    isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                )}
                            </button>

                            {/* Submenús */}
                            {hasChildren && isOpen && (
                                <div className="ml-9 space-y-1 border-l border-gray-800 pl-2 transition-all duration-300">
                                    {item.filteredChildren.map((child) => (
                                        <button
                                            key={child.view}
                                            onClick={() => {
                                                setCurrentView(child.view);
                                                if (window.innerWidth < 768) setIsSidebarOpen(false);
                                            }}
                                            className={`flex items-center w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors
                                            ${currentView === child.view ? 'text-green-400 bg-gray-600' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800'}`}
                                            >
                                            <child.icon className="w-4 h-4 mr-2" />
                                            {child.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
            {/* Footer / Perfil */}
            <div className="p-4 border-t border-gray-800 bg-gray-700">
                <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-gray-800">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {rol_id === 1 ? "Administrador" : rol_id === 2 ? "Director" : rol_id === 3 ? "Docente" : rol_id === 6 ? "Estudiante" : "Personal"}
                        </span>
                        </div>
                      <div className="px-2 mb-4">
                    <p className="text-sm font-bold text-white truncate">{userName}</p>
                    <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
                   </div>
                 <button
                    onClick={async () => {
                        try {
                            setIsLoggingOut(true);
                             // Si ya tienes supabase importado, esto funcionará:
                            await supabase.auth.signOut(); 
                            localStorage.clear();
                            window.location.href = "/"; 
                            } catch (error) {
                            console.error("Error al salir:", error);
                            window.location.href = "/";
                             }
                            }}
                             disabled={isLoggingOut}
                              className={`w-full py-3 px-4 rounded-xl font-black text-[14px] tracking-[0.1em] 
                                transition-all duration-300 active:scale-95 mb-2 
                                 flex items-center justify-center gap-3
                                    ${isLoggingOut 
                                    ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                                    : 'bg-red-500 text-white hover:bg-red-600 shadow-md hover:shadow-red-200'}`}
                                    >
                                    {isLoggingOut ? (
                                   <>
                                  <Loader2 className="animate-spin" size={16} />
                                 <span className="">Cerrando...</span>
                                 </>
                                ) : (
                             <>
                            <LogOut size={16} />
                        <span className="">Cerrar Sesión</span>
                     </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;