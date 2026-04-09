import React, { useState, useEffect, useCallback } from 'react';
import { 
    Users, UserPlus, Loader, Edit2, Trash2, X, AlertTriangle, 
    ChevronLeft, ChevronRight, Search, Download, Key 
} from 'lucide-react';
import { supabase } from '../config/supabaseClient'; 
import { registrarAuditoria } from '../services/auditoriaService'; 
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

const UsuariosPage = () => {
    // --- ESTADOS ---
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
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
            .select(`*, roles (nombre_rol)`, { count: 'exact' })
            // ✅ FILTRO PERMANENTE: Solo personal administrativo, directivo y docente
            .in('rol_id', [1, 2, 3, 4, 5]);

        if (searchTerm) {
            query = query.ilike('nombre_completo', `%${searchTerm}%`);
        }

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
   }, [currentPage, searchTerm, selectedRol]);

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
    if (isLoading) return; // Bloqueo de seguridad preventivo

    try {
      // Normalización para evitar duplicados por espacios o mayúsculas
      const emailLimpio = form.correo_electronico.toLowerCase().trim();
      const nombreLimpio = form.nombre_completo.trim();

      // 1. Validar si el correo_electronico ya existe en la tabla usuarios antes de registrar
      const { data: existingUser, error: checkError } = await supabase
        .from('usuarios')
        .select('correo_electronico')
        .eq('correo_electronico', emailLimpio)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        toast.error("Este correo_electronico ya está registrado en el sistema");
        return;
      }

      // 2. Si no existe, proceder con el registro en Auth
      const { data: authData, error: signError } = await supabase.auth.signUp({
        email: emailLimpio,
        password: form.contraseña,
      });

      if (signError) throw signError;

      // Usamos upsert con onConflict para blindar contra inserciones concurrentes
      const { error: insertError } = await supabase.from('usuarios').upsert([
        {
          id_usuario: authData.user.id,
          nombre_completo: nombreLimpio,
          correo_electronico: emailLimpio,
          rol_id: parseInt(form.rol_id, 10),
        },
      ], { onConflict: 'id_usuario' });

      if (insertError) throw insertError;

      // 4. Auditoría y éxito
      await registrarAuditoria('CREAR', `Usuario creado: ${nombreLimpio}`);
      setIsModalOpen(false);
      fetchUsers();
      toast.success('Usuario registrado correctamente');

    } catch (err) {
      toast.error(err.message || "Error al procesar el registro");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const t0 = performance.now(); // Inicio de medición de rendimiento
    
    try {
      const emailLimpio = form.correo_electronico.toLowerCase().trim();
      const nombreLimpio = form.nombre_completo.trim();

      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre_completo: nombreLimpio,
          correo_electronico_electronico: emailLimpio,
          rol_id: parseInt(form.rol_id, 10),
        })
        .eq('id_usuario', form.id_usuario);

      if (error) throw error;

      // --- AUDITORÍA MEJORADA ---
      const t1 = performance.now();
      const duracion = Math.round(t1 - t0);
      
      // Descripción real que indica qué usuario y qué rol se asignó
      const descUpdate = `Perfil actualizado: ${nombreLimpio} (${emailLimpio})`;
      
      await registrarAuditoria('EDITAR', descUpdate, 'Seguridad', duracion);
      // --------------------------

      setIsModalOpen(false);
      fetchUsers();
      toast.success('Usuario actualizado correctamente');
    } catch (err) {
      console.error("Error en update:", err);
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
         <div className="p-4 md:p-8 bg-slate-100 animate-in fade-in duration-500">
            {/* Cabecera con Buscador y Excel */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                    <Users className="w-7 h-7 mr-3 text-green-600" />
                    Gestión de Usuarios
                </h1>
                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text"
                            placeholder="Buscar por nombre..."
                            className="pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-full"
                            value={searchTerm}
                            onChange={handleSearch}/>
                    </div>
                    <button 
                        onClick={exportToExcel}
                        className="flex items-center px-4 py-2 bg-green-600 border border-green-600 text-white rounded-xl hover:bg-green-400 transition font-bold text-sm shadow-sm">
                        <Download className="w-4 h-4 mr-2 text-white" />
                        Excel
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center justify-center px-4 py-2 bg-slate-800 text-slate-200 rounded-lg shadow-lg hover:bg-slate-500 transition whitespace-nowrap">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Nuevo Usuario
                    </button>
                </div>
            </div>
            {/* FILTROS POR ROL (Tabs Estilizados) */}
            <div className="flex overflow-x-auto pb-4 mb-6 scrollbar-hide gap-2 md:flex-wrap">
            {rolesList.map((rol) => (
             <button
               key={rol.id}
               onClick={() => handleRolFilter(rol.id)}
               className={`
                 flex-none px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border
                 ${selectedRol === rol.id 
                    ? 'bg-green-600 border-green-600 text-white shadow-lg shadow-green-200 scale-105' 
                    : 'bg-slate-700 border-slate-200 text-slate-200 hover:border-green-300 hover:bg-green-50'
                }`}>
              {rol.nombre}
             </button>
            ))}
            </div>
            {isLoading ? (
            <div className="flex justify-center py-10"><Loader className="animate-spin text-green-600 w-10 h-10" /></div>
            ) : (
            <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-md border border-gray-100">
          <table className="min-w-full border-separate" style={{ borderSpacing: 0 }}>
            <thead>
               <tr className="bg-slate-800 text-slate-200">
                  <th className="px-6 py-3 text-center text-[11px] font-bold uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Correo_electronico</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-wider">Rol</th>
                <th className="px-6 py-3 text-center text-[11px] font-bold uppercase tracking-wider bg-pink-600">Acciones</th>
                </tr>
             </thead>
                    <tbody className="divide-y divide-gray-100 tbody font-inter text-sm italic text-gray-700">
                       {users.length > 0 ? users.map((user) => (
                      <tr key={user.id_usuario} className="hover:bg-slate-50 transition-colors">
                    {/* whitespace-nowrap evita que el nombre se quiebre en varias líneas, reduciendo la altura de la fila */}
                  <td className="px-6 py-1.5 text-sm font-semibold text-slate-700 whitespace-nowrap">
                {user.nombre_completo}
              </td>
             <td className="px-6 py-1.5 text-sm text-slate-600 whitespace-nowrap">
             {user.correo_electronico_electronico}
            </td>
            <td className="px-6 py-1.5 text-sm whitespace-nowrap">
             <span className={`px-3 py-0.5 text-[10px] font-bold rounded-full uppercase border ${
                user.rol_id === 1 
                    ? 'bg-purple-50 text-purple-700 border-purple-100' 
                    : 'bg-green-50 text-green-700 border-green-100'
                }`}>
                {user.roles?.nombre_rol || 'Sin Rol'}
            </span>
            </td>
            <td className="px-6 py-1.5 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-3">
                    {/* Botón Editar */}
                    <button 
                        onClick={() => openEditModal(user)} 
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar usuario">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Botón Eliminar */}
                    <button 
                        onClick={() => setDeleteModal({ 
                            open: true, 
                            id_usuario: user.id_usuario, 
                            nombre_completo: user.nombre_completo 
                        })} 
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Eliminar usuario">
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
             </tr>
            )) : (
            <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic text-sm">No se encontraron resultados</td>
            </tr>
            )}
            </tbody>
             </table>
                </div>
                {/* Controles de Paginación */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-6 px-4 gap-4">
                    <span className="text-[12px] font-black text-gray-800 uppercase tracking-widest">
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
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo_electronico Electrónico</label>
                                <input type="email" className="w-full p-3 rounded-xl border focus:ring-2 focus:ring-green-500 outline-none" value={form.correo_electronico_electronico} onChange={(e) => setForm({...form, correo_electronico_electronico: e.target.value})} required />
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
                            className="w-full px-4 py-2 border rounded-xl mb-4 text-center border-red-200 outline-none focus:ring-2 focus:ring-red-500"/>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModal({ open: false })} className="flex-1 py-2 bg-green-600 rounded-xl text-white font-bold">Cancelar</button>
                            <button 
                                onClick={confirmDelete} 
                                disabled={confirmText !== 'ELIMINAR'}
                                className={`flex-1 py-2 rounded-xl font-bold text-white transition ${confirmText === 'ELIMINAR' ? 'bg-red-600' : 'bg-red-300 cursor-not-allowed'}`}>
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