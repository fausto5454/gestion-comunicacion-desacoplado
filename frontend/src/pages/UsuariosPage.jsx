import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Loader, Edit2, Trash2, X, AlertTriangle 
} from 'lucide-react';
import { supabase } from '../config/supabaseClient'; // Asegúrate de que esta ruta sea correcta
import { registrarAuditoria } from '../services/auditoriaService'; // Importa el servicio
import { toast } from 'react-hot-toast';

const UsuariosPage = () => {
    // --- ESTADOS ---
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [form, setForm] = useState({ id_usuario: '', nombre_completo: '', correo_electronico: '', contraseña: '', rol_id: '' });
    const [deleteModal, setDeleteModal] = useState({ open: false, id_usuario: null, nombre_completo: '' });
    const [confirmText, setConfirmText] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    // --- FUNCIONES DE CARGA ---
    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select(`*, roles (nombre_rol)`)
                .order('nombre_completo', { ascending: true });
            if (error) throw error;
            setUsers(data);
        } catch (error) {
            toast.error("Error al cargar usuarios");
        } finally {
            setIsLoading(false);
        }
    };

    // --- MODALES ---
    const openCreateModal = () => {
        setIsEdit(false);
        setForm({ nombre_completo: '', correo_electronico: '', contraseña: '', rol_id: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (user) => {
        setIsEdit(true);
        setForm({ ...user, contraseña: '' }); 
        setIsModalOpen(true);
    };

    // --- OPERACIONES CRUD ---
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            // 1. Crear en Auth de Supabase
            const { data: authData, error: signError } = await supabase.auth.signUp({
                email: form.correo_electronico,
                password: form.contraseña,
            });
            if (signError) throw signError;

            // 2. Crear en tabla pública de usuarios
            const { error: insertError } = await supabase.from('usuarios').insert([
                {
                    id_usuario: authData.user.id, 
                    nombre_completo: form.nombre_completo,
                    correo_electronico: form.correo_electronico,
                    rol_id: parseInt(form.rol_id, 10),
                },
            ]);
            if (insertError) throw insertError;

            await registrarAuditoria('CREAR', `Usuario creado: ${form.nombre_completo}`);
            setIsModalOpen(false);
            fetchUsers();
            toast.success('Usuario registrado e invitación enviada');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
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

            await registrarAuditoria('EDITAR', `Actualizado: ${form.nombre_completo}`);
            setIsModalOpen(false);
            fetchUsers();
            toast.success('Usuario actualizado correctamente');
        } catch (err) {
            toast.error('Error al actualizar');
        }
    };

    const confirmDelete = async () => {
        if (confirmText !== 'ELIMINAR') return;
        try {
            const { error } = await supabase
                .from('usuarios')
                .delete()
                .eq('id_usuario', deleteModal.id_usuario);

            if (error) throw error;

            await registrarAuditoria('ELIMINAR', `Eliminado: ${deleteModal.nombre_completo}`);
            setDeleteModal({ open: false, id_usuario: null, nombre_completo: '' });
            setConfirmText('');
            fetchUsers();
            toast.success('Usuario eliminado definitivamente');
        } catch (err) {
            toast.error('No se pudo eliminar (registros vinculados)');
        }
    };

    return (
        <div className="p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                    <Users className="w-7 h-7 mr-3 text-green-600" />
                    Gestión de Usuarios
                </h1>
                <button
                    onClick={openCreateModal}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition"
                >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Nuevo Usuario
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-10"><Loader className="animate-spin text-green-600 w-10 h-10" /></div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-500 text-white">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase">Nombre</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase">Correo</th>
                                <th className="px-6 py-4 text-left text-xs font-bold uppercase">Rol</th>
                                <th className="px-6 py-4 text-right text-xs font-bold uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id_usuario} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.nombre_completo}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{user.correo_electronico}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                                            user.rol_id === 1 ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                        }`}>
                                            {user.roles?.nombre_rol || 'Sin Rol'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-3">
                                        <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-800 transition"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => setDeleteModal({ open: true, id_usuario: user.id_usuario, nombre_completo: user.nombre_completo })} className="text-red-600 hover:text-red-800 transition"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* MODAL CREAR / EDITAR */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-800 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                        </div>
                        <form onSubmit={isEdit ? handleUpdate : handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                                <input type="text" className="w-full p-3 rounded-xl border" value={form.nombre_completo} onChange={(e) => setForm({...form, nombre_completo: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                                <input type="email" className="w-full p-3 rounded-xl border" value={form.correo_electronico} onChange={(e) => setForm({...form, correo_electronico: e.target.value})} required />
                            </div>
                            {!isEdit && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contraseña Inicial</label>
                                    <input type="password" placeholder="Mínimo 6 caracteres" className="w-full p-3 rounded-xl border" value={form.contraseña} onChange={(e) => setForm({...form, contraseña: e.target.value})} required />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asignar Rol</label>
                                <select className="w-full p-3 rounded-xl border" value={form.rol_id} onChange={(e) => setForm({...form, rol_id: e.target.value})} required>
                                    <option value="">Seleccione...</option>
                                    <option value="1">Administrador</option>
                                    <option value="2">Director</option>
                                    <option value="3">Docente</option>
                                    <option value="4">Administrativo</option>
                                    <option value="5">Auxiliar</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition">
                                {isEdit ? 'Guardar Cambios' : 'Registrar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL ELIMINACIÓN */}
            {deleteModal.open && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in duration-200">
                        <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                        <h3 className="text-xl font-bold text-center mb-2">¿Confirmar eliminación?</h3>
                        <p className="text-sm text-gray-500 text-center mb-6">
                            Eliminarás a <strong>{deleteModal.nombre_completo}</strong>.
                        </p>
                        <input
                            type="text"
                            placeholder="Escribe ELIMINAR"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full px-4 py-2 border rounded-xl mb-4 text-center border-red-200 outline-none"
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModal({ open: false })} className="flex-1 py-2 bg-green-600 rounded-xl text-white font-bold">Cancelar</button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={confirmText !== 'ELIMINAR'}
                                className={`flex-1 py-2 rounded-xl font-bold text-white transition ${confirmText === 'ELIMINAR' ? 'bg-red-600' : 'bg-red-300 cursor-not-allowed'}`}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsuariosPage;