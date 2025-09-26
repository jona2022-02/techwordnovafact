'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Loader from '@/components/Loader';
import { ProcesoDTE } from '@/types/procesosDte';
import {
    Search,
    FileText,
    Calendar,
    User,
    Clock,
    CheckCircle,
    AlertCircle,
    BarChart3,
    Users,
    ArrowLeft,
    TrendingUp,
    Activity,
    Filter,
    Download,
    RefreshCw,
    Eye,
    ChevronRight,
    UserCheck,
    Database,
    FileUp,
    Hash,
    ExternalLink,
    X
} from 'lucide-react';

interface Estadisticas {
    totalProcesos: number;
    procesosExitosos: number;
    totalArchivos: number;
    totalResultados: number;
    promedioArchiviosPorProceso: number;
    ultimoProceso?: Date;
}

const getVerificationTypeLabel = (type: string): string => {
    switch (type) {
        case 'CSV': return 'Archivos CSV';
        case 'JSON': return 'JSON Individual';
        case 'CODIGO_FECHA': return 'Código y Fecha';
        default: return type;
    }
};

const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
};

const formatDate = (date: any): string => {
    try {
        // Manejar diferentes tipos de fecha
        let dateObj: Date;
        
        if (!date) {
            return 'N/A';
        }
        
        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string') {
            dateObj = new Date(date);
        } else if (date.toDate && typeof date.toDate === 'function') {
            // Firestore Timestamp
            dateObj = date.toDate();
        } else if (date.seconds) {
            // Formato timestamp con seconds/nanoseconds
            dateObj = new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
        } else {
            console.warn('Formato de fecha no reconocido:', date);
            return 'Fecha inválida';
        }
        
        // Verificar si la fecha es válida
        if (isNaN(dateObj.getTime())) {
            console.warn('Fecha inválida:', date);
            return 'Fecha inválida';
        }
        
        return new Intl.DateTimeFormat('es-SV', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).format(dateObj);
    } catch (error) {
        console.error('Error formateando fecha:', error, date);
        return 'Error en fecha';
    }
};

