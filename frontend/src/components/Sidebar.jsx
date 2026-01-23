// src/components/Sidebar.jsx
import React from 'react';
import { 
    LayoutDashboard, Users, Send, Inbox, FileText, BarChart, 
    ShieldCheck, X, GraduationCap, CalendarCheck, Bell, LogOut, Loader2 
} from 'lucide-react';
import { COLOR_IE_GREEN_LIGHT, COLOR_IE_GREEN } from '../styles/CustomStyles';

const Sidebar = ({ rol_id, userName, userEmail, onLogout, currentView, setCurrentView, isSidebarOpen, setIsSidebarOpen }) => {
    
    const navItems = [
        { name: 'Panel Principal', view: 'dashboard', icon: LayoutDashboard, roles: [1, 2, 3, 4, 5, 6] },
        { name: 'Gestión de Usuarios', view: 'usuarios', icon: Users, roles: [1] },
        { name: 'Enviar Mensaje', view: 'enviar', icon: Send, roles: [1, 2, 3, 4, 5] },
        { name: 'Bandeja de Entrada', view: 'bandeja', icon: Inbox, roles: [1, 2, 3, 4, 5, 6] },
        { name: 'Mis Calificaciones', view: 'calificaciones', icon: GraduationCap, roles: [1, 3, 5, 6] },
        // Item Integrado Correctamente
        { name: 'IGA-Estadistica', view: 'iga-estadistica', icon: BarChart, roles: [1, 2, 3, 5] },
        { name: 'Mi Asistencia', view: 'asistencia_estudiante', icon: CalendarCheck, roles: [1, 3, 5, 6] },
        { name: 'Comunicados', view: 'comunicados_estudiante', icon: Bell, roles: [1, 6] },
        { name: 'Documentos', view: 'documentos', icon: FileText, roles: [1, 2, 3, 4, 5] },
        { name: 'Reportes', view: 'reportes', icon: BarChart, roles: [1, 2] },
        { name: 'Auditoría de Sistema', view: 'auditoria', icon: ShieldCheck, roles: [1] },
    ];

    const [isLoggingOut, setIsLoggingOut] = React.useState(false);
    
    const filteredNavItems = navItems.filter(item => item.roles.includes(rol_id));

    return (
        <div className={`flex flex-col h-full bg-gray-800 text-white w-64 fixed md:relative z-40 shadow-2xl transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <div className="p-5 flex items-center justify-between border-b border-gray-400">
                <div className="flex flex-col">
                    <h2 className="text-xl font-black tracking-tight" style={{ color: COLOR_IE_GREEN }}>I.E. N.° 2079</h2>
                    <span className="text-[13px] text-gray-300 font-bold tracking-widest">Gestión-comunicaciones</span>
                </div>
                <button className="md:hidden text-gray-400" onClick={() => setIsSidebarOpen(false)}>
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            <nav className="flex-grow p-4 space-y-1.5 overflow-y-auto">
                {filteredNavItems.map((item) => (
                    <button
                        key={item.view}
                        onClick={() => {
                            // Cambiamos la vista inmediatamente
                            setCurrentView(item.view);
                            // Si estamos en móvil, cerramos el sidebar tras elegir
                            if (window.innerWidth < 768) setIsSidebarOpen(false);
                        }}
                        className={`flex items-center w-full px-4 py-3 rounded-xl transition-all duration-300 group
                            ${currentView === item.view 
                                ? 'bg-green-600 text-white shadow-lg shadow-green-900/40' 
                                : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'}`}
                    >
                        <item.icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${currentView === item.view ? 'scale-110' : 'group-hover:scale-110'}`} />
                        <span className="text-sm font-semibold tracking-wide">{item.name}</span>
                        
                        {/* Indicador visual de selección para IGA */}
                        {currentView === item.view && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>
                        )}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-700/50 bg-gray-700 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-4 p-2 rounded-lg bg-gray-800/50 border border-gray-700/30">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest truncate">
                        {rol_id === 1 && "Administrador"}
                        {rol_id === 2 && "Director"}
                        {rol_id === 3 && "Docente"}
                        {rol_id === 4 && "Administrativo"}
                        {rol_id === 5 && "Auxiliar"}
                        {rol_id === 6 && "Estudiante"}
                    </span>
                </div>
                
                <div className="px-2 mb-4">
                    <p className="text-sm font-bold text-white truncate leading-tight">{userName}</p>
                    <p className="text-[11px] text-gray-500 truncate mt-1 font-medium">{userEmail}</p>
                </div>

                <button
                    onClick={async () => {
                        setIsLoggingOut(true);
                        await onLogout();
                    }}
                    disabled={isLoggingOut}
                    className={`w-full py-3 rounded-xl font-black text-[14px] tracking-[0.2em] 
                        transition-all duration-300 active:scale-95 mb-2 flex items-center justify-center gap-2
                        ${isLoggingOut 
                        ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                        : 'bg-red-500 text-white hover:bg-red-400'}`}
                >
                    {isLoggingOut ? (
                        <Loader2 className="animate-spin" size={16} /> 
                    ) : (
                        <LogOut size={16} />
                    )}
                    {isLoggingOut ? "CERRANDO..." : "Cerrar Sesión"}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;