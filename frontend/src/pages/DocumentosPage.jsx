import React, { useState, useEffect, useCallback } from 'react';
import { 
    FileText, Upload, Trash2, Search, AlertTriangle,
    File, Loader2, Globe, Lock, Eye, FileSpreadsheet, X
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { toast, Toaster } from 'react-hot-toast';

const DocumentosPage = ({ session }) => {
    const userId = session?.user?.id;
    const [documentos, setDocumentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('Todos');
    const [viewMode, setViewMode] = useState('publicos');
    const [docAEliminar, setDocAEliminar] = useState(null);
    const [confirmacionText, setConfirmacionText] = useState('');

    const categorias = ['Todos', 'Administrativo', 'Académico', 'Planificaciones', 'Recursos', 'Otros'];

    const fetchDocumentos = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('documentos')
                .select(`*, usuarios!subido_por(nombre_completo)`)
                .order('fecha_subida', { ascending: false });

            if (viewMode === 'publicos') {
                query = query.eq('es_publico', true);
            } else {
                query = query.eq('subido_por', userId).eq('es_publico', false);
            }

            const { data, error } = await query;
            if (error) throw error;
            setDocumentos(data || []);
        } catch (error) {
            toast.error("Error al cargar documentos");
        } finally {
            setLoading(false);
        }
    }, [userId, viewMode]);

    useEffect(() => { fetchDocumentos(); }, [fetchDocumentos]);

    const handleVerDocumento = (url) => {
        if (!url) return;
        const extension = url.split('.').pop().toLowerCase();
        const officeExtensions = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
        if (officeExtensions.includes(extension)) {
            const officeUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
            window.open(officeUrl, '_blank');
        } else {
            window.open(url, '_blank');
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
            const storagePath = `docs/${userId}/${Date.now()}_${cleanFileName}`;

            const { error: uploadError } = await supabase.storage
                .from('institucion_docs')
                .upload(storagePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('institucion_docs')
                .getPublicUrl(storagePath);

            const { error: dbError } = await supabase.from('documentos').insert([{
                nombre_archivo: file.name,
                url_archivo: urlData.publicUrl,
                categoria: filterCategory === 'Todos' ? 'Otros' : filterCategory,
                subido_por: userId,
                tamanio: (file.size / 1024).toFixed(2) + ' KB',
                es_publico: viewMode === 'publicos',
                fecha_subida: new Date().toISOString()
            }]);

            if (dbError) throw dbError;
            toast.success("Documento guardado");
            fetchDocumentos();
        } catch (error) {
            toast.error("Error al subir");
        } finally {
            setIsUploading(false);
        }
    };

    const ejecutarEliminacion = async () => {
        if (!docAEliminar || confirmacionText !== 'ELIMINAR') return;
        setIsDeleting(true);
        try {
            const urlParts = docAEliminar.url_archivo.split('institucion_docs/');
            const storagePath = urlParts[1];

            await supabase.storage.from('institucion_docs').remove([storagePath]);
            const { error: dbError } = await supabase.from('documentos').delete().eq('id_documento', docAEliminar.id_documento);

            if (dbError) throw dbError;

            toast.success("Eliminado correctamente");
            Eliminar();
            fetchDocumentos();
        } catch (error) {
            toast.error("Error al eliminar");
        } finally {
            setIsDeleting(false);
        }
    };

    const Eliminar = () => {
        setDocAEliminar(null);
        setConfirmacionText('');
    };

    const filteredDocs = documentos.filter(doc => 
        doc.nombre_archivo.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterCategory === 'Todos' || doc.categoria === filterCategory)
    );

    return (
        <div className="p-4 md:p-6 bg-gray-200 min-h-screen">
            <Toaster />
            
            <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-emerald-300/80 backdrop-blur-sm p-5 md:p-8 rounded-[2.5rem] shadow-sm border border-green-100">
                <div className="flex items-center gap-4">
                    <div className="bg-green-600 p-3 rounded-2xl text-white shadow-lg">
                        <FileText size={28} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-3xl font-black text-gray-800 tracking-tight">Repositorio Institucional</h1>
                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">I.E. 2079 - Gestión Digital</p>
                    </div>
                </div>

                <div className="flex bg-slate-700 p-1.5 rounded-2xl w-full md:w-auto">
                    <button onClick={() => setViewMode('publicos')} className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${viewMode === 'publicos' ? 'bg-green-300 text-green-600 shadow-sm' : 'text-gray-200'}`}>
                        <Globe className="mr-2 w-4 h-4" /> Generales
                    </button>
                    <button onClick={() => setViewMode('privados')} className={`flex-1 md:flex-none flex items-center justify-center px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${viewMode === 'privados' ? 'bg-yellow-200 text-green-600 shadow-sm' : 'text-gray-200'}`}>
                        <Lock className="mr-2 w-4 h-4" /> Mis Archivos
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
                <div className="md:col-span-8 relative">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder={`Buscar archivo...`}
                        className="w-full pl-14 pr-6 py-4 bg-white rounded-[1.8rem] border-none shadow-sm focus:ring-2 ring-green-500 text-sm font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="md:col-span-4">
                    <label className="w-full cursor-pointer bg-green-600 hover:bg-green-700 text-white py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-widest transition shadow-xl shadow-green-100 flex items-center justify-center">
                        {isUploading ? <Loader2 className="animate-spin mr-2" /> : <Upload className="mr-2 w-4 h-4" />}
                        {viewMode === 'publicos' ? 'Subir al Repositorio' : 'Guardar Privado'}
                        <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
                    </label>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-10 h-10 text-green-600" /></div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredDocs.map((doc) => (
                        <div key={doc.id_documento} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-4 bg-gray-50 rounded-2xl text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                    {doc.nombre_archivo.match(/\.(xls|xlsx)$/i) ? <FileSpreadsheet size={24} /> : <File size={24} />}
                                </div>
                                <span className="text-[8px] font-black bg-green-50 text-green-600 px-3 py-1 rounded-full uppercase tracking-tighter">
                                    {doc.categoria}
                                </span>
                            </div>
                            
                            <h3 className="font-black text-gray-800 text-sm mb-1 truncate" title={doc.nombre_archivo}>
                                {doc.nombre_archivo}
                            </h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-6">
                                {doc.tamanio} • {new Date(doc.fecha_subida).toLocaleDateString()}
                            </p>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleVerDocumento(doc.url_archivo)}
                                    className="flex-1 flex justify-center items-center py-3 bg-gray-50 hover:bg-green-600 hover:text-white text-gray-500 rounded-xl text-[10px] font-black uppercase transition-all"
                                >
                                    <Eye className="w-3.5 h-3.5 mr-2" /> Abrir
                                </button>
                                {doc.subido_por === userId && (
                                    <button 
                                        onClick={() => setDocAEliminar(doc)}
                                        className="p-3 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL SEGURO DE ELIMINACIÓN UNIFORMIZADO */}
            {docAEliminar && (
                <div className="fixed inset-0 bg-gray-800 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        {/* Botón X superior derecho */}
                        <button 
                            onClick={Eliminar}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
                                <AlertTriangle size={32} />
                            </div>
                            
                            <h2 className="text-xl font-black text-gray-800 mb-2">¿Confirmar eliminación?</h2>
                            <p className="text-[11px] font-bold text-gray-500 mb-6">
                                Eliminarás a <span className="text-gray-800 font-black italic">"{docAEliminar.nombre_archivo}"</span>
                            </p>

                            {/* Campo de validación - Diseño adaptado a capturas */}
                            <input 
                                type="text"
                                className="w-full p-3 bg-white border border-gray-400 rounded-xl mb-6 text-center font-bold text-red-500 placeholder:text-gray-300 focus:border-red-300 focus:ring-0 outline-none uppercase text-xs"
                                placeholder="Escribe ELIMINAR"
                                value={confirmacionText}
                                onChange={(e) => setConfirmacionText(e.target.value.toUpperCase())}
                            />
                            
                            <div className="flex w-full gap-3">
                                <button 
                                    onClick={Eliminar}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-green-500 text-white rounded-xl font-black text-[11px] uppercase tracking-wide hover:bg-green-600 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={ejecutarEliminacion}
                                    disabled={isDeleting || confirmacionText !== 'ELIMINAR'}
                                    className={`flex-1 py-3 rounded-xl font-black text-[11px] uppercase tracking-wide transition-all flex items-center justify-center 
                                        ${confirmacionText === 'ELIMINAR' 
                                            ? 'bg-red-500 text-white hover:bg-red-600' 
                                            : 'bg-red-300 text-white cursor-not-allowed'}`}
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={16}/> : 'Eliminar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentosPage;