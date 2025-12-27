import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lock, Mail, LogIn, Menu, X, Home, Users, MessageSquare, LogOut, Edit2, Trash2, 
  AlertTriangle, Loader, UserPlus, FileText, BarChart2, Shield, Upload, Download 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Toaster, toast } from 'react-hot-toast';
import { motion } from "framer-motion";
import ModalConfirmacion from "./components/ModalConfirmacion";
import ReportesPage from "./pages/ReportesPage";
import {
  verificarMensajesNoLeidos,
  verificarMensajesAtrasados,
  verificarAltoVolumen
} from "./services/alertasService";
import BellNotificaciones from "./components/notificaciones/BellNotificaciones";

// ======================================================================
// 1. CONFIGURACIÓN DE SUPABASE (Integrado directamente)
// ======================================================================
const SUPABASE_URL = 'https://obbzgmvrykhlfcziqttj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYnpnbXZyeWtobGZjemlxdHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTEwMDUsImV4cCI6MjA3NzY4NzAwNX0.O-8TJ0BPn_3A-WIaOFNf4ekQxUrDkxItuWoz0pXl7rM';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ======================================================================
// CONFIGURACIÓN DE ESTILOS Y COLORES INSTITUCIONALES
// ======================================================================
const COLOR_IE_GREEN = '#4caf50';
const COLOR_IE_GREEN_DARK = '#388e3c';
const COLOR_SECONDARY_RED = '#ef5350';
const COLOR_IE_GREEN_LIGHT = '#d1e7c5';

const CustomStyles = () => (
    <style>
        {`
            :root {
                --ie-green: ${COLOR_IE_GREEN};
                --ie-green-dark: ${COLOR_IE_GREEN_DARK};
                --ie-green-light: ${COLOR_IE_GREEN_LIGHT};
                --secondary-red: ${COLOR_SECONDARY_RED};
            }

            .rounded-4xl { border-radius: 2rem; }
            .w-22 { width: 5.5rem; }
            .h-20 { height: 5rem; }
            
            .focus-ring-ie-green:focus { --tw-ring-color: var(--ie-green); }
            .focus-border-ie-green:focus { border-color: var(--ie-green); }

            html, body, #root, .app-container {
                height: 100%;
                margin: 0;
                padding: 0;
                font-family: 'Inter', sans-serif;
            }
        `}
    </style>
);

