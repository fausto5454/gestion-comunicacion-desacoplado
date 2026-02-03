import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Send, X, Megaphone, ChevronRight, Clock, Loader2, Trash2, AlertTriangle, LogOut
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { toast, Toaster } from 'react-hot-toast';
import Select from 'react-select'; 

const ComunicacionesPage = ({ session }) => {
    const userId = session?.user?.id;
    const [usuarios, setUsuarios] = useState([]);
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('recibidos');
    const [msgDetalle, setMsgDetalle] = useState(null); 
    const [form, setForm] = useState({ titulo: '', mensaje: '', destinatario_id: '', prioridad: 'Normal' });
    const [archivo, setArchivo] = useState(null);
    const [userRol, setUserRol] = useState(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(6);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    
    const fileInputRef = useRef(null);
    const selectRef = useRef(null); 

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            window.location.href = '/login'; 
        } catch (error) {
            toast.error("Error al salir");
        }
    };

    const formatFecha = (fechaRaw, extendido = false) => {
        if (!fechaRaw) return "";
        const fecha = new Date(fechaRaw);
        const opciones = { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', hour12: true 
        };
        const formateada = fecha.toLocaleString('es-ES', opciones).toUpperCase();
        return extendido ? formateada : formateada.replace(',', ' •');
    };

    const opcionesSelect = [
        { label: (<span className='text-gray-900 font-bold underline'>DIFUSIÓN GENERAL</span>), options: [{ value: 'TODOS', label: (<span className="text-green-600 font-bold">📢 TODOS (DIFUSIÓN)</span>)}] },
        {
            label: (<span className='text-blue-600 font-bold underline'>GRADOS Y SECCIONES</span>),
            options: [
                { value: '1A', label: '1° GRADO A' }, { value: '1B', label: '1° GRADO B' }, { value: '1C', label: '1° GRADO C' },
                { value: '2A', label: '2° GRADO A' }, { value: '2B', label: '2° GRADO B' }, { value: '2C', label: '2° GRADO C' },
                { value: '3A', label: '3° GRADO A' }, { value: '3B', label: '3° GRADO B' },
                { value: '4A', label: '4° GRADO A' }, { value: '4B', label: '4° GRADO B' },
                { value: '5A', label: '5° GRADO A' }, { value: '5B', label: '5° GRADO B' },
            ]
        },
        {
            label: (<span className='text-blue-600 font-bold underline'>USUARIOS INDIVIDUALES</span>),
            options: usuarios
                .filter(u => u.id_usuario !== userId)
                .map(u => ({ value: u.id_usuario, label: u.nombre_completo }))
        }
    ];

    const customStyles = {
        control: (base) => ({
            ...base, borderRadius: '1.2rem', padding: '4px', backgroundColor: '#f9fafb',
            borderColor: '#e5e7eb', fontSize: '14px', fontWeight: 'bold', boxShadow: 'none',
            '&:hover': { borderColor: '#10b981' }
        }),
        menu: (base) => ({ ...base, borderRadius: '1.5rem', overflow: 'hidden', zIndex: 50 }),
        option: (base, { isFocused }) => ({
            ...base, backgroundColor: isFocused ? '#f0fdf4' : 'white', color: '#374151',
            padding: '10px 15px', fontSize: '12px', cursor: 'pointer'
        })
    };

    const fetchData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { data: userData } = await supabase.from('usuarios').select('rol_id').eq('id_usuario', userId).single();
            if (userData) {
                const currentRol = Number(userData.rol_id);
                setUserRol(currentRol);

                let query = supabase.from('comunicaciones').select(`
                    id_comunicacion, titulo, mensaje, prioridad, estado, fecha_envio, remitente_id, destinatario_id, archivo_url,
                    remitente:usuarios!comunicaciones_remitente_id_fkey(nombre_completo),
                    destinatario:usuarios!comunicaciones_destinatario_id_fkey(nombre_completo)
                `);

                const { data: listaMensajes, error: errorM } = await query.order('fecha_envio', { ascending: false });
                if (errorM) throw errorM;
                setMensajes(listaMensajes || []);

                if (currentRol !== 6) {
                    const { data: users } = await supabase.from('usuarios').select('id_usuario, nombre_completo').order('nombre_completo', { ascending: true });
                    setUsuarios(users || []);
                }
            }
        } catch (error) {
            console.error("Error en fetchData:", error.message);
            toast.error("Error al cargar datos");
        } finally { setLoading(false); }
    }, [userId]);

    // --- NUEVO: SUSCRIPCIÓN EN TIEMPO REAL ---
    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('cambios-comunicaciones')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'comunicaciones' },
                (payload) => {
                    // Si el nuevo mensaje es para mí, avisar con un Toast
                    if (payload.eventType === 'INSERT' && payload.new.destinatario_id === userId) {
                        toast('📬 ¡Tienes un nuevo mensaje!', { icon: '🔔', duration: 4000 });
                    }
                    fetchData(); // Recargar la lista automáticamente
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchData, userId]);

    const abrirMensaje = async (msg) => {
        setMsgDetalle(msg);
        if (tab === 'recibidos' && msg.estado === 'no leído') {
            await supabase.from('comunicaciones').update({ estado: 'leído' }).eq('id_comunicacion', msg.id_comunicacion);
            fetchData();
        }
    };

    const handleEnviar = async (e) => {
    e.preventDefault();
    console.log("Iniciando proceso de envío..."); // Debug
    
    if (userRol === 6) return toast.error("Sin permisos");
    if (!form.destinatario_id) return toast.error("Seleccione destinatario");
    
    setLoading(true);

    try {
        const ahoraPeru = new Date().toLocaleString("sv-SE", { timeZone: "America/Lima" }).replace(' ', 'T');
        let urlAdjunto = null;

        // 1. Manejo de Archivo
        if (archivo) {
            console.log("Subiendo archivo...");
            const cleanName = `${Date.now()}_${archivo.name.replace(/\s/g, '_')}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('comunicaciones_adjuntos')
                .upload(`${userId}/${cleanName}`, archivo);
            
            if (uploadError) throw new Error("Error al subir archivo: " + uploadError.message);

            const { data: publicUrlData } = supabase.storage
                .from('comunicaciones_adjuntos')
                .getPublicUrl(`${userId}/${cleanName}`);
            urlAdjunto = publicUrlData.publicUrl;
        }

        // 2. Determinar Destinatarios
        console.log("Determinando destinatarios para:", form.destinatario_id);
        let dIds = [];
        if (form.destinatario_id === 'TODOS') {
            const { data: todos, error: errTodos } = await supabase.from('usuarios').select('id_usuario').neq('id_usuario', userId);
            if (errTodos) throw errTodos;
            dIds = todos.map(u => u.id_usuario);
        } else if (/^\d[AB]$/.test(form.destinatario_id)) {
            const { data: filtrados, error: errFiltro } = await supabase.from('usuarios')
                .select('id_usuario')
                .eq('grado', form.destinatario_id.charAt(0))
                .eq('seccion', form.destinatario_id.charAt(1))
                .neq('id_usuario', userId);
            if (errFiltro) throw errFiltro;
            dIds = filtrados?.map(u => u.id_usuario) || [];
        } else { 
            dIds = [form.destinatario_id]; 
        }

        if (dIds.length === 0) throw new Error("No se encontraron destinatarios");

        // 3. Preparar e Insertar
        const envios = dIds.map(id => ({
            titulo: form.titulo,
            mensaje: form.mensaje,
            prioridad: form.prioridad,
            destinatario_id: id,
            remitente_id: userId,
            archivo_url: urlAdjunto,
            estado: 'no leído',
            fecha_envio: ahoraPeru
        }));

        console.log("Insertando en la base de datos...");
        const { error: insertError } = await supabase.from('comunicaciones').insert(envios);
        
        if (insertError) throw insertError;

        // 4. Éxito y Limpieza
        toast.success(`Enviado correctamente a ${dIds.length} usuario(s)`);
        setForm({ titulo: '', mensaje: '', destinatario_id: '', prioridad: 'Normal' });
        setArchivo(null);
        if (selectRef.current) selectRef.current.clearValue();
        
        } catch (err) {
        console.error("ERROR DETALLADO EN ENVÍO:", err);
        toast.error(err.message || "Error al enviar");
        } finally {
        setLoading(false);
      }
    };

    const handleEliminar = async () => {
        if (confirmText !== "ELIMINAR") return toast.error("Escriba ELIMINAR");
        setLoading(true);
        try {
            let query = supabase.from('comunicaciones').delete();
            if (msgDetalle.esDifusion) {
                query = query.eq('remitente_id', msgDetalle.remitente_id).eq('fecha_envio', msgDetalle.fecha_envio).eq('titulo', msgDetalle.titulo);
            } else { query = query.eq('id_comunicacion', msgDetalle.id_comunicacion); }
            await query;
            toast.success("Eliminado");
            setMsgDetalle(null); setShowConfirm(false); setConfirmText(""); 
        } finally { setLoading(false); }
    };

    const filtrados = (tab === 'recibidos') 
        ? mensajes.filter(m => m.destinatario_id === userId) 
        : (() => {
            const enviados = mensajes.filter(m => m.remitente_id === userId);
            const agrupados = []; 
            const procesados = new Set();
            enviados.forEach(m => {
                if (procesados.has(m.id_comunicacion)) return;
                const fechaBase = m.fecha_envio.substring(0, 16);
                const rel = enviados.filter(r => 
                    r.fecha_envio.substring(0, 16) === fechaBase && 
                    r.titulo === m.titulo && r.mensaje === m.mensaje
                );
                if (rel.length > 1) {
                    agrupados.push({ ...m, esDifusion: true, totalDestinatarios: rel.length, id_comunicacion: `group-${m.id_comunicacion}` });
                    rel.forEach(r => procesados.add(r.id_comunicacion));
                } else { 
                    agrupados.push(m); 
                    procesados.add(m.id_comunicacion); 
                }
            });
            return agrupados;
        })();

    const totalPages = Math.ceil(filtrados.length / itemsPerPage);
    const currentItems = filtrados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            <Toaster position="top-right" />
            
            <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <div className="bg-green-600 p-3 rounded-2xl text-white shadow-lg shrink-0"><Send size={24} /></div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Comunicaciones</h1>
                </div>
            </div>

            {userRol !== 6 && (
                <form onSubmit={handleEnviar} className="bg-gray-600 p-6 md:p-8 rounded-[2rem] border shadow-sm relative">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <Select ref={selectRef} options={opcionesSelect} styles={customStyles} placeholder="🔍 Buscar destinatario..." isSearchable onChange={(opt) => setForm({...form, destinatario_id: opt?.value || ''})} />
                        <input className="p-3 bg-gray-50 border rounded-2xl text-sm" placeholder="Asunto..." value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required />
                        <select className="p-3 bg-gray-50 border rounded-2xl text-sm font-bold" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
                            <option value="Ninguno">Prioridad Ninguno</option>
                            <option value="Normal">Prioridad Normal</option>
                            <option value="Urgente">Prioridad Urgente 🚨</option>
                        </select>
                    </div>
                    <textarea className="w-full p-4 bg-gray-50 border rounded-2xl text-sm mb-4 min-h-[100px]" placeholder="Escriba el mensaje aquí..." value={form.mensaje} onChange={e => setForm({...form, mensaje: e.target.value})} required />
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <button type="button" onClick={() => fileInputRef.current.click()} className="px-5 py-3 rounded-2xl border-2 border-dashed text-[10px] font-black text-white bg-green-600 uppercase">{archivo ? `✅ ${archivo.name}` : 'Adjuntar Archivo'}</button>
                        <input type="file" ref={fileInputRef} hidden onChange={e => setArchivo(e.target.files[0])} />
                        <button disabled={loading} className="w-full md:w-64 py-4 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-green-700 transition-colors disabled:bg-gray-400">
                            {loading ? "Enviando..." : "Enviar Ahora"}
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-4">
                <div className="border-b border-gray-100 flex gap-8 pb-px">
                    <button onClick={() => {setTab('recibidos'); setCurrentPage(1);}} className={`text-[11px] font-black pb-3 tracking-widest relative ${tab === 'recibidos' ? 'text-green-700' : 'text-gray-400'}`}>BANDEJA DE ENTRADA {tab === 'recibidos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700" />}</button>
                    {userRol !== 6 && <button onClick={() => {setTab('enviados'); setCurrentPage(1);}} className={`text-[11px] font-black pb-3 tracking-widest relative ${tab === 'enviados' ? 'text-green-700' : 'text-gray-400'}`}>ENVIADOS / DIFUSIONES {tab === 'enviados' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700" />}</button>}
                </div>
                
                <div className="grid gap-3">
                    {currentItems.length === 0 ? (
                        <p className="text-center py-10 text-gray-400 text-sm font-bold uppercase tracking-widest">No hay mensajes en esta sección</p>
                    ) : currentItems.map(msg => (
                        <div key={msg.id_comunicacion} onClick={() => abrirMensaje(msg)} className={`p-4 md:p-5 rounded-[2rem] border flex items-center justify-between cursor-pointer bg-white shadow-sm hover:shadow-md transition-all ${msg.estado === 'no leído' && tab === 'recibidos' ? 'border-red-100 bg-red-50/30' : 'border-green-100 bg-green-50/30'}`}>
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.esDifusion ? 'bg-blue-100 text-blue-600' : (msg.estado === 'no leído' && tab === 'recibidos' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')}`}>{msg.esDifusion ? <Megaphone size={20}/> : <Clock size={20}/>}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-gray-800 truncate">{msg.titulo}</p>
                                        {msg.esDifusion && <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Difusión</span>}
                                        {msg.prioridad === 'Urgente' && <span className="text-[8px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Urgente</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase truncate">
                                        {tab === 'recibidos' ? `De: ${msg.remitente?.nombre_completo || 'SISTEMA'}` : (msg.esDifusion ? `Enviado a: ${msg.totalDestinatarios} usuarios` : `Para: ${msg.destinatario?.nombre_completo || 'USUARIO'}`)}
                                        <span className="mx-2">•</span>
                                        {formatFecha(msg.fecha_envio)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg shadow-sm border ${msg.estado === 'leído' ? 'text-green-600 bg-green-50 border-green-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                                    {msg.estado === 'leído' ? 'LEÍDO' : 'NO LEÍDO'}
                                </span>
                                <ChevronRight className="text-gray-300" size={18} />
                            </div>
                        </div>
                    ))}
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border rounded-xl disabled:opacity-20"><ChevronRight className="rotate-180" size={18} /></button>
                        <span className="text-[10px] font-black text-gray-400">PÁGINA {currentPage} DE {totalPages}</span>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border rounded-xl disabled:opacity-20"><ChevronRight size={18} /></button>
                    </div>
                )}
            </div>

            {msgDetalle && (
                <div className="fixed inset-0 bg-gray-800 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative">
                        <div className="absolute top-6 right-6 flex items-center gap-2">
                            {(Number(userRol) === 1 || msgDetalle.remitente_id === userId) && (
                                <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }} className="p-2.5 bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"><Trash2 size={20}/></button>
                            )}
                            <button onClick={() => setMsgDetalle(null)} className="p-2.5 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-200 transition-colors border border-gray-100"><X size={20}/></button>
                        </div>
                        <div className="pr-24"> 
                            <h2 className="text-2xl font-black text-gray-900 mb-1 leading-tight">{msgDetalle.titulo}</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                                <Clock size={12} /> {formatFecha(msgDetalle.fecha_envio, true)}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-[1.5rem] mb-6 text-sm text-gray-700 border border-gray-100 min-h-[150px] whitespace-pre-wrap leading-relaxed shadow-inner">{msgDetalle.mensaje}</div>
                        {msgDetalle.archivo_url && (
                            <button onClick={() => window.open(msgDetalle.archivo_url, '_blank')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2">Descargar Adjunto</button>
                        )}
                    </div>
                </div>
            )}

            {showConfirm && (
                <div className="fixed inset-0 bg-gray-800 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                        <h3 className="font-black text-gray-900 text-lg mb-2">Eliminación Segura</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">Escriba ELIMINAR para confirmar</p>
                        <input autoFocus className="w-full p-4 bg-gray-50 border-2 border-red-100 rounded-2xl text-center font-black text-red-600 mb-4" value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} placeholder="ESCRIBA AQUÍ..." />
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => {setShowConfirm(false); setConfirmText("");}} className="py-4 bg-green-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest">Cancelar</button>
                            <button onClick={handleEliminar} disabled={confirmText !== 'ELIMINAR'} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all ${confirmText === 'ELIMINAR' ? 'bg-red-600' : 'bg-red-300'}`}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComunicacionesPage;