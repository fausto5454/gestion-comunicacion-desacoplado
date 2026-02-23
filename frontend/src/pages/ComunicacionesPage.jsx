import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Send, X, Megaphone, ChevronRight, Clock, CheckCircle, AlertCircle, Loader2, Trash2, AlertTriangle, LogOut
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { toast, Toaster } from 'react-hot-toast';
import Select from 'react-select';

const ComunicacionesPage = ({ session }) => {
    // 1. ESTADOS Y VARIABLES INICIALES
    const userId = session?.user?.id;
    const [usuarios, setUsuarios] = useState([]);
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('recibidos');
    const [msgDetalle, setMsgDetalle] = useState(null); 
   const [form, setForm] = useState({
    titulo: '',
    mensaje: '',
    prioridad: 'Normal',
    destinatarioId: null,
    esGlobal: false
    });
    const [archivo, setArchivo] = useState(null);
    const [userRol, setUserRol] = useState(null);
    const [userSeccion, setUserSeccion] = useState(null);
    const [userGrado, setUserGrado] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [esDifusionGlobal, setEsDifusionGlobal] = useState(false);
    const [toast, setToast] = useState({ visible: false, mensaje: '', tipo: '' });
    const [busqueda, setBusqueda] = useState("");
    const [tipoEnvio, setTipoEnvio] = useState('grado');
    const [mensajesRecibidos, setMensajesRecibidos] = useState([]);
    const [mensajesEnviados, setMensajesEnviados] = useState([]);
    const [modoEnvio, setModoEnvio] = useState('grado');
    const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

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

   const [opcionesSelect, setOpcionesSelect] = useState([]);
   useEffect(() => {
     if (usuarios.length > 0) {
         const estructuraOpciones = [
            { 
                label: (<span className='text-gray-900 font-bold underline'>GENERAL</span>), 
                options: [{ value: 'GENERAL', label: (<span className="text-green-600 font-bold">📢 GENERAL</span>)}] 
            },
            {
                label: (<span className='text-blue-600 font-bold underline'>GRADOS Y SECCIONES</span>),
                options: [
                    { value: '1A', label: '1° GRADO A' }, { value: '1B', label: '1° GRADO B' }, 
                    { value: '1C', label: '1° GRADO C' }, { value: '2A', label: '2° GRADO A' }, 
                    { value: '2b', label: '2° GRADO B' }, { value: '2C', label: '2° GRADO C' },
                    { value: '3A', label: '3° GRADO A' }, { value: '3B', label: '3° GRADO B' },
                    { value: '4A', label: '4° GRADO A' }, { value: '4B', label: '4° GRADO B' },
                    { value: '5A', label: '5° GRADO A' }, { value: '5B', label: '5° GRADO B' },    
                ]
            },
            {
                label: (<span className='text-blue-600 font-bold underline'>USUARIOS INDIVIDUALES</span>),
                options: usuarios
                    .filter(u => u.id_usuario !== userId)
                    .map(u => ({ 
                        value: u.id_usuario, // UUID real para Wendy
                        label: `${u.nombre_completo} ${u.rol_id === 6 ? '(Estudiante)' : '(Personal)'}`
                    }))
            }
        ];

        setOpcionesSelect(estructuraOpciones);
       }
       }, [usuarios, userId]);

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

    useEffect(() => {
    const cargarIdentidadHibrida = async () => {
        if (!userId) return;

        // Intentamos primero en 'usuarios' (Personal/Gmail)
        const { data: userData } = await supabase
            .from('usuarios')
            .select('rol_id, seccion, grado')
            .eq('id_usuario', userId)
            .single();

        if (userData) {
            setUserRol(userData.rol_id);
            setUserSeccion(userData.seccion);
        } else {
            // Si no está, es un Estudiante (DNI en 'matriculas')
            const { data: matData } = await supabase
                .from('matriculas')
                .select('seccion, grado')
                .eq('dni_estudiante', userId)
                .single();
            
            if (matData) {
                setUserRol(6); // Asignamos rol de estudiante
                setUserSeccion(matData.seccion);
            }
        }
    };

    cargarIdentidadHibrida();
    }, [userId]);

    const fetchData = useCallback(async () => {
    const currentUserId = session?.user?.id;
    if (!currentUserId) return;

    setLoading(true);
    try {
        // 1. Buscamos el grado del usuario internamente para evitar ReferenceError
        const { data: perfil } = await supabase
            .from('usuarios')
            .select('grado')
            .eq('id_usuario', currentUserId)
            .single();

        // 2. Filtros dinámicos según tu tabla
        let filtros = `usuario_destino_id.eq.${currentUserId},es_global.eq.true`;
        if (perfil?.grado) {
            filtros += `,grado_destino.eq.${perfil.grado}`;
        }

        // 3. Cargar Recibidos
        const { data: recibidos, error: errR } = await supabase
            .from('comunicaciones')
            .select('*')
            .or(filtros)
            .order('fecha_envio', { ascending: false });

        if (errR) throw errR;

        // 4. Cargar Enviados (Auditoría)
        const { data: enviados, error: errE } = await supabase
            .from('comunicaciones')
            .select('*')
            .eq('remitente_id', currentUserId)
            .order('fecha_envio', { ascending: false });

        if (errE) throw errE;

        // 5. Guardar en los estados que acabamos de definir
        setMensajesRecibidos(recibidos || []);
        setMensajesEnviados(enviados || []);

    } catch (error) {
        console.error("Error al cargar bandejas:", error.message);
    } finally {
        setLoading(false);
    }
    }, [session]);

      useEffect(() => {
       if (session?.user?.id) {
         fetchData();
       }
     }, [fetchData, session?.user?.id]);
    

      // 4. SUSCRIPCIÓN EN TIEMPO REAL
    useEffect(() => {
    fetchData();

    const channel = supabase
        .channel('cambios-comunicaciones')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'comunicaciones' }, 
            (payload) => {
                // Solo mostrar toast si es un mensaje nuevo para MI
                if (payload.eventType === 'INSERT' && payload.new.usuario_destino_id === userId) {
                    toast('📬 ¡Tienes un nuevo mensaje!', { icon: '🔔' });
                }
                
                // Si el evento es DELETE, refrescamos sin lanzar notificaciones
                fetchData();
            }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
     }, [userId]);

     // 5. ACCIONES DE MENSAJERÍA
   const mostrarToast = (mensaje, tipo = 'success') => {
    setToast({ 
        visible: true, 
        mensaje: mensaje, 
        tipo: tipo 
    });

    setTimeout(() => {
        setToast({ visible: false, mensaje: '', tipo: '' });
    }, 3000);
    };

    const abrirMensaje = async (msg) => {
    // 1. Mostrar el mensaje en el modal/detalle
    setMsgDetalle(msg); 

    // 2. Si el mensaje está 'no leído', actualizamos el estado y la fecha de lectura
    if (msg.estado === 'no leído') {
        try {
            const { error } = await supabase
                .from('comunicaciones')
                .update({ 
                    estado: 'leído',
                    // Registramos la fecha y hora exacta de apertura para auditoría
                    fecha_lectura: new Date().toISOString() 
                })
                .eq('id_comunicacion', msg.id_comunicacion); // ID real de tu tabla

            if (error) throw error;

            // 3. Refrescamos la lista para que el contador y las bandejas se actualicen
            fetchData();
            
        } catch (error) {
            console.error("Error en auditoría de lectura:", error);
        }
      }
   };

  const handleEnviar = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    let urlPublica = null;

    // 1. SUBIDA DE ARCHIVO (Bucket verificado: comunicaciones_adjuntos)
    if (archivo) {
      const fileName = `${Date.now()}_${archivo.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from('comunicaciones_adjuntos') 
        .upload(fileName, archivo);

      if (uploadError) throw new Error("Error de Storage: " + uploadError.message);

      const { data: urlData } = supabase.storage
        .from('comunicaciones_adjuntos').getPublicUrl(fileName);
      
      urlPublica = urlData.publicUrl;
    }
    const idDestino = usuarioSeleccionado?.value || form.destinatario_id;
    const esMasivo = idDestino === 'GENERAL' || esDifusionGlobal;
    const esIndividual = !esMasivo && idDestino && idDestino.length > 20
    const nuevoComunicado = {
        titulo: form.titulo,
        mensaje: form.mensaje,
        remitente_id: userId,
        prioridad: form.prioridad || 'Normal',
        archivo_url: urlPublica,
        estado: 'no leído',
        fecha_envio: new Date().toISOString(), // 👈 Esto recupera la hora en tu tarjeta

        usuario_destino_id: esIndividual ? idDestino : null,
    
        es_global: esMasivo,
    
        identificador_destino: esMasivo ? 'GENERAL' : idDestino,
        tipo_destino: esMasivo ? 'Masivo' : (esIndividual ? 'personal' : 'Grado')
    };

    const { error: dbError } = await supabase
      .from('comunicaciones')
      .insert([nuevoComunicado]);
    
    if (dbError) throw new Error(`Error en BD: ${dbError.message}`);

    mostrarToast("✅ ¡Comunicado enviado con éxito!", "success");
    
    // RESETEO DE ESTADOS
    setForm({ titulo: '', mensaje: '', prioridad: 'Normal', identificador_destino: '', destinatario_id: '' });
    setUsuarioSeleccionado(null);
    setEsDifusionGlobal(false);
    setArchivo(null);
    if (fetchData) fetchData();

  } catch (error) {
    console.error("Error completo:", error);
    mostrarToast(error.message, "error");
  } finally {
    setLoading(false);
  }
  };

   const fetchComunicaciones = async () => {
    // 1. Obtenemos los datos del perfil del usuario logueado
    const userRole = session?.user?.user_metadata?.rol_id;
    const userGrado = session?.user?.user_metadata?.grado; // Ej: "1°"
    const userSeccion = session?.user?.user_metadata?.seccion; // Ej: "A"
    const identificadorAlumno = `${userGrado} ${userSeccion}`;

    let query = supabase
        .from('v_comunicados_oficiales')
        .select('*');
    if (userRole === 6) {
        query = query.or(`identificador_destino.eq."${identificadorAlumno}",es_global.eq.true`);
    }
    const { data, error } = await query.order('fecha_envio', { ascending: false });
    if (!error) fetchComunicaciones(data);
   };

   useEffect(() => {
    const cargarUsuariosSelector = async () => {
        // Eliminamos espacios en el select para evitar el "Bad Request"
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario,nombre_completo,rol_id') 
            .order('nombre_completo', { ascending: true });

        if (!error && data) {
            setUsuarios(data); // Mantienes tu estado original si lo usas en otro lado

            // TRANSFORMACIÓN PARA EL SELECTOR MANUAL:
            const opciones = data.map(u => ({
                value: u.id_usuario,     // 👈 Este es el UUID que irá a la tabla comunicaciones
                label: u.nombre_completo // 👈 Esto es lo que verás escrito en el buscador
            }));
            
            setOpcionesSelect(opciones); // 👈 Este es el estado que debe ir en <Select options={...} />
        } else {
            console.error("Error cargando usuarios:", error?.message);
        }
    };
    cargarUsuariosSelector();
    }, []);

    const handleEliminar = async () => {
    if (confirmText !== "ELIMINAR") {
        return setToast({ visible: true, mensaje: 'Escriba ELIMINAR para confirmar', tipo: 'error' });
    }
    setLoading(true);
    try {
        let query = supabase.from('comunicaciones').delete();

        if (msgDetalle.es_global || msgDetalle.tipo_destino === 'Masivo') {
            query = query
                .eq('remitente_id', msgDetalle.remitente_id)
                .eq('titulo', msgDetalle.titulo)
                .eq('fecha_envio', msgDetalle.fecha_envio); 
        } else {
            query = query.eq('id_comunicacion', msgDetalle.id_comunicacion);
        }

        const { error } = await query;
        if (error) throw error;

        // ✅ ACTUALIZACIÓN EXITOSA: Usamos tu setSost
        setToast({ visible: true, mensaje: 'Eliminación exitosa', tipo: 'success' });

        setTimeout(() => {
            setToast(prev => ({ ...prev, visible: false }));
        }, 2000);
        
        setMsgDetalle(null);
        setShowConfirm(false);
        setConfirmText("");
        fetchData(); 
        
    } catch (error) {
        console.error("Error al eliminar:", error.message);
        setToast({ visible: true, mensaje: 'No se pudo eliminar: ' + error.message, tipo: 'error' });
    } finally {
        setLoading(false);
    }
    };

    const obtenerNombreAMostrar = (msg) => {
    if (tab === 'recibidos') {
        // En recibidos, Wendy ve quién le escribió
        return `DE: ${msg.remitente_nombre || 'Personal Administrativo'}`;
    } else {
        // En la bandeja de ENVIADOS, el Admin ve el destino
        if (msg.es_global) return "📢 PARA: TODO EL PERSONAL";
        if (msg.grado_destino) return `🎓 PARA: ${msg.grado_destino}° ${msg.seccion_destino || ''}`;
        return `👤 PARA: ${msg.destinatario_nombre || 'Usuario Individual'}`;
    }
   };

    const getPrioridadEstilo = (prioridad) => {
      switch (prioridad?.toLowerCase()) {
        case 'urgente': return 'bg-red-600 text-white shadow-sm';
        case 'alta': return 'bg-orange-500 text-white';
        case 'normal': return 'bg-blue-500 text-white';
        default: return 'bg-gray-500 text-white';
     }
    };

    const filtrados = (tab === 'recibidos') 
    ? mensajesRecibidos 
    : (() => {
        const enviados = mensajesEnviados;
        const agrupados = []; 
        const procesados = new Set();
        
        enviados.forEach(m => {
            // Usamos una clave única combinada por seguridad
            const uniqueKey = m.id_comunicacion || `${m.titulo}-${m.fecha_envio}`;
            if (procesados.has(uniqueKey)) return;

            const fechaBase = m.fecha_envio?.substring(0, 16);
            const rel = enviados.filter(r => 
                r.fecha_envio?.substring(0, 16) === fechaBase && 
                r.titulo === m.titulo
            );

            if (rel.length > 1) {
                agrupados.push({ 
                    ...m, 
                    esDifusion: true, 
                    totalDestinatarios: rel.length,
                    // Marcamos el ID para evitar conflictos de Key en React
                    id_comunicacion: `group-${uniqueKey}` 
                });
                rel.forEach(r => procesados.add(r.id_comunicacion || `${r.titulo}-${r.fecha_envio}`));
            } else { 
                agrupados.push(m); 
                procesados.add(uniqueKey); 
            }
        });

        return agrupados.sort((a, b) => new Date(b.fecha_envio) - new Date(a.fecha_envio));
    })();

    // Lógica de rebanado (Slice) para paginación
    const itemsPerPage = 5;
    const totalPages = Math.ceil(filtrados.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filtrados.slice(indexOfFirstItem, indexOfLastItem);

    return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <Toaster position="top-right" />
        {/* ENCABEZADO Y LOGOUT */}
        <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-4">
                <div className="bg-green-600 p-3 rounded-2xl text-white shadow-lg shrink-0"><Send size={24} /></div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight">Comunicaciones</h1>
            </div>
            <button 
                onClick={handleLogout} 
                className="mr-6 hidden md:flex items-center gap-1 px-3 py-2 bg-slate-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm">
                <LogOut size={16} /> 
                <span className="hidden md: inline">Salir</span>
            </button>
        </div>
        {/* FORMULARIO DE ENVÍO (OCULTO PARA ROL 6) */}
        {userRol !== 6 && (
            <form onSubmit={handleEnviar} className="bg-gray-600 p-6 md:p-8 rounded-[2rem] border shadow-sm relative">
                {/* 1. SECCIÓN DE DESTINATARIO Y FILTROS ACADÉMICOS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Select 
                        ref={selectRef} 
                        options={opcionesSelect} 
                        styles={customStyles} 
                        placeholder="🔍 Buscar usuario..." 
                        isSearchable 
                        onChange={(opt) => { setForm({ ...form, destinatario_id: opt?.value || '' }); setUsuarioSeleccionado(opt); }}/>
                       <div className="flex items-center justify-center bg-gray-50 border rounded-2xl p-2">
                        <label className="flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={esDifusionGlobal} 
                                onChange={(e) => setEsDifusionGlobal(e.target.checked)}/>
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                <span className="ml-3 text-xs font-black uppercase text-gray-700">
                                {esDifusionGlobal ? "📢 Masivo" : "📍 Por Grado"} 
                            </span>
                        </label>
                    </div>
                    {!esDifusionGlobal && !form.destinatario_id && (
                        <div className="grid grid-cols-1 gap-2">
                            <select 
                                className="w-full p-3 bg-white border rounded-2xl text-sm font-bold text-gray-700 outline-none shadow-sm focus:ring-2 focus:ring-green-500 transition-all"
                                value={form.identificador_destino || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const [grado, seccion] = val.split(' '); 
                                    setForm({
                                        ...form, 
                                        identificador_destino: val,
                                        grado_destino: grado,
                                        seccion_destino: seccion
                                    });
                                }}
                                required>
                                <option value="">Grado y Sección --</option>
                                {['1°', '2°', '3°', '4°', '5°'].map(grado => (
                                    ['A', 'B', 'C'].map(seccion => (
                                        <option key={`${grado}${seccion}`} value={`${grado} ${seccion}`}>
                                            {grado} {seccion}
                                        </option>
                                    ))
                                ))}
                            </select>
                         </div>
                       )}
                    {(esDifusionGlobal || form.destinatario_id) && (
                        <select className="p-3 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-700" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
                            <option value="Normal">Prioridad Normal</option>
                            <option value="Alta">Prioridad Alta</option>
                            <option value="Urgente">Prioridad Urgente 🚨</option>
                        </select>
                      )}
                </div>
                {/* 2. ASUNTO Y MENSAJE */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <input className="md:col-span-3 p-3 bg-gray-50 border rounded-2xl text-sm" placeholder="Asunto del comunicado..." value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} required />
                    {!esDifusionGlobal && !form.destinatario_id ? (
                        <select className="p-3 bg-gray-50 border rounded-2xl text-sm font-bold text-gray-700" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})}>
                            <option value="Normal">Normal</option>
                            <option value="Alta">Alta</option>
                            <option value="Urgente">🚨 Urgente</option>
                        </select>
                    ) : null}
                    {getPrioridadEstilo}
                </div>
                <textarea className="w-full p-4 bg-gray-50 border rounded-2xl text-sm mb-4 min-h-[100px]" placeholder="Escriba el mensaje aquí..." value={form.mensaje} onChange={e => setForm({...form, mensaje: e.target.value})} required />
                {/* 3. ACCIONES */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <button type="button" onClick={() => fileInputRef.current.click()} className="px-5 py-3 rounded-2xl border-2 border-dashed text-[10px] font-black text-white bg-green-600 uppercase hover:bg-green-500 transition-colors">
                        {archivo ? `✅ ${archivo.name}` : '📁 Adjuntar Archivo'}
                    </button>
                    <input type="file" ref={fileInputRef} hidden onChange={e => setArchivo(e.target.files[0])} />
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full md:w-64 py-4 bg-green-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg hover:bg-green-700 transition-all disabled:bg-gray-400"
                         >
                        {loading ? "Registrando..." : "Enviar Ahora"}
                    </button>
                </div>
            </form>
          )}
       {/* BANDEJAS DE ENTRADA Y SALIDA */}
       <div className="space-y-4">
         {/* TABS DE NAVEGACIÓN */}
          <div className="border-b border-gray-100 flex gap-8 pb-px">
           <button 
            onClick={() => { setTab('recibidos'); setCurrentPage(1); }} 
            className={`text-[11px] font-black pb-3 tracking-widest relative ${tab === 'recibidos' ? 'text-green-700' : 'text-gray-400'}`}
            >
            BANDEJA DE ENTRADA ({mensajesRecibidos.length})
            {tab === 'recibidos' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700" />}
           </button>
          {userRol !== 6 && (
            <button 
                onClick={() => { setTab('enviados'); setCurrentPage(1); }} 
                className={`text-[11px] font-black pb-3 tracking-widest relative ${tab === 'enviados' ? 'text-green-700' : 'text-gray-400'}`}
                 >
                 ENVIADOS / DIFUSIONES ({mensajesEnviados.length})
                {tab === 'enviados' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700" />}
            </button>
          )}
     </div>
    {/* LISTADO DE MENSAJES PAGINADOS */}
    <div className="grid gap-3">
        {currentItems.length > 0 ? (
            currentItems.map((msg) => {
                // Definición de colores por prioridad
                const prioridadColor = {
                    urgente: 'bg-red-600 text-white shadow-md animate-pulse',
                    alta: 'bg-orange-500 text-white',
                    normal: 'bg-blue-500 text-white'
                }[msg.prioridad?.toLowerCase()] || 'bg-gray-500 text-white';
                return (
                    <div 
                        key={msg.id_comunicacion || msg.id} 
                        onClick={() => abrirMensaje(msg)}
                        className={`p-4 md:p-5 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden flex items-center justify-between shadow-sm hover:shadow-md ${
                            msg.estado === 'no leído' && tab === 'recibidos' 
                                ? 'bg-red-50/30 border-red-100' 
                                : 'bg-white border-gray-100 hover:border-gray-300'
                               }`}
                              >
                          {/* Barra lateral de prioridad */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${prioridadColor}`} />
                        <div className="flex items-center gap-4 flex-1 min-w-0 pl-2">
                        {/* Icono dinámico */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      msg.es_global ? 'bg-blue-100 text-blue-600' : (msg.estado === 'no leído' && tab === 'recibidos' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600')
                     }`}>
                    {msg.es_global ? <Megaphone size={20}/> : <Clock size={20}/>}
                     </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h4 className={`text-sm truncate uppercase ${msg.estado === 'no leído' && tab === 'recibidos' ? 'font-black text-red-900' : 'font-bold text-gray-700'}`}>
                                    {msg.titulo || 'Sin Título'}
                                    </h4>
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${prioridadColor}`}>
                                    {msg.prioridad || 'Normal'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase truncate mt-0.5">
                                    <span className="text-blue-500 font-black">{obtenerNombreAMostrar(msg)}</span>
                                    <span className="mx-2 text-gray-300">•</span>
                                    <span className="font-medium">
                                        {new Date(msg.fecha_envio).toLocaleDateString()} {new Date(msg.fecha_envio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </p>
                                {/* Breve extracto del mensaje */}
                                <p className="text-[11px] text-gray-500 line-clamp-1 mt-1 opacity-70">
                                    {msg.mensaje}
                                </p>
                            </div>
                        </div>
                        {/* Estado y Acceso */}
                        <div className="flex items-center gap-4 shrink-0">
                            <div className="hidden md:flex flex-col items-end">
                                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg border ${
                                    msg.estado === 'leído' 
                                        ? 'text-green-600 bg-green-50 border-green-200' 
                                        : 'text-red-600 bg-red-50 border-red-200 shadow-sm'
                                       }`}>
                                    {msg.estado === 'leído' ? '✅ LEÍDO' : '⏳ PENDIENTE'}
                                </span>
                            </div>
                            <ChevronRight className="text-gray-300" size={18} />
                        </div>
                    </div>
                  );
              })
           ) : (
            <div className="text-center py-12 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    No hay mensajes en esta bandeja
                </p>
            </div>
          )}
    </div>
    {/* PAGINACIÓN INTEGRADA */}
    {totalPages > 1 && (
        <div className="flex justify-center items-center gap-6 mt-8 pb-12">
            <button 
                disabled={currentPage === 1} 
                onClick={() => {
                    setCurrentPage(p => p - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} 
                className="p-2.5 border border-gray-200 rounded-2xl disabled:opacity-20 hover:bg-gray-50 transition-all shadow-sm bg-white active:scale-95"
                 >
                <ChevronRight className="rotate-180 text-gray-600" size={20} />
            </button>
            <div className="flex flex-col items-center">
                <span className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em]">
                    Página {currentPage} de {totalPages}
                  </span>
                  <span className="text-[9px] text-blue-500 font-black mt-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase">
                    Mostrando {currentItems.length} de {filtrados.length} mensajes
                </span>
            </div>
            <button 
                disabled={currentPage === totalPages} 
                onClick={() => {
                    setCurrentPage(p => p + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                   }} 
                  className="p-2.5 border border-gray-200 rounded-2xl disabled:opacity-20 hover:bg-gray-50 transition-all shadow-sm bg-white active:scale-95"
                  >
                <ChevronRight className="text-gray-600" size={20} />
            </button>
         </div>
       )}
     </div>
     {/* MODAL DE LECTURA Y DESCARGA */}
        {msgDetalle && (
            <div className="fixed inset-0 bg-gray-800 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative">
                    <div className="absolute top-6 right-6 flex items-center gap-2">
                        {(Number(userRol) === 1 || msgDetalle.remitente_id === session?.user?.id) && (
                            <button onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }} className="p-2.5 bg-red-50 text-red-600 rounded-full hover:bg-red-600 hover:text-white transition-all border border-red-100 shadow-sm"><Trash2 size={20}/></button>
                           )}
                          <button onClick={() => setMsgDetalle(null)} className="p-2.5 bg-gray-50 rounded-full text-gray-400 hover:bg-gray-200 transition-colors border border-gray-100"><X size={20}/></button>
                         </div>
                        <div className="pr-24"> 
                        <h2 className="text-2xl font-black text-gray-900 mb-1 leading-tight">{msgDetalle.titulo}</h2>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-6 tracking-widest flex items-center gap-2"><Clock size={12} /> {formatFecha(msgDetalle.fecha_envio, true)}</p>
                     </div>
                    <div className="bg-gray-50 p-6 rounded-[1.5rem] mb-6 text-sm text-gray-700 border border-gray-100 min-h-[150px] whitespace-pre-wrap leading-relaxed shadow-inner">{msgDetalle.mensaje}</div>
                    {msgDetalle.archivo_url && (
                        <button onClick={() => window.open(msgDetalle.archivo_url, '_blank')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2">📄 Abrir Documento / Descargar</button>
                    )}
                </div>
            </div>
          )}
        {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
        {showConfirm && (
            <div className="fixed inset-0 bg-gray-800 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                    <h3 className="font-black text-gray-900 text-lg mb-2">Eliminación Segura</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-4">Escriba ELIMINAR para confirmar</p>
                    <input autoFocus className="w-full p-4 bg-gray-50 border-2 border-red-100 rounded-2xl text-center font-black text-red-600 mb-4 uppercase" value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} placeholder="ESCRIBA AQUÍ..." />
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => {setShowConfirm(false); setConfirmText("");}} className="py-4 bg-green-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest">Cancelar</button>
                        <button onClick={handleEliminar} disabled={confirmText !== 'ELIMINAR' || loading} className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all ${confirmText === 'ELIMINAR' ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300'}`}>
                            {loading ? "Borrando..." : "Confirmar"}
                        </button>
                    </div>
                </div>
            </div>
           )}
         {toast.visible && (
         <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-lg shadow-lg text-white animate-bounce ${
           toast.tipo === 'success' ? 'bg-green-600' : 'bg-red-600'
             }`}>
              <div className="flex items-center gap-2">
                {toast.tipo === 'success' ? '✅' : '❌'}
                 <span>{toast.mensaje}</span>
                 </div>
               </div>
              )}
           </div>
          );
       };

       export default ComunicacionesPage;