// ======================================================================
// LOGIN PAGE
// ======================================================================
const LoginPage = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            if (data?.session) onLoginSuccess(data.session);
        } catch (err) {
            console.error("Error de Supabase:", err);
            let errorMessage = 'Error al iniciar sesión. Verifique sus credenciales.';
            if (err?.message && err.message.includes('Invalid login credentials')) {
                errorMessage = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
            } else if (err?.message) {
                errorMessage = err.message;
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-100 to-gray-100 px-4 py-12 overflow-auto">
            <div className="bg-gradient-to-br from-green-300 to-green-300 p-8 md:p-6 shadow-3xl rounded-4xl w-full max-w-sm border border-green-400 transform hover:scale-[1.01] transition-transform duration-300">
                <div className="flex justify-center mb-8">
                    <img 
                        src="logo.png" 
                        alt="Logo Institucional" 
                        className="w-22 h-20 object-contain drop-shadow-md"
                        onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/88x80/d1e7c5/388e3c?text=Logo+IE"; }}
                    />
                </div>

                <h2 className="text-2xl font-extrabold text-center text-green-700 mb-6 tracking-wide">
                    Bienvenido
                </h2>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-md mb-6 text-sm font-medium flex items-center">
                        <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
                            Correo Electrónico
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Ingrese su correo"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="shadow-inner border border-gray-500 rounded-lg w-full py-2.5 px-4 text-gray-400 focus:ring-2 focus-ring-ie-green focus-border-ie-green-100 focus:outline-none transition-all duration-150"
                        />
                    </div>

                    <div className="mb-8">
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
                            Contraseña
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="********"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="shadow-inner border border-gray-500 rounded-lg w-full py-2.5 px-4 text-gray-400 focus:ring-2 focus-ring-ie-green focus-border-ie-green-100 focus:outline-none transition-all duration-150"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full flex items-center justify-center bg-red-600 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-2xl transition duration-200 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98] ${
                            loading ? 'opacity-70 cursor-not-allowed' : ''
                        }`}
                    >
                        {loading ? (
                            <>
                                <Loader className="w-5 h-5 mr-2 animate-spin" />
                                Validando credenciales...
                            </>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-green-800 mt-4">
                    © 2025 I.E.N° 2079-A.R. Todos los derechos reservados
                </p>
            </div>
        </div>
    );
};

// ======================================================================
// COMPONENTES DE VISTA (Dashboard, Usuarios, Placeholders)
// ======================================================================
const DashboardPage = ({ userEmail }) => (
    <div className="p-4 md:p-8">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-4" style={{ color: 'var(--ie-green)' }}>
            Dashboard de Administración
        </h1>
        <p className="text-gray-600 mb-6">Vista general del sistema de comunicación.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm">
                <p className="text-sm text-red-700 font-semibold">Tu Email</p>
                <p className="text-base font-bold text-red-900 break-words">{userEmail}</p>
            </div>
        </div>
    </div>
);

const UsuariosPage = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [roles, setRoles] = useState([]);

    // Modal / Form
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [form, setForm] = useState({
        id_usuario: null,
        nombre_completo: '',
        correo_electronico: '',
        contraseña: '',
        rol_id: '',
    });

    // Modal de confirmación de eliminación
    const [deleteModal, setDeleteModal] = useState({
        open: false,
        id_usuario: null,
        nombre_completo: '',
    });

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from('usuarios')
                .select(`
                    id_usuario,
                    correo_electronico,
                    nombre_completo,
                    rol_id,
                    roles (id_rol, nombre_rol)
                `)
                .order('nombre_completo', { ascending: true });

            if (dbError) throw dbError;
            setUsers(data || []);
        } catch (err) {
            setError(`Error al cargar datos: ${err.message || err}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchRoles = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('roles')
                .select('id_rol, nombre_rol')
                .order('nombre_rol', { ascending: true });
            if (error) throw error;
            setRoles(data || []);
        } catch (err) {
            console.error('Error al cargar roles:', err);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
        fetchRoles();
        verificarMensajesNoLeidos();
        verificarMensajesAtrasados();
        verificarAltoVolumen();
    }, [fetchUsers, fetchRoles, verificarMensajesNoLeidos,
        verificarMensajesAtrasados,
        verificarAltoVolumen]);

    const openCreateModal = () => {
        setIsEditMode(false);
        setForm({ id_usuario: null, nombre_completo: '', correo_electronico: '', contraseña: '', rol_id: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setIsEditMode(true);
        setForm({
            id_usuario: user.id_usuario,
            nombre_completo: user.nombre_completo,
            correo_electronico: user.correo_electronico,
            contraseña: '',
            rol_id: user.rol_id || '',
        });
        setIsModalOpen(true);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.nombre_completo || !form.correo_electronico || !form.contraseña || !form.rol_id) {
            alert('Complete todos los campos');
            return;
        }

        await registrarAuditoria('CREAR', `Se creó al usuario ${form.nombre_completo} (${form.correo_electronico})`);


        try {
            const { error: signError } = await supabase.auth.signUp({
                email: form.correo_electronico,
                password: form.contraseña,
            });
            if (signError) throw signError;

            const { error: insertError } = await supabase.from('usuarios').insert([
                {
                    nombre_completo: form.nombre_completo,
                    correo_electronico: form.correo_electronico,
                    rol_id: parseInt(form.rol_id, 10),
                },
            ]);
            if (insertError) throw insertError;

            setIsModalOpen(false);
            fetchUsers();
            alert('Usuario creado correctamente.');
        } catch (err) {
            alert('Error creando usuario: ' + (err.message || err));
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!form.nombre_completo || !form.correo_electronico || !form.rol_id) {
            alert('Complete todos los campos');
            return;
        }

        await registrarAuditoria('EDITAR', `Se actualizó al usuario ${form.nombre_completo} (${form.correo_electronico})`);


        try {
            const { error } = await supabase
                .from('usuarios')
                .update({
                    nombre_completo: form.nombre_completo,
                    correo_electronico: form.correo_electronico,
                    rol_id: parseInt(form.rol_id, 10),
                })
                .eq('id_usuario', form.id_usuario);

            if (error) throw error;

            setIsModalOpen(false);
            fetchUsers();
            alert('Usuario actualizado correctamente.');
        } catch (err) {
            alert('Error actualizando usuario: ' + (err.message || err));
        }
    };

    // Modal de confirmación antes de eliminar
    const openDeleteModal = (user) => {
        setDeleteModal({
            open: true,
            id_usuario: user.id_usuario,
            nombre_completo: user.nombre_completo,
        });
    };

    const confirmDelete = async () => {
        try {
            const { error } = await supabase
                .from('usuarios')
                .delete()
                .eq('id_usuario', deleteModal.id_usuario);

            if (error) throw error;
            setDeleteModal({ open: false, id_usuario: null, nombre_completo: '' });
            fetchUsers();
            await registrarAuditoria('ELIMINAR', `Se eliminó al usuario ${userToDelete?.nombre_completo}`);
        } catch (err) {
            alert('Error eliminando usuario: ' + (err.message || err));
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                    <Users className="w-7 h-7 mr-3" style={{ color: 'var(--ie-green)' }} />
                    Gestión de Usuarios (CRUD)
                </h1>
                <button
                    onClick={openCreateModal}
                    style={{ backgroundColor: 'var(--ie-green)' }}
                    className="flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg shadow-lg transition duration-200 hover:bg-green-700"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Crear Nuevo Usuario
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-10 text-gray-500 flex justify-center items-center">
                    <Loader className="w-6 h-6 animate-spin mr-3" style={{ color: 'var(--ie-green)' }} /> Cargando usuarios...
                </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-slate-500">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Nombre Completo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Correo Electrónico</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => (
                                <tr key={user.id_usuario} className="hover:bg-gray-50 transition duration-150">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.nombre_completo}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{user.correo_electronico}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" style={{ backgroundColor: 'var(--ie-green-light)', color: 'var(--ie-green-dark)' }}>
                                            {user.roles ? user.roles.nombre_rol : 'Sin Rol'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                                        <button onClick={() => openEditModal(user)} className="hover:text-green-700 p-1 rounded-full hover:bg-gray-200" style={{ color: 'var(--ie-green)' }}>
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => openDeleteModal(user)} className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-gray-200">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Confirmación de Eliminación */}
            {deleteModal.open && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center">
                        <AlertTriangle className="w-10 h-10 mx-auto text-red-500 mb-3" />
                        <h3 className="text-lg font-semibold mb-2">¿Eliminar usuario?</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Estás a punto de eliminar a <strong>{deleteModal.nombre_completo}</strong>. Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-center space-x-3">
                            <button
                                onClick={() => setDeleteModal({ open: false, id_usuario: null, nombre_completo: '' })}
                                className="px-4 py-2 rounded-lg border border-gray-300 text-white bg-green-700 hover:bg-green-400"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Crear / Editar (se mantiene igual que tu estructura) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
                        <h3 className="text-xl font-semibold mb-4">{isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h3>
                        <form onSubmit={isEditMode ? handleUpdate : handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                                <input type="text" value={form.nombre_completo} onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })} required className="mt-1 block w-full border rounded-lg p-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                                <input type="email" value={form.correo_electronico} onChange={(e) => setForm({ ...form, correo_electronico: e.target.value })} required className="mt-1 block w-full border rounded-lg p-2" />
                            </div>
                            {!isEditMode && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                                    <input type="password" value={form.contraseña} onChange={(e) => setForm({ ...form, contraseña: e.target.value })} required className="mt-1 block w-full border rounded-lg p-2" />
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Rol</label>
                                <select value={form.rol_id} onChange={(e) => setForm({ ...form, rol_id: e.target.value })} required className="mt-1 block w-full border rounded-lg p-2">
                                    <option value="">Seleccione un rol</option>
                                    {roles.map(r => <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>)}
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-white bg-orange-400 hover:bg-blue-400">Cancelar</button>
                                <button type="submit" style={{ backgroundColor: 'var(--ie-green)' }} className="px-4 py-2 rounded-lg text-white font-medium hover:bg-green-700">
                                    {isEditMode ? 'Guardar cambios' : 'Crear usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
// Función para registrar acciones en la tabla auditoría
const registrarAuditoria = async (accion, descripcion) => {
  try {
    const user = supabase.auth.getUser();
    const correo = (await user).data.user?.email || 'desconocido';
    await supabase.from('auditoria').insert([
      {
        usuario_responsable: correo,
        accion,
        descripcion,
        fecha_hora: new Date(),
      },
    ]);
  } catch (error) {
    console.error("Error registrando auditoría:", error);
  }
};

// Componentes Placeholder (sin cambios)
const PlaceholderPage = ({ title, icon: Icon }) => (
    <div className="p-4 md:p-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center mb-6">
            <Icon className="w-7 h-7 mr-3" style={{ color: 'var(--ie-green)' }} />
            {title}
        </h1>
        <div className="bg-white p-10 rounded-xl shadow-lg border border-dashed border-gray-300 text-center">
            <p className="text-xl font-semibold text-gray-600 mb-4">Módulo en Construcción</p>
            <p className="text-gray-500">Esta sección se implementará siguiendo el flujo de trabajo.</p>
        </div>
    </div>
);

// ======================================================================
// MÓDULO 2: ENVIAR MENSAJE (ComunicacionesPage con lectura y eliminación)
// ======================================================================
const ComunicacionesPage = ({ session }) => {
    const user = session?.user;
    const userId = user?.id;
    const [usuarios, setUsuarios] = useState([]);
    const [mensajesEnviados, setMensajesEnviados] = useState([]);
    const [mensajesRecibidos, setMensajesRecibidos] = useState([]);
    const [titulo, setTitulo] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [destinatario, setDestinatario] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [idMensajeAEliminar, setIdMensajeAEliminar] = useState(null);
    

    // === 1. Cargar usuarios disponibles ===
    useEffect(() => {
        const fetchUsuarios = async () => {
            const { data, error } = await supabase
                .from('usuarios')
                .select('id_usuario, nombre_completo, correo_electronico');
            if (!error) setUsuarios(data || []);
            else console.error('❌ Error cargando usuarios:', error.message);
        };
        fetchUsuarios();
    }, []);

    // === 2. Cargar mensajes enviados y recibidos ===
    const fetchMensajes = useCallback(async () => {
        if (!userId) return;

        try {
            const { data: enviados, error: errEnv } = await supabase
                .from('comunicaciones')
                .select('*')
                .eq('remitente_id', userId)
                .order('fecha_envio', { ascending: false });

            const { data: recibidos, error: errRec } = await supabase
                .from('comunicaciones')
                .select('*')
                .eq('destinatario_id', userId)
                .order('fecha_envio', { ascending: false });

            if (errEnv || errRec) throw errEnv || errRec;

            const usuariosMap = Object.fromEntries(
                usuarios.map(u => [u.id_usuario, u.nombre_completo])
            );

            const enviadosConNombres = (enviados || []).map(m => ({
                ...m,
                destinatario_nombre: usuariosMap[m.destinatario_id] || 'Desconocido'
            }));

            const recibidosConNombres = (recibidos || []).map(m => ({
                ...m,
                remitente_nombre: usuariosMap[m.remitente_id] || 'Desconocido'
            }));

            setMensajesEnviados(enviadosConNombres);
            setMensajesRecibidos(recibidosConNombres);
        } catch (error) {
            console.error('❌ Error cargando mensajes:', error.message);
        }
    }, [userId, usuarios]);

    useEffect(() => {
        if (usuarios.length > 0) fetchMensajes();
    }, [usuarios, fetchMensajes]);

    // === 3. Enviar mensaje ===
    const handleEnviarMensaje = async (e) => {
        e.preventDefault();
        if (!titulo || !mensaje || !destinatario)
            return toast.error('Por favor complete todos los campos.');

        setLoading(true);
        const { error } = await supabase.from('comunicaciones').insert([{
            titulo,
            mensaje,
            remitente_id: userId,
            destinatario_id: destinatario,
            estado: 'no leído'
        }]);

        setLoading(false);
        if (error) return toast.error('❌ Error al enviar mensaje.');
        setTitulo(''); setMensaje(''); setDestinatario('');
        fetchMensajes();
        toast.success('📩 Mensaje enviado correctamente.');
    };

    // === 4. Ver mensaje ===
    const handleVerMensaje = async (msg) => {
        setSelectedMessage(msg);
        if (msg.estado === 'no leído') {
            const { error } = await supabase
                .from('comunicaciones')
                .update({ estado: 'leído' })
                .eq('id_comunicacion', msg.id_comunicacion);
            if (!error) {
                toast.success('✅ Mensaje marcado como leído.');
                fetchMensajes();
            }
        }
    };

    // === 5. Eliminar mensaje ===
 const handleEliminarMensaje = (id) => {
    setIdMensajeAEliminar(id);
    setOpenDeleteModal(true);
 };

 const confirmarEliminarMensaje = async () => {
    if (!idMensajeAEliminar) return;

    const { error } = await supabase
        .from('comunicaciones')
        .delete()
        .eq('id_comunicacion', idMensajeAEliminar);

    if (error) {
        toast.error('❌ Error al eliminar mensaje.');
    } else {
        toast.success('🗑️ Mensaje eliminado correctamente.');
        fetchMensajes();
    }

    setOpenDeleteModal(false);
    setIdMensajeAEliminar(null);
    setSelectedMessage(null); // ✅ cierre seguro del modal de lectura
  };

    // === 6. Renderizado ===
    return (
        <div className="p-4 md:p-8">
            <Toaster position="top-right" />
            <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center">
                <MessageSquare className="w-7 h-7 mr-3" style={{ color: 'var(--ie-green)' }} />
                Enviar Mensaje
            </h1>

            {/* === Formulario de envío === */}
            <form onSubmit={handleEnviarMensaje} className="bg-white p-6 rounded-xl shadow-md mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Destinatario</label>
                        <select
                            className="border rounded-lg w-full p-2"
                            value={destinatario}
                            onChange={(e) => setDestinatario(e.target.value)}
                            required
                        >
                            <option value="">Seleccione destinatario</option>
                            {usuarios
                                .filter(u => u.id_usuario !== userId)
                                .map(u => (
                                    <option key={u.id_usuario} value={u.id_usuario}>
                                        {u.nombre_completo} ({u.correo_electronico})
                                    </option>
                                ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Título</label>
                        <input
                            type="text"
                            className="border rounded-lg w-full p-2"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="block text-sm font-semibold mb-2 text-gray-700">Mensaje</label>
                    <textarea
                        className="border rounded-lg w-full p-2"
                        rows="3"
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        required
                    />
                {/* === Modal de confirmación de eliminación === */}
                <ModalConfirmacion
                isOpen={openDeleteModal}
                onClose={() => {
                    setOpenDeleteModal(false);
                    setIdMensajeAEliminar(null);
                }}
                onConfirm={confirmarEliminarMensaje}
                titulo="Eliminar mensaje"
                mensaje="Esta acción eliminará permanentemente el mensaje seleccionado."
                requireText
                />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{ backgroundColor: 'var(--ie-green)' }}
                    className="mt-4 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                    {loading ? 'Enviando...' : 'Enviar Mensaje'}
                </button>
            </form>

            {/* === Mensajes enviados y recibidos === */}
            <div className="grid md:grid-cols-2 gap-8">
                {/* Enviados */}
                <div>
                    <h2 className="text-xl font-semibold mb-3 text-gray-700">Mensajes Enviados</h2>
                    <div className="bg-white p-4 rounded-lg shadow-md max-h-[400px] overflow-y-auto">
                        {mensajesEnviados.length === 0 ? (
                            <p className="text-gray-500">No hay mensajes enviados.</p>
                        ) : (
                            mensajesEnviados.map((msg) => (
                                <div key={msg.id_comunicacion} className="border-b py-3">
                                    <p className="font-semibold">{msg.titulo}</p>
                                    <p className="text-sm text-gray-600">Para: {msg.destinatario_nombre}</p>
                                    <p className="text-xs text-gray-400">{new Date(msg.fecha_envio).toLocaleString()}</p>
                                    <div className="flex justify-end space-x-2 mt-2">
                                        <button
                                            onClick={() => handleVerMensaje(msg)}
                                            className="text-blue-600 text-sm hover:underline"
                                        >
                                            Ver
                                        </button>
                                        <button
                                            onClick={() => handleEliminarMensaje(msg.id_comunicacion)}
                                            className="text-red-600 text-sm hover:underline"
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recibidos */}
                <div>
                    <h2 className="text-xl font-semibold mb-3 text-gray-700">Mensajes Recibidos</h2>
                    <div className="bg-white p-4 rounded-lg shadow-md max-h-[400px] overflow-y-auto">
                        {mensajesRecibidos.length === 0 ? (
                            <p className="text-gray-500">No hay mensajes recibidos.</p>
                            
                        ) : (
                            mensajesRecibidos.map((msg) => (
                                <div
                                    key={msg.id_comunicacion}
                                    className={`border-b py-3 transition ${msg.estado === 'no leído' ? 'bg-green-50' : ''}`}
                                >
                                    <p className="font-semibold">{msg.titulo}</p>
                                    <p className="text-sm text-gray-600">De: {msg.remitente_nombre}</p>
                                    <p className="text-xs text-gray-400">{new Date(msg.fecha_envio).toLocaleString()}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className={`text-xs font-medium ${msg.estado === 'leído'
                                            ? 'text-gray-500'
                                            : 'text-green-600 font-semibold'}`}>
                                            {msg.estado}
                                        </span>
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleVerMensaje(msg)}
                                                className="text-blue-600 text-sm hover:underline"
                                            >
                                                Ver
                                            </button>
                                            <button
                                                onClick={() => handleEliminarMensaje(msg.id_comunicacion)}
                                                className="text-red-600 text-sm hover:underline"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            {/* === Modal de mensaje === */}
            {selectedMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
                        <h3 className="text-xl font-semibold mb-3">{selectedMessage.titulo}</h3>
                        <p className="text-gray-700 mb-4">{selectedMessage.mensaje}</p>
                        <div className="flex justify-end">
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ======================================================================
// MÓDULO 3: COMPONENTE DOCUMENTOS (Gestión de Documentos con Supabase Storage)
// ======================================================================
const DocumentosPage = ({ session }) => {
  const user = session?.user;
  const userId = user?.id;

  const [documentos, setDocumentos] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [archivoPreview, setArchivoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Estados para el modal
  const [modalOpen, setModalOpen] = useState(false);
  const [docSeleccionado, setDocSeleccionado] = useState(null);

  // =========================================================
  // 📂 Cargar documentos
  // =========================================================
  const fetchDocumentos = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("documentos")
      .select("*")
      .order("fecha_subida", { ascending: false });

    if (error) {
      console.error("❌ Error al cargar documentos:", error.message);
      toast.error("Error al cargar documentos");
    } else {
      setDocumentos(data || []);
    }
  };

  useEffect(() => {
    fetchDocumentos();
  }, [userId]);

  // =========================================================
  // 📂 Manejar selección de archivo
  // =========================================================
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setArchivo(file);

    if (!file) return setArchivoPreview(null);

    if (file.type.startsWith("image/")) {
      setArchivoPreview(URL.createObjectURL(file));
    } else if (file.type === "application/pdf") {
      setArchivoPreview("pdf");
    } else {
      setArchivoPreview(null);
    }
  };

  // =========================================================
  // 📤 Subir documento
  // =========================================================
  const handleSubirDocumento = async (e) => {
    e.preventDefault();
    if (!archivo || !titulo) {
      toast.error("Debe ingresar un título y seleccionar un archivo");
      return;
    }

    if (!session || !session.user) {
      toast.error("Usuario no autenticado");
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const sanitizedFileName = archivo.name.replace(/\s+/g, "_");
      const fileName = `${Date.now()}_${sanitizedFileName}`;
      const filePath = `documentos/${fileName}`;

      const uploadTask = supabase.storage
        .from("documentos")
        .upload(filePath, archivo, { cacheControl: "3600", upsert: false });

      const { error: uploadError } = await uploadTask;

      if (uploadError) {
        console.error("❌ Error en upload:", uploadError.message);
        toast.error("Error al subir el archivo");
        return;
      }

      setProgress(100);

      const { data: publicUrlData } = supabase.storage
        .from("documentos")
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        toast.error("No se pudo obtener la URL del archivo");
        return;
      }

      const publicUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase.from("documentos").insert([
        {
          titulo,
          descripcion,
          tipo_documento: tipo,
          url_archivo: publicUrl,
          id_usuario: userId,
        },
      ]);

      if (dbError) {
        console.error("❌ Error en DB:", dbError.message);
        toast.error(`Error al registrar documento: ${dbError.message}`);
        return;
      }

      toast.success("📁 Documento subido correctamente");
      setTitulo("");
      setDescripcion("");
      setTipo("");
      setArchivo(null);
      setArchivoPreview(null);
      setProgress(0);

      fetchDocumentos();
    } catch (err) {
      console.error("❌ Error al subir documento:", err.message);
      toast.error("Error inesperado al subir el documento");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // ModalConfirmacion COMPONENTE
  // =========================================================
  function ModalConfirmacion({
    isOpen,
    onClose,
    onConfirm,
    titulo = "Confirmar eliminación",
    mensaje = "¿Estás seguro de que deseas eliminar este elemento?",
    requireText = false,
  }) {
    const [texto, setTexto] = useState("");

    if (!isOpen) return null;

    const disabled = requireText && texto !== "ELIMINAR";

    return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Fondo oscuro */}
    <div className="absolute inset-0 bg-black backdrop-blur-sm"></div>

    {/* Contenido del modal */}
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative z-10"
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
      >
        <X size={20} />
      </button>

      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Trash2 className="text-red-600" />
        {titulo}
      </h2>

      <p className="text-gray-700 mt-3">{mensaje}</p>

      {requireText && (
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-1">
            Escribe <b>ELIMINAR</b> para confirmar:
          </p>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="ELIMINAR"
          />
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-400"
        >
          Cancelar
        </button>

        <button
          onClick={onConfirm}
          disabled={disabled}
          className={`px-4 py-2 rounded-lg text-white flex items-center gap-2
            ${disabled ? "bg-red-300" : "bg-red-600 hover:bg-red-400"}
          `}
        >
          <Trash2 size={18} />
          Eliminar
        </button>
      </div>
    </motion.div>
  </div>
);
}

  // =========================================================
  // 🗑️ Lógica de eliminación REAL (sin window.confirm)
  // =========================================================
  const handleEliminar = async (doc) => {
    try {
      const path = doc.url_archivo.split("/documentos/")[1];
      if (path) {
        await supabase.storage.from("documentos").remove([`documentos/${path}`]);
      }

      const { error } = await supabase
        .from("documentos")
        .delete()
        .eq("id_documento", doc.id_documento);

      if (error) throw error;

      toast.success("🗑️ Documento eliminado correctamente");
      fetchDocumentos();
    } catch (err) {
      console.error("❌ Error al eliminar documento:", err.message);
      toast.error("Error al eliminar el documento");
    }
  };

  const abrirModalEliminar = (doc) => {
    setDocSeleccionado(doc);
    setModalOpen(true);
  };

  const confirmarEliminacion = async () => {
    await handleEliminar(docSeleccionado);
    setModalOpen(false);
  };

  // =========================================================
  // Renderizado
  // =========================================================
  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 flex items-center">
        <FileText className="w-7 h-7 mr-3" style={{ color: "var(--ie-green)" }} />
        Gestión de Documentos
      </h1>

      {/* === Formulario de subida === */}
      <form
        onSubmit={handleSubirDocumento}
        className="bg-white p-6 rounded-xl shadow-md mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Título del documento
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="border rounded-lg w-full p-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700">
              Tipo de documento
            </label>
            <input
              type="text"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="border rounded-lg w-full p-2"
              placeholder="Ej. Informe, PDF, Imagen..."
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="border rounded-lg w-full p-2"
            rows="3"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-2 text-gray-700">
            Archivo
          </label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.png"
            onChange={handleFileChange}
            className="border rounded-lg w-full p-2"
            required
          />
        </div>

        {archivoPreview && (
          <div className="mt-2">
            {archivoPreview === "pdf" ? (
              <p className="text-gray-700">📄 PDF seleccionado: {archivo.name}</p>
            ) : (
              <img src={archivoPreview} alt="Preview" className="max-h-40 mt-2" />
            )}
          </div>
        )}

        {progress > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ backgroundColor: "var(--ie-green)" }}
          className="mt-4 flex items-center gap-2 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          <Upload className="w-5 h-5" />
          {loading ? "Subiendo..." : "Subir Documento"}
        </button>
      </form>

      {/* === Lista de documentos === */}
      <div className="bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
          <FileText className="w-6 h-6 mr-2" style={{ color: "var(--ie-green)" }} />
          Documentos Subidos
        </h2>

        {documentos.length === 0 ? (
          <p className="text-gray-500">No hay documentos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-500 text-white">
                  <th className="p-2 border-b">Título</th>
                  <th className="p-2 border-b">Tipo</th>
                  <th className="p-2 border-b">Fecha</th>
                  <th className="p-2 border-b text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((doc) => (
                  <tr key={doc.id_documento} className="hover:bg-gray-50">
                    <td className="p-2 border-b">{doc.titulo}</td>
                    <td className="p-2 border-b">
                      {doc.tipo_documento || "-"}
                    </td>
                    <td className="p-2 border-b">
                      {new Date(doc.fecha_subida).toLocaleString()}
                    </td>
                    <td className="p-2 border-b text-center space-x-3">
                      <button
                        onClick={() => window.open(doc.url_archivo, "_blank")}
                        className="text-blue-600 hover:text-blue-800"
                        title="Descargar"
                      >
                        <Download className="w-5 h-5 inline" />
                      </button>

                      <button
                        onClick={() => abrirModalEliminar(doc)}
                        className="text-red-600 hover:text-red-800"
                        title="Eliminar"
                      >
                        <Trash2 className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* === MODAL === */}
      <ModalConfirmacion
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmarEliminacion}
        titulo="Eliminar documento"
        mensaje={`¿Realmente deseas eliminar el documento "${docSeleccionado?.titulo}"? Esta acción no se puede deshacer.`}
        requireText={true}
      />
    </div>
  );
};

// ======================================================================
// MÓDULO 4: COMPONENTE DE REPORTES (Gestión de Reportes)
// ======================================================================


// ======================================================================
// MÓDULO 5: COMPONENTE DE AUDITORÍA (Gestión de Auditoría)
// ======================================================================
const AuditoriaPage = (props) => <PlaceholderPage title="Registro de Auditoría" icon={Shield} {...props} />;

// ======================================================================
// 4. COMPONENTE APPLAYOUT (Navegabilidad con contador de mensajes no leídos)
// ======================================================================
const AppLayout = ({ session, onLogout, currentView, setCurrentView }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [usuarioID, setUsuarioID] = useState(null);
    const user = session?.user;
    const userEmail = user?.email || 'N/A';
    const userName = user?.user_metadata?.nombre_completo || user?.email || 'Usuario';

    console.log("🧩 Usuario actual:", user);

    // =========================================================
    // 1️⃣ Obtener id_usuario real del usuario autenticado
    // =========================================================
    useEffect(() => {
        const fetchUsuarioID = async () => {
            if (!userEmail) return;
            try {
                const { data, error } = await supabase
                    .from("usuarios")
                    .select("id_usuario")
                    .eq("correo_electronico", userEmail)
                    .single();
                if (error) throw error;
                setUsuarioID(data.id_usuario);
                console.log("✅ ID real de usuario encontrado:", data.id_usuario);
            } catch (err) {
                console.error("❌ Error obteniendo id_usuario:", err.message);
            }
        };
        fetchUsuarioID();
    }, [userEmail]);

    // =========================================================
    // 2️⃣ Función para obtener mensajes no leídos
    // =========================================================
    const fetchUnreadMessages = useCallback(async () => {
        if (!usuarioID) return;
        console.log("📬 Consultando mensajes no leídos para usuario:", usuarioID);

        try {
            const { data, error } = await supabase
                .from('comunicaciones')
                .select('id_comunicacion')
                .eq('destinatario_id', usuarioID)
                .eq('estado', 'no leído');

            if (error) throw error;
            console.log(`📊 Mensajes no leídos encontrados: ${data?.length || 0}`);
            setUnreadCount(data ? data.length : 0);
        } catch (err) {
            console.error('❌ Error al obtener mensajes no leídos:', err.message);
        }
    }, [usuarioID]);

    // =========================================================
    // 3️⃣ Cargar contador inicial
    // =========================================================
    useEffect(() => {
        if (usuarioID) fetchUnreadMessages();
    }, [usuarioID, fetchUnreadMessages]);

    // =========================================================
    // 4️⃣ Escuchar eventos Realtime en la tabla comunicaciones
    // =========================================================
    useEffect(() => {
        if (!usuarioID) return;

        console.log("🔌 Creando canal de Realtime para comunicaciones…");

        const channel = supabase
            .channel('realtime-mensajes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'comunicaciones' },
                (payload) => {
                    console.log("📡 Evento INSERT detectado:", payload);
                    const nuevo = payload.new;

                    if (!nuevo) return;

                    if (nuevo.destinatario_id === usuarioID) {
                        console.log("✅ Nuevo mensaje destinado al usuario actual:", nuevo);
                        setUnreadCount((prev) => prev + 1);
                        toast.success(`📩 Nuevo mensaje recibido: ${nuevo.titulo}`, {
                            duration: 4000,
                            style: {
                                background: '#2e7d32',
                                color: '#fff',
                                borderRadius: '10px',
                                fontSize: '0.9rem',
                            },
                            iconTheme: {
                                primary: '#fff',
                                secondary: '#2e7d32',
                            },
                        });
                    } else {
                        console.log("ℹ️ Mensaje insertado, pero NO es para este usuario:", nuevo.destinatario_id);
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'comunicaciones' },
                (payload) => {
                    console.log("🔄 Evento UPDATE detectado:", payload);
                    const actualizado = payload.new;

                    if (actualizado?.destinatario_id === usuarioID && actualizado.estado === 'leído') {
                        console.log("📉 Mensaje marcado como leído, reduciendo contador");
                        setUnreadCount((prev) => Math.max(prev - 1, 0));
                    }
                }
            )
            .subscribe((status) => {
                console.log("🚀 Estado del canal Realtime:", status);
            });

        return () => {
            console.log("🧹 Eliminando canal Realtime de comunicaciones…");
            supabase.removeChannel(channel);
        };
    }, [usuarioID]);

    // =========================================================
    // Componentes de vista
    // =========================================================
    const viewComponents = {
        dashboard: DashboardPage,
        usuarios: UsuariosPage,
        comunicaciones: ComunicacionesPage,
        documentos: DocumentosPage,
        reportes: ReportesPage,
        auditoria: AuditoriaPage,
    };

    const renderContent = () => {
        const CurrentComponent = viewComponents[currentView] || DashboardPage;
        const props = { session, userEmail, userName };
        return <CurrentComponent {...props} />;
    };

    // =========================================================
    // Navegación lateral con contador
    // =========================================================
    const navItems = [
        { name: 'Dashboard', icon: Home, view: 'dashboard' },
        { name: 'Gestión de Usuarios', icon: Users, view: 'usuarios' },
        {
            name: (
                <div className="flex items-center space-x-2">
                    <span>Enviar Mensaje</span>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </div>
            ),
            icon: MessageSquare,
            view: 'comunicaciones',
        },
        { name: 'Documentos', icon: FileText, view: 'documentos' },
        { name: 'Reportes', icon: BarChart2, view: 'reportes' },
        { name: 'Auditoría', icon: Shield, view: 'auditoria' },
    ];

    // =========================================================
    // Sidebar y estructura principal
    // =========================================================
    const Sidebar = () => (
        <div className="flex flex-col h-full bg-gray-800 text-white w-64 fixed md:relative z-40">
            <div className="p-4 flex items-center justify-between border-b border-gray-700">
                <h2 className="text-xl font-bold" style={{ color: 'var(--ie-green)' }}>IE 2079 Admin</h2>
                <button className="md:hidden text-gray-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
                    <X />
                </button>
            </div>
            
            <nav className="flex-grow p-4 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.view}
                        onClick={() => {
                            setCurrentView(item.view);
                            setIsSidebarOpen(false);
                        }}
                        className={`flex items-center w-full px-4 py-2 rounded-lg transition duration-200 
                            ${currentView === item.view ? 'bg-green-600 text-white font-semibold' : 'hover:bg-gray-700 text-gray-300'}`}
                    >
                        <item.icon className="w-5 h-5 mr-3" />
                        {item.name}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-700">
                <div className="text-sm font-medium mb-2 truncate" title={userEmail}>{userName}</div>
                <div className="text-xs text-gray-400 mb-3 truncate">{userEmail}</div>
                <button
                    onClick={onLogout}
                    className="w-full px-2 py-2 rounded-2xl bg-red-500 text-white font-semibold text-center
                    shadow-md hover:bg-red-600 hover:shadow-lg active:scale-95
                    transition-all duration-300 ease-in-out"
                >
                Cerrar Sesión
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-100">
            <Toaster position="top-right" />
            <div className="hidden md:block">
                <Sidebar />
            </div>

            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div className="absolute inset-0 bg-gray-800" onClick={() => setIsSidebarOpen(false)}></div>
                    <Sidebar />
                </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex items-center justify-between bg-green-600 border-b border-gray-200 p-4 shadow-md">
                    <button className="md:hidden text-white hover:text-gray-800" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-semibold text-white hidden md:block">
                        {navItems.find(i => i.view === currentView)?.name}
                    </h1>
                    <div className="flex items-center space-x-3">
                        <span className="text-sm text-white font-medium hidden sm:block">{userName}</span>
                        <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
                            style={{ backgroundColor: 'var(--ie-green-light)', color: 'var(--ie-green)' }}
                        >
                            {userName.charAt(0)}
                        
                        </div>
                          <BellNotificaciones />
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto p-2">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};

// ======================================================================
// 5. COMPONENTE PRINCIPAL APP (Manejo de flujo Login/Dashboard)
// ======================================================================
const App = () => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('dashboard');

    // Setup auth listener + initial session
    useEffect(() => {
        let mounted = true;
        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return;
            setSession(data.session || null);
            setLoading(false);
        }).catch((err) => {
            console.error('Error obteniendo session inicial', err);
            setLoading(false);
        });

        const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
            setSession(newSession || null);
            setLoading(false);
            if (newSession) setCurrentView('dashboard');
        });

        return () => {
            mounted = false;
            if (listener?.subscription) listener.subscription.unsubscribe();
        };
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-xl font-semibold text-gray-600 flex items-center" style={{ color: COLOR_IE_GREEN }}>
                    <Loader className="w-6 h-6 animate-spin inline-block mr-3" /> Verificando autenticación...
                </div>
            </div>
        );
    }

    const handleLoginSuccess = (newSession) => setSession(newSession);
    const handleLogout = async () => {
        await supabase.auth.signOut();
        setSession(null);
    };

    return (
        <div className="app-container">
            <CustomStyles />
            {/* ✅ Toaster global para notificaciones */}
        <Toaster
            position="top-right"
            toastOptions={{
                duration: 4000,
                style: {
                    background: '#333',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                },
                success: {
                    iconTheme: {
                        primary: '#4caf50',
                        secondary: '#fff',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef5350',
                        secondary: '#fff',
                    },
                },
            }}
            />
            {session ? (
                <AppLayout 
                    session={session} 
                    onLogout={handleLogout} 
                    currentView={currentView} 
                    setCurrentView={setCurrentView} 
                />
            ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
};

export default App;
