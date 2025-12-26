// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

const ProtectedRoute = () => {
    const { user, loading } = useAuth();
    
    if (loading) {
        // Muestra un indicador de carga mientras verifica la sesión
        return <div className="text-center p-8 text-xl font-semibold">Cargando sesión...</div>; 
    }

    // Si no está autenticado, redirige al login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Si está autenticado, permite el acceso al componente hijo
    return <Outlet />;
};

export default ProtectedRoute;