export default function ReportesPage() {
    const { user, loading: authLoading } = useAuth();
    const [procesos, setProcesos] = useState<ProcesoDTE[]>([]);
    const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filtros, setFiltros] = useState({
        fechaDesde: '',
        fechaHasta: '',
        userId: '',
        soloExitosos: false
    });
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        if (!user || authLoading) return;

        // Verificar si es administrador
        if (!user.role || user.role !== 'admin') {
            setError('No tienes permisos para ver esta página');
            setLoading(false);
            return;
        }

        loadProcesos();
    }, [user, authLoading]);

    // Efecto para recargar datos cuando cambien los filtros del servidor
    useEffect(() => {
        if (user && !authLoading && user.role === 'admin') {
            loadProcesos();
        }
    }, [filtros.fechaDesde, filtros.fechaHasta, filtros.userId, filtros.soloExitosos]);

    const loadProcesos = async () => {
        try {
            setLoading(true);
            setError(null);

            // Obtener el token del usuario autenticado
            if (!auth) {
                throw new Error('Auth no está inicializado');
            }
            const user = auth.currentUser;
            if (!user) {
                throw new Error('Usuario no autenticado');
            }

            const token = await user.getIdToken();

            // Construir parámetros de consulta
            const params = new URLSearchParams();
            if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
            if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
            if (filtros.userId) params.append('userId', filtros.userId);
            if (filtros.soloExitosos) params.append('soloExitosos', 'true');
            params.append('limite', '100');

            const response = await fetch(`/api/admin/procesos-dte?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Error al cargar los procesos DTE');
            }

            const data = await response.json();
            setProcesos(data.procesos || []);
            setEstadisticas(data.estadisticas || null);
        } catch (error) {
            console.error('Error loading procesos:', error);
            setError('Error al cargar los procesos DTE. Por favor, intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setFiltros({
            fechaDesde: '',
            fechaHasta: '',
            userId: '',
            soloExitosos: false
        });
        setSearchTerm('');
    };

    // Filtrar procesos
    const procesosFiltrados = procesos.filter(proceso => {
        // Filtro de búsqueda
        const searchMatch = !searchTerm || 
            proceso.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            proceso.archivos.some(archivo => archivo.toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Filtro por fechas
        let fechaMatch = true;
        if (filtros.fechaDesde) {
            const fechaDesde = new Date(filtros.fechaDesde);
            fechaMatch = fechaMatch && new Date(proceso.fechaHora) >= fechaDesde;
        }
        if (filtros.fechaHasta) {
            const fechaHasta = new Date(filtros.fechaHasta);
            fechaHasta.setHours(23, 59, 59, 999); // Incluir todo el día
            fechaMatch = fechaMatch && new Date(proceso.fechaHora) <= fechaHasta;
        }
        
        // Filtro por usuario
        const userMatch = !filtros.userId || proceso.userId === filtros.userId;
        
        // Filtro solo exitosos
        const exitoMatch = !filtros.soloExitosos || proceso.exito;
        
        return searchMatch && fechaMatch && userMatch && exitoMatch;
    });

    // Calcular estadísticas dinámicas basadas en procesos filtrados
    const estadisticasFiltradas = useMemo(() => {
        const totalProcesos = procesosFiltrados.length;
        const procesosExitosos = procesosFiltrados.filter(p => p.exito).length;
        const totalArchivos = procesosFiltrados.reduce((sum, p) => sum + p.cantidadArchivos, 0);
        const totalResultados = procesosFiltrados.reduce((sum, p) => sum + p.cantidadResultados, 0);
        const promedioArchiviosPorProceso = totalProcesos > 0 ? totalArchivos / totalProcesos : 0;
        const ultimoProceso = procesosFiltrados.length > 0 ? procesosFiltrados[0].fechaHora : undefined;

        return {
            totalProcesos,
            procesosExitosos,
            totalArchivos,
            totalResultados,
            promedioArchiviosPorProceso,
            ultimoProceso,
        };
    }, [procesosFiltrados, searchTerm, filtros]);

    if (authLoading || loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-2xl mx-auto">
                    <Card className="border-red-200 bg-red-50">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                                <p>{error}</p>
                            </div>
                            <Button
                                onClick={loadProcesos}
                                variant="outline"
                                className="mt-4"
                            >
                                Intentar nuevamente
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
            <div className="container mx-auto px-6 py-8">
                {/* Header Section */}
                <div className="mb-10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
                            <BarChart3 className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                                Reportes de Procesos DTE
                            </h1>
                            <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                                Panel de análisis y seguimiento de verificaciones realizadas por los usuarios
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-100 text-sm font-medium">Total Procesos</p>
                                    <p className="text-3xl font-bold">{estadisticasFiltradas.totalProcesos}</p>
                                    <p className="text-blue-200 text-xs mt-1">
                                        {(searchTerm || filtros.fechaDesde || filtros.fechaHasta || filtros.userId || filtros.soloExitosos) ? 
                                            'Resultados filtrados' : 'Verificaciones realizadas'}
                                    </p>
                                </div>
                                <Database className="h-12 w-12 text-blue-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-green-100 text-sm font-medium">Procesos Exitosos</p>
                                    <p className="text-3xl font-bold">{estadisticasFiltradas.procesosExitosos}</p>
                                    <p className="text-green-200 text-xs mt-1">
                                        {estadisticasFiltradas.totalProcesos > 0 ? Math.round((estadisticasFiltradas.procesosExitosos / estadisticasFiltradas.totalProcesos) * 100) : 0}% tasa de éxito
                                    </p>
                                </div>
                                <CheckCircle className="h-12 w-12 text-green-200" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-purple-100 text-sm font-medium">Total Archivos</p>
                                    <p className="text-3xl font-bold">{estadisticasFiltradas.totalArchivos}</p>
                                    <p className="text-purple-200 text-xs mt-1">
                                        {estadisticasFiltradas.promedioArchiviosPorProceso.toFixed(1)} promedio por proceso
                                    </p>
                                </div>
                                <FileUp className="h-12 w-12 text-purple-200" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search & Filters */}
                <Card className="mb-8 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <Input
                                        placeholder="Buscar por email o nombre de archivo..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-12 h-12 text-lg border-2 border-gray-200 dark:border-gray-600 focus:border-blue-500 rounded-xl"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="px-6 rounded-xl border-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                        <Filter className="h-5 w-5 mr-2" />
                                        Filtros
                                    </Button>
                                    <Button
                                        onClick={loadProcesos}
                                        size="lg"
                                        className="px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                                    >
                                        <RefreshCw className="h-5 w-5 mr-2" />
                                        Actualizar
                                    </Button>
                                </div>
                            </div>

                            {/* Panel de Filtros */}
                            {showFilters && (
                                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Fecha desde</Label>
                                            <Input
                                                type="date"
                                                value={filtros.fechaDesde}
                                                onChange={(e) => setFiltros(prev => ({ ...prev, fechaDesde: e.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Fecha hasta</Label>
                                            <Input
                                                type="date"
                                                value={filtros.fechaHasta}
                                                onChange={(e) => setFiltros(prev => ({ ...prev, fechaHasta: e.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Usuario específico</Label>
                                            <Input
                                                placeholder="Email del usuario"
                                                value={filtros.userId}
                                                onChange={(e) => setFiltros(prev => ({ ...prev, userId: e.target.value }))}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Filtros especiales</Label>
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    id="soloExitosos"
                                                    checked={filtros.soloExitosos}
                                                    onChange={(e) => setFiltros(prev => ({ ...prev, soloExitosos: e.target.checked }))}
                                                    className="h-4 w-4 rounded border-input"
                                                />
                                                <Label htmlFor="soloExitosos" className="text-sm">Solo exitosos</Label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                                        <Button variant="outline" onClick={clearFilters} size="sm">
                                            <X className="w-4 h-4 mr-1" />
                                            Limpiar
                                        </Button>
                                        <Button onClick={() => { loadProcesos(); setShowFilters(false); }} size="sm">
                                            Aplicar filtros
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Filtros y Borrado Masivo */}
                <Card className="mb-8 border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="flex flex-col md:flex-row gap-4 items-center">
                                <Label className="text-sm font-medium">Borrado masivo:</Label>
                                <Input
                                    type="date"
                                    value={filtros.fechaDesde}
                                    onChange={e => setFiltros(prev => ({ ...prev, fechaDesde: e.target.value }))}
                                    className="max-w-[160px]"
                                />
                                <span className="text-xs text-gray-400">a</span>
                                <Input
                                    type="date"
                                    value={filtros.fechaHasta}
                                    onChange={e => setFiltros(prev => ({ ...prev, fechaHasta: e.target.value }))}
                                    className="max-w-[160px]"
                                />
                                <Input
                                    placeholder="Email del cliente (opcional)"
                                    value={filtros.userId}
                                    onChange={e => setFiltros(prev => ({ ...prev, userId: e.target.value }))}
                                    className="max-w-xs"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    onClick={async () => {
                                        if (!window.confirm('¿Seguro que deseas borrar TODOS los procesos filtrados? Esta acción no se puede deshacer.')) return;
                                        setLoading(true);
                                        setError(null);
                                        try {
                                            // Llama a tu endpoint de borrado masivo aquí
                                            const user = auth.currentUser;
                                            if (!user) throw new Error('Usuario no autenticado');
                                            const token = await user.getIdToken();
                                            const params = new URLSearchParams();
                                            if (filtros.fechaDesde) params.append('fechaDesde', filtros.fechaDesde);
                                            if (filtros.fechaHasta) params.append('fechaHasta', filtros.fechaHasta);
                                            if