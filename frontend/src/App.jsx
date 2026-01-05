import React, { useState, useEffect } from 'react';
import { supabase } from './config/supabaseClient';
import { Toaster } from 'react-hot-toast';
import AppLayout from './components/AppLayout'; // Mueve el layout aquí
import LoginPage from './pages/LoginPage'; // Mueve el login aquí

const App = () => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('dashboard');
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session || null);
            setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession || null);
            if (newSession) setCurrentView('dashboard');
        });

        return () => listener?.subscription.unsubscribe();
    }, []);

    if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;

    return (
        <>
            <Toaster position="top-right" />
            {session ? (
                <AppLayout 
                    session={session} 
                    currentView={currentView} 
                    setCurrentView={setCurrentView} 
                    onLogout={() => supabase.auth.signOut()}
                />
            ) : (
                <LoginPage onLoginSuccess={setSession} />
            )}
        </>
    );
};

export default App;