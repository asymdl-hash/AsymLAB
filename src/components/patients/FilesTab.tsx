'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    FolderOpen,
    Upload,
    File,
    FileImage,
    FileText,
    Loader2,
    X,
    Filter,
    Download,
    Trash2,
    Eye,
    Box,
} from 'lucide-react';
import { patientsService } from '@/services/patientsService';

interface FilesTabProps {
    patientId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plans: any[];
}

const FILE_TYPE_CONFIG: Record<string, { label: string; icon: typeof File; color: string; bg: string }> = {
    stl: { label: 'STL', icon: Box, color: 'text-purple-600', bg: 'bg-purple-50' },
    foto: { label: 'Foto', icon: FileImage, color: 'text-green-600', bg: 'bg-green-50' },
    documento: { label: 'Documento', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    raio_x: { label: 'Raio-X', icon: FileImage, color: 'text-amber-600', bg: 'bg-amber-50' },
    outro: { label: 'Outro', icon: File, color: 'text-gray-600', bg: 'bg-gray-50' },
};

function getFileCategory(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['stl', 'obj', 'ply'].includes(ext)) return 'stl';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'foto';
    if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext)) return 'documento';
    if (['dcm', 'dicom'].includes(ext)) return 'raio_x';
    return 'outro';
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesTab({ patientId, plans }: FilesTabProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [files, setFiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState('');
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // suppress lint for plans
    void plans;

    const loadFiles = useCallback(async () => {
        try {
            setLoading(true);
            const data = await patientsService.getFiles(patientId);
            setFiles(data);
        } catch (err) {
            console.error('Error loading files:', err);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        loadFiles();
    }, [loadFiles]);

    const filteredFiles = filterType
        ? files.filter((f) => f.tipo === filterType || getFileCategory(f.nome_original) === filterType)
        : files;

    const handleFileUpload = async (fileList: FileList) => {
        if (!fileList.length) return;
        setUploading(true);
        setError('');

        try {
            for (let i = 0; i < fileList.length; i++) {
                const file = fileList[i];
                const category = getFileCategory(file.name);
                await patientsService.createFileRecord({
                    patient_id: patientId,
                    nome_original: file.name,
                    tipo: category,
                    tamanho: file.size,
                });
            }
            loadFiles();
        } catch (err) {
            console.error('Error uploading files:', err);
            setError('Erro ao registar ficheiros. Tente novamente.');
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    return (
        <div className="space-y-4"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragging(false)}>

            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-gray-500" />
                    Ficheiros
                    {files.length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                            {files.length}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    {/* Filtro por tipo */}
                    <div className="relative">
                        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                            className="text-xs bg-white border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-gray-600 appearance-none cursor-pointer hover:border-gray-300">
                            <option value="">Todos</option>
                            {Object.entries(FILE_TYPE_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>
                        <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                    </div>

                    <input type="file" ref={fileInputRef} multiple className="hidden"
                        onChange={(e) => e.target.files && handleFileUpload(e.target.files)} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="text-xs bg-primary text-white rounded-lg px-3 py-1.5 font-medium hover:bg-primary/90 transition-colors flex items-center gap-1 disabled:opacity-50">
                        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        Upload
                    </button>
                </div>
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg p-2">{error}</p>}

            {/* Drag & Drop Overlay */}
            {dragging && (
                <div className="border-2 border-dashed border-primary/50 bg-primary/5 rounded-xl p-8 text-center transition-all">
                    <Upload className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-sm text-primary font-medium">Largue os ficheiros aqui</p>
                </div>
            )}

            {/* Files Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                </div>
            ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors"
                    onClick={() => fileInputRef.current?.click()}>
                    <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Sem ficheiros</p>
                    <p className="text-xs mt-1">Clique ou arraste ficheiros para fazer upload</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {filteredFiles.map((f: any) => {
                        const category = f.tipo || getFileCategory(f.nome_original);
                        const config = FILE_TYPE_CONFIG[category] || FILE_TYPE_CONFIG.outro;
                        const Icon = config.icon;

                        return (
                            <div key={f.id}
                                className={`border rounded-xl p-3 transition-all hover:shadow-sm group ${config.bg} border-gray-200`}>
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${config.bg}`}>
                                        <Icon className={`h-5 w-5 ${config.color}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate" title={f.nome_original}>
                                            {f.nome_original}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                                            <span>{formatFileSize(f.tamanho || 0)}</span>
                                            <span>·</span>
                                            <span>{config.label}</span>
                                            {f.enviado_por && (
                                                <>
                                                    <span>·</span>
                                                    <span>{f.enviado_por.full_name}</span>
                                                </>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {new Date(f.created_at).toLocaleDateString('pt-PT')}
                                        </p>
                                    </div>
                                </div>
                                {/* Actions (visible on hover) */}
                                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="text-xs text-gray-400 hover:text-gray-600 p-1 rounded" title="Visualizar">
                                        <Eye className="h-3.5 w-3.5" />
                                    </button>
                                    <button className="text-xs text-gray-400 hover:text-gray-600 p-1 rounded" title="Download">
                                        <Download className="h-3.5 w-3.5" />
                                    </button>
                                    <button className="text-xs text-gray-400 hover:text-red-500 p-1 rounded ml-auto" title="Eliminar">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
