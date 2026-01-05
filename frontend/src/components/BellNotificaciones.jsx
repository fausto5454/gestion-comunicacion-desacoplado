import React from 'react';
import { Bell } from 'lucide-react';

const BellNotificaciones = () => {
  return (
    <div className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full cursor-pointer">
      <Bell className="w-6 h-6" />
      <span className="absolute top-1 right-1 flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
      </span>
    </div>
  );
};

export default BellNotificaciones;