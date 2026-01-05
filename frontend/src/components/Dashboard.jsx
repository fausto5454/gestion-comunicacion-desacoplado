// src/pages/DashboardPage.jsx
import React from 'react';

const DashboardPage = ({ session, userEmail, userName, usuarioID, rolID, setCurrentView, fetchUnreadMessages }) => {
    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Bienvenido, {userName}!</h2>
            <p>Tu ID de usuario es: {usuarioID}</p>
            <p>Tu rol es: {rolID}</p>
            {/* Aquí iría el contenido real de tu Dashboard */}
        </div>
    );
};

export default DashboardPage;