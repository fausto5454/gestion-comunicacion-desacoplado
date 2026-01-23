// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

const ProtectedRoute = ({ allowedRoles }) => {
    const { user, loading, userData } = useAuth(); // Asumiendo que userData trae el rol

    if (loading) {
        return <div className="text-center p-8 text-xl font-semibold">Cargando sesión...</div>; 
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Si definimos roles permitidos y el usuario no tiene ese rol, redirigir
    if (allowedRoles && !allowedRoles.includes(userData?.rol?.toString())) {
        return <Navigate to="/RegistroCompetencias" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;