import React, { useState, useEffect, useCallback } from 'react';
import { 
    Users, UserPlus, Loader, Edit2, Trash2, X, AlertTriangle, 
    ChevronLeft, ChevronRight, Search, Download 
} from 'lucide-react';
import { supabase } from '../config/supabaseClient'; 
import { registrarAuditoria } from '../services/auditoriaService'; 
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

const UsuariosPage = () => {
    // --- ESTADOS ---
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [form, setForm] = useState({ id_usuario: '', nombre_completo: '', correo_electronico: '', contraseña: '', rol_id: '' });
    const [deleteModal, setDeleteModal] = useState({ open: false, id_usuario: null, nombre_completo: '' });
    const [confirmText, setConfirmText] = useState('');

    // --- ESTADOS DE PAGINACIÓN, BÚSQUEDA Y FILTRO ---
    const [currentPage, setCurrentPage] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRol, setSelectedRol] = useState('todos'); // Nuevo estado para filtro de rol
    const pageSize = 10;

    // Lista de roles para los botones de filtrado
    const rolesList = [
        { id: 'todos', nombre: 'Todos' },
        { id: '1', nombre: 'Administrador' },
        { id: '2', nombre: 'Director' },
        { id: '3', nombre: 'Docente' },
        { id: '4', nombre: 'Administrativo' },
        { id: '5', nombre: 'Auxiliar' },
        { id: '6', nombre: 'Estudiante' },
    ];

    // --- FUNCION EXPORTAR A EXCEL ---
    const exportToExcel = () => {
        if (users.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }
        
        const dataToExport = users.map(u => ({
            Nombre: u.nombre_completo,
            Email: u.correo_electronico,
            Rol: u.roles?.nombre_rol || 'Sin Rol',
            Fecha_Registro: new Date(u.created_at).toLocaleDateString()
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
        XLSX.writeFile(workbook, `Reporte_Usuarios_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Excel descargado");
    };

    // --- FUNCIONES DE CARGA ---
    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const from = currentPage * pageSize;
            const to = from + pageSize - 1;

            let query = supabase
                .from('usuarios')
                .select(`*, roles (nombre_rol)`, { count: 'exact' });

            // Lógica de búsqueda integrada
            if (searchTerm) {
                query = query.ilike('nombre_completo', `%${searchTerm}%`);
            }

            // MEJORA: Lógica de filtro por rol integrada
            if (selectedRol !== 'todos') {
                query = query.eq('rol_id', parseInt(selectedRol));
            }

            const { data, error, count } = await query
                .order('nombre_completo', { ascending: true })
                .range(from, to);

            if (error) throw error;
            setUsers(data || []);
            setTotalRecords(count || 0);
        } catch (error) {
            toast.error("Error al cargar usuarios");
        } finally {
            setIsLoading(false);
        }
    }, [currentPage, searchTerm, selectedRol]); // Añadido selectedRol como dependencia

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Handlers para búsqueda y filtro
    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(0);
    };

    const handleRolFilter = (rolId) => {
        setSelectedRol(rolId);
        setCurrentPage(0);
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
        // 1. Validar si el correo ya existe en la tabla usuarios antes de registrar
        const { data: existingUser, error: checkError } = await supabase
            .from('usuarios')
            .select('correo_electronico')
            .eq('correo_electronico', form.correo_electronico)
            .maybeSingle();

        if (checkError) throw checkError;
        
        if (existingUser) {
            toast.error("Este correo ya está registrado en el sistema");
            return;
        }

        // 2. Si no existe, proceder con el registro en Auth
        const { data: authData, error: signError } = await supabase.auth.signUp({
            email: form.correo_electronico,
            password: form.contraseña,
        });
        
        if (signError) throw signError;

        // 3. Insertar en la tabla de perfil (usuarios)
        const { error: insertError } = await supabase.from('usuarios').insert([
            {
                id_usuario: authData.user.id, 
                nombre_completo: form.nombre_completo,
                correo_electronico: form.correo_electronico,
                rol_id: parseInt(form.rol_id, 10),
            },
        ]);

        if (insertError) throw insertError;

        // 4. Auditoría y éxito
        await registrarAuditoria('CREAR', `Usuario creado: ${form.nombre_completo}`);
        setIsModalOpen(false);
        fetchUsers();
        toast.success('Usuario registrado correctamente');
        
        } catch (err) {
        toast.error(err.message || "Error al procesar el registro");
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
        <div className="p-4 md:p-8 bg-gray-700 animate-in fade-in duration-500">
            {/* Cabecera con Buscador y Excel */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-white flex items-center">
                    <Users className="w-7 h-7 mr-3 text-green-600" />
                    Gestión de Usuarios
                </h1>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Buscar por nombre..."
                            className="pl-10 pr-4 py-2 border border-gray-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                    </div>
                    <button 
                        onClick={exportToExcel}
                        className="flex items-center px-4 py-2 bg-green-600 border border-green-600 text-white rounded-xl hover:bg-green-400 transition font-bold text-sm shadow-sm"
                    >
                        <Download className="w-4 h-4 mr-2 text-white" />
                        Excel
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-400 transition whitespace-nowrap"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Nuevo Usuario
                    </button>
                </div>
            </div>

            {/* FILTROS POR ROL (Tabs Estilizados) */}
            <div className="flex flex-wrap gap-2 mb-6">
                {rolesList.map((rol) => (
                    <button
                        key={rol.id}
                        onClick={() => handleRolFilter(rol.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            selectedRol === rol.id 
                            ? 'bg-green-600 border-green-600 text-white shadow-md' 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-green-300 hover:text-green-600'
                        }`}
                    >
                        {rol.nombre}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="flex justify-center py-10"><Loader className="animate-spin text-green-600 w-10 h-10" /></div>
            ) : (
                <>
                    <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#6b7280] text-white">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase whitespace-nowrap">Nombre</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase whitespace-nowrap">Correo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold uppercase whitespace-nowrap">Rol</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold uppercase whitespace-nowrap">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.length > 0 ? users.map((user) => (
                                    <tr key={user.id_usuario} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.nombre_completo}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.correo_electronico}</td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
                                                user.rol_id === 1 ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                                {user.roles?.nombre_rol || 'Sin Rol'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                                            <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-800 transition"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => setDeleteModal({ open: true, id_usuario: user.id_usuario, nombre_completo: user.nombre_completo })} className="text-red-600 hover:text-red-800 transition"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-400 italic text-sm">No se encontraron resultados</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Controles de Paginación */}
                    <div className="flex flex-col md:flex-row justify-between items-center mt-6 px-4 gap-4">
                        <span className="text-[12px] font-black text-gray-100 uppercase tracking-widest">
                           Total usuarios: {totalRecords}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                disabled={currentPage === 0}
                                onClick={() => setCurrentPage(prev => prev - 1)}
                                className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold uppercase hover:bg-gray-50 transition-all shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                            </button>
                            <button 
                                disabled={(currentPage + 1) * pageSize >= totalRecords}
                                onClick={() => setCurrentPage(prev => prev + 1)}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold uppercase hover:bg-green-700 transition-all shadow-lg"
                            >
                                Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* --- MODAL CREAR / EDITAR --- */}
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
                                <input type="text" className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-green-500 outline-none" value={form.nombre_completo} onChange={(e) => setForm({...form, nombre_completo: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                                <input type="email" className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-green-500 outline-none" value={form.correo_electronico} onChange={(e) => setForm({...form, correo_electronico: e.target.value})} required />
                            </div>
                            {!isEdit && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contraseña Inicial</label>
                                    <input type="password" placeholder="Mínimo 6 caracteres" className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-green-500 outline-none" value={form.contraseña} onChange={(e) => setForm({...form, contraseña: e.target.value})} required />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asignar Rol</label>
                                <select className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-green-500 outline-none" value={form.rol_id} onChange={(e) => setForm({...form, rol_id: e.target.value})} required>
                                    <option value="">Seleccione...</option>
                                    <option value="1">Administrador</option>
                                    <option value="2">Director</option>
                                    <option value="3">Docente</option>
                                    <option value="4">Administrativo</option>
                                    <option value="5">Auxiliar</option>
                                    <option value="6">Estudiante</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition">
                                {isEdit ? 'Guardar Cambios' : 'Registrar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL ELIMINACIÓN --- */}
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
                            className="w-full px-4 py-2 border rounded-xl mb-4 text-center border-red-200 outline-none focus:ring-2 focus:ring-red-500"
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