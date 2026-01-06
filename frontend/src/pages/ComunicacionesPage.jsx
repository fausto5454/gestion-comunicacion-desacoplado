import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Send, FileText, X, Megaphone, ChevronRight, Clock, Loader2, Bell, Users, Trash2, AlertTriangle
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { toast, Toaster } from 'react-hot-toast';

const ComunicacionesPage = ({ session }) => {
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    const [usuarios, setUsuarios] = useState([]);
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('recibidos');
    const [msgDetalle, setMsgDetalle] = useState(null); 
    const [form, setForm] = useState({ titulo: '', mensaje: '', destinatario_id: '', prioridad: 'Normal' });
    const [archivo, setArchivo] = useState(null);
    
    // Estados para Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(6);

    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    
    const fileInputRef = useRef(null);

    // Reiniciar a página 1 cuando se cambia de pestaña
    useEffect(() => {
        setCurrentPage(1);
    }, [tab]);

    const fetchData = useCallback(async () => {
        if (!userId) return;
        const { data: users } = await supabase.from('usuarios').select('id_usuario, nombre_completo');
        setUsuarios(users || []);
        
        const { data, error } = await supabase
            .from('comunicaciones')
            .select(`*, remitente:usuarios!remitente_id(nombre_completo), destinatario:usuarios!destinatario_id(nombre_completo)`)
            .or(`remitente_id.eq.${userId},destinatario_id.eq.${userId}`)
            .order('fecha_envio', { ascending: false });
        
        if (!error) setMensajes(data || []);
    }, [userId]);

    useEffect(() => {
        fetchData();
        const channel = supabase.channel('realtime-comunicaciones')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comunicaciones' }, () => {
                fetchData();
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchData, userId]);

    const abrirMensaje = async (msg) => {
        setMsgDetalle(msg);
        if (tab === 'recibidos' && msg.estado === 'no leído') {
            setMensajes(prev => prev.map(m => 
                m.id_comunicacion === msg.id_comunicacion ? { ...m, estado: 'leído' } : m
            ));
            await supabase.from('comunicaciones').update({ estado: 'leído' }).eq('id_comunicacion', msg.id_comunicacion);
        }
    };

    const handleEnviar = async (e) => {
        e.preventDefault();
        setLoading(true);
        const timestamp = new Date().toISOString();
        try {
            let urlAdjunto = null;
            if (archivo) {
                const cleanName = `${Date.now()}_${archivo.name.replace(/\s/g, '_')}`;
                const { error: upErr } = await supabase.storage.from('comunicaciones_adjuntos').upload(`${userId}/${cleanName}`, archivo);
                if (upErr) throw upErr;
                const { data } = supabase.storage.from('comunicaciones_adjuntos').getPublicUrl(`${userId}/${cleanName}`);
                urlAdjunto = data.publicUrl;
            }
            if (form.destinatario_id === 'TODOS') {
                const { data: todos } = await supabase.from('usuarios').select('id_usuario').neq('id_usuario', userId);
                const envios = todos.map(u => ({ ...form, destinatario_id: u.id_usuario, remitente_id: userId, archivo_url: urlAdjunto, estado: 'no leído', fecha_envio: timestamp }));
                await supabase.from('comunicaciones').insert(envios);
            } else {
                await supabase.from('comunicaciones').insert([{ ...form, remitente_id: userId, archivo_url: urlAdjunto, estado: 'no leído', fecha_envio: timestamp }]);
            }
            toast.success("Enviado correctamente");
            setForm({ titulo: '', mensaje: '', destinatario_id: '', prioridad: 'Normal' });
            setArchivo(null);
        } catch (err) { toast.error(err.message); } 
        finally { setLoading(false); }
    };

    const handleEliminar = async () => {
        if (confirmText !== "ELIMINAR") return;
        setLoading(true);
        try {
            let query = supabase.from('comunicaciones').delete();
            if (msgDetalle.esDifusion) {
                query = query.eq('remitente_id', msgDetalle.remitente_id).eq('fecha_envio', msgDetalle.fecha_envio).eq('titulo', msgDetalle.titulo);
            } else {
                query = query.eq('id_comunicacion', msgDetalle.id_comunicacion);
            }
            const { error } = await query;
            if (error) throw error;
            toast.success("Registro eliminado");
            setMsgDetalle(null);
            setShowConfirm(false);
            setConfirmText("");
            fetchData();
        } catch (err) { toast.error("Error al eliminar"); } 
        finally { setLoading(false); }
    };

    const getFiltrados = () => {
        if (tab === 'recibidos') return mensajes.filter(m => m.destinatario_id === userId);
        const enviados = mensajes.filter(m => m.remitente_id === userId);
        const agrupados = [];
        const idsProcesados = new Set();
        enviados.forEach(m => {
            if (idsProcesados.has(m.id_comunicacion)) return;
            const relacionados = enviados.filter(r => r.fecha_envio === m.fecha_envio && r.titulo === m.titulo);
            if (relacionados.length > 1) {
                agrupados.push({ ...m, esDifusion: true, totalDestinatarios: relacionados.length, id_comunicacion: `group-${m.fecha_envio}` });
                relacionados.forEach(r => idsProcesados.add(r.id_comunicacion));
            } else {
                agrupados.push(m);
                idsProcesados.add(m.id_comunicacion);
            }
        });
        return agrupados;
    };

    const filtrados = getFiltrados();

    // Lógica de Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtrados.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filtrados.length / itemsPerPage);

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 overflow-x-hidden">
            <Toaster />
            <div className="flex items-center gap-4 mb-2">
                <div className="bg-green-600 p-3 rounded-2xl text-white shadow-lg shadow-green-200 shrink-0"><Send size={24} /></div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Comunicaciones</h1>
            </div>

            <form onSubmit={handleEnviar} className="bg-white p-6 md:p-8 rounded-[2rem] border shadow-sm relative overflow-hidden">
                {loading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-green-600 mb-2" size={32} />
                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Enviando...</p>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <select className="p-3 bg-gray-50 border rounded-2xl text-sm font-bold w-full outline-none focus:ring-2 ring-green-500/20" value={form.destinatario_id} onChange={e => setForm({...form, destinatario_id: e.target.value})} required>
                        <option value="">¿A quién enviamos?</option>
                        <option value="TODOS" className="text-red-600 font-bold">📢 TODOS (DIFUSIÓN)</option>
                        {usuarios.filter(u => u.id_usuario !== userId).map(u => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}</option>)}
                    </select>
                    <input className="p-3 bg-gray-50 border rounded-2xl text-sm w-full outline-none focus:ring-2 ring-green-500/20" placeholder="Asunto..." value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required />
                    <select className="p-3 bg-gray-50 border rounded-2xl text-sm font-bold w-full outline-none focus:ring-2 ring-green-500/20" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}><option value="Normal">Prioridad Normal</option><option value="Urgente">Prioridad Urgente 🚨</option></select>
                </div>
                <textarea className="w-full p-4 bg-gray-50 border rounded-2xl text-sm mb-4 min-h-[100px] outline-none focus:ring-2 ring-green-500/20" placeholder="Escriba el mensaje aquí..." value={form.mensaje} onChange={e => setForm({...form, mensaje: e.target.value})} required />
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <button type="button" onClick={() => fileInputRef.current.click()} className="w-full md:w-auto px-5 py-3 rounded-2xl border-2 border-dashed text-[10px] font-black text-gray-500 hover:bg-gray-50 transition-colors uppercase">{archivo ? `✅ ${archivo.name}` : 'Adjuntar Archivo'}</button>
                    <input type="file" ref={fileInputRef} hidden onChange={e => setArchivo(e.target.files[0])} />
                    <button className="w-full md:w-64 py-4 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] shadow-lg shadow-green-200 active:scale-95 transition-all">Enviar Ahora</button>
                </div>
            </form>

            <div className="space-y-4 w-full">
                <div className="border-b border-gray-100">
                    <div className="flex gap-8 overflow-x-auto no-scrollbar pb-px">
                        <button onClick={() => setTab('recibidos')} className={`text-[11px] font-black pb-3 tracking-widest relative shrink-0 ${tab === 'recibidos' ? 'text-green-700' : 'text-gray-400'}`}>BANDEJA DE ENTRADA{tab === 'recibidos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700" />}</button>
                        <button onClick={() => setTab('enviados')} className={`text-[11px] font-black pb-3 tracking-widest relative shrink-0 ${tab === 'enviados' ? 'text-green-700' : 'text-gray-400'}`}>ENVIADOS / DIFUSIONES{tab === 'enviados' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700" />}</button>
                    </div>
                </div>
                <div className="grid gap-3">
                    {currentItems.map(msg => (
                        <div key={msg.id_comunicacion} onClick={() => abrirMensaje(msg)} className={`p-4 md:p-5 rounded-[2rem] border flex items-center justify-between cursor-pointer transition-all hover:shadow-md bg-white shadow-sm ${msg.estado === 'no leído' ? 'border-red-100 bg-red-50/30' : 'border-green-100 bg-green-50/30'}`}>
                            <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${msg.esDifusion ? 'bg-blue-100 text-blue-600' : (msg.estado === 'no leído' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')}`}>{msg.esDifusion ? <Megaphone size={20}/> : <Clock size={20}/>}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-gray-800 truncate">{msg.titulo}</p>
                                        {msg.esDifusion && <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase">Difusión</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase truncate">
                                        {tab === 'recibidos' ? `De: ${msg.remitente?.nombre_completo}` : (msg.esDifusion ? `Enviado a: ${msg.totalDestinatarios} usuarios` : `Para: ${msg.destinatario?.nombre_completo}`)}
                                        <span className="mx-2">•</span>
                                        {new Date(msg.fecha_envio).toLocaleDateString()} - {new Date(msg.fecha_envio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2">
                                <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${msg.esDifusion ? 'bg-blue-50 text-blue-600' : (msg.estado === 'no leído' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')}`}>
                                    {msg.esDifusion ? 'Masivo' : msg.estado}
                                </span>
                                <ChevronRight className="text-gray-300" size={18} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* PAGINACIÓN PROFESIONAL */}
                {filtrados.length > itemsPerPage && (
                    <div className="flex flex-col md:flex-row items-center justify-between bg-white p-4 px-6 rounded-[2rem] border border-gray-100 shadow-sm mt-4 gap-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filtrados.length)} de {filtrados.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 px-4 rounded-xl border text-[10px] font-black disabled:opacity-30 hover:bg-gray-50 transition-all uppercase tracking-widest"
                            >
                                Anterior
                            </button>
                            <div className="flex gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${
                                            currentPage === i + 1 
                                            ? 'bg-green-600 text-white shadow-lg shadow-green-200' 
                                            : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 px-4 rounded-xl border text-[10px] font-black disabled:opacity-30 hover:bg-gray-50 transition-all uppercase tracking-widest"
                            >
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {msgDetalle && (
                <div className="fixed inset-0 bg-gray-800 backdrop-blur-md z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
                    <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] md:rounded-[3rem] p-6 shadow-2xl relative animate-in slide-in-from-bottom duration-300">
                        <button onClick={() => setMsgDetalle(null)} className="absolute top-6 right-6 p-2 bg-gray-50 rounded-full text-gray-400 hover:text-gray-800"><X size={20}/></button>
                        <div className="flex justify-between items-start mb-4 pr-12">
                            <div><h2 className="text-2xl font-black text-gray-900 mb-1">{msgDetalle.titulo}</h2><p className="text-[10px] font-black text-gray-400 uppercase">{msgDetalle.esDifusion ? 'Difusión masiva' : 'Comunicado Individual'}</p></div>
                            {(userEmail === 'dvasquezespinoza1@gmail.com' || tab === 'enviados') && (
                                <button onClick={() => setShowConfirm(true)} className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-colors"><Trash2 size={20} /></button>
                            )}
                        </div>
                        <div className="bg-gray-50 p-6 rounded-[2rem] mb-6 text-sm text-gray-700 leading-relaxed border border-gray-100 max-h-[300px] overflow-y-auto">{msgDetalle.mensaje}</div>
                        {msgDetalle.archivo_url && <button onClick={() => window.open(msgDetalle.archivo_url, '_blank')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-green-200">Descargar Adjunto</button>}
                    </div>
                </div>
            )}

            {showConfirm && (
                <div className="fixed inset-0 bg-gray-800 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-200 border border-red-50 text-center">
                        <div className="bg-red-100 p-4 rounded-full text-red-600 mb-4 inline-block"><AlertTriangle size={32} /></div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">Eliminar Registro</h3>
                        <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">Esta acción es irreversible.<br/>Escribe <span className="font-black text-red-600">ELIMINAR</span> para confirmar:</p>
                        <input type="text" className="w-full p-4 bg-gray-50 border-2 border-red-100 rounded-2xl text-center font-black text-gray-800 mb-6 outline-none focus:border-red-500 uppercase" placeholder="Escribe aquí..." value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                        <div className="flex gap-3 w-full">
                            <button onClick={() => { setShowConfirm(false); setConfirmText(""); }} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest">Cancelar</button>
                            <button onClick={handleEliminar} disabled={confirmText !== "ELIMINAR" || loading} className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${confirmText === "ELIMINAR" ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-red-300 text-white cursor-not-allowed'}`}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComunicacionesPage;