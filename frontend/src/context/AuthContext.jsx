import { useState, createContext, useEffect, useContext } from 'react';
import { supabase } from '../config/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // Nuevo estado para DNI y Rol
  const [loading, setLoading] = useState(true);

  // Función para obtener el perfil extendido desde la tabla 'usuarios'
  const fetchProfile = async (user) => {
  try {
    // 1. Intentamos buscar primero en 'usuarios' (Docentes/Admin)
    let { data, error } = await supabase
      .from('usuarios')
      .select('*, rol_id, dni') 
      .eq('id_usuario', user.id)
      .maybeSingle();
    
    // 2. Si no está en usuarios, buscamos en 'matriculas' (Estudiantes)
    if (error || !data) {
      const { data: studentData, error: studentError } = await supabase
        .from('matriculas')
        .select('*, dni_estudiante, grado, seccion') // Aquí está el DNI real del alumno
        .eq('id_auth', user.id) // Asegúrate que 'id_auth' sea el campo que vincula con Supabase Auth
        .maybeSingle();

      if (studentError) throw studentError;
      
      // Normalizamos el objeto para que el resto de la app no se confunda
      data = { 
        ...studentData, 
        rol_id: 'estudiante', 
        dni: studentData.dni_estudiante 
      };
    }
    
    setProfile(data);
  } catch (err) {
    console.error("Error recuperando perfil híbrido:", err.message);
    setProfile(null);
  }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    getInitialSession();
    return () => authListener.subscription.unsubscribe();
  }, []);

  const signIn = async (emailOrDni, password) => {
    // Si el usuario ingresa un DNI (solo números), podrías transformarlo a correo 
    // si tu lógica de Supabase así lo requiere, o usarlo directamente.
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: emailOrDni, 
      password 
    });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Exponemos 'profile' para que los componentes sepan el DNI y Rol del usuario
  const value = { user, profile, loading, signIn, signOut };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);