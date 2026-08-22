import React, { useEffect, useState, useCallback } from 'react';
import { axiosClient } from '../api/axiosClient';
import type { Log, LogsResponse, Device } from '../types/api';
import {
    FileText,
    Filter,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    RotateCcw,
    Tag,
    Monitor
} from 'lucide-react';

export const Logs: React.FC = () => {
    const [logs, setLogs] = useState<Log[]>([]);
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estados de paginación
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
    });

    // Estados de Filtro
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [selectedTipo, setSelectedTipo] = useState<string>('');
    const [selectedEstatus, setSelectedEstatus] = useState<string>('');

    // Cargar lista de cajeros para el selector de filtro
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const response = await axiosClient.get<{ devices: Device[] }>('/devices');
                setDevices(response.data.devices);
            } catch (err) {
                console.error('Error al cargar la lista de cajeros para el filtro:', err);
            }
        };
        fetchDevices();
    }, []);

    // Consultar Logs con Filtros y Paginación
    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: Record<string, string | number> = {
                page: pagination.page,
                limit: pagination.limit,
            };

            if (selectedDevice) params.deviceId = selectedDevice;
            if (selectedTipo) params.tipo = selectedTipo;
            if (selectedEstatus) params.estatus = selectedEstatus;

            const response = await axiosClient.get<LogsResponse>('/logs', { params });

            setLogs(response.data.logs);
            setPagination(response.data.pagination);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al obtener el historial de logs');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, selectedDevice, selectedTipo, selectedEstatus]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Restablecer todos los filtros
    const handleResetFilters = () => {
        setSelectedDevice('');
        setSelectedTipo('');
        setSelectedEstatus('');
        setPagination((prev) => ({ ...prev, page: 1 }));
    };

    // Formateador de moneda (MXN)
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
        }).format(amount);
    };

    // Renderizado de badge por tipo de transacción
    const renderTipoBadge = (tipo: string) => {
        const upper = tipo.toUpperCase();
        let bg = 'bg-slate-800 text-slate-300 border-slate-700';
        if (upper === 'VENTA') bg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (upper === 'RETIRO') bg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        if (upper === 'DEPOSITO') bg = 'bg-purple-500/10 text-purple-400 border-purple-500/20';

        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
                <Tag className="w-3 h-3" />
                {tipo}
            </span>
        );
    };

    // Renderizado de badge por estatus
    const renderEstatusBadge = (estatus: string) => {
        const upper = estatus.toUpperCase();
        if (upper === 'COMPLETADO' || upper === 'EXITO.') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {estatus}
                </span>
            );
        }
        if (upper === 'CANCELADO' || upper === 'ERROR') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    {estatus}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                {estatus}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">Historial de Transacciones</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Registro global de operaciones y logs sincronizados desde los cajeros
                    </p>
                </div>
                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
            </div>

            {/* Barra de Filtros */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-300 font-medium text-sm mb-3">
                    <Filter className="w-4 h-4 text-blue-400" />
                    <span>Filtros de Búsqueda</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Filtro Dispositivo */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-medium">Filtrar por Cajero</label>
                        <select
                            value={selectedDevice}
                            onChange={(e) => {
                                setSelectedDevice(e.target.value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Todos los Cajeros</option>
                            {devices.map((dev) => (
                                <option key={dev.id} value={dev.id}>
                                    {dev.name} ({dev.uuid})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Filtro Tipo */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-medium">Tipo de Operación</label>
                        <select
                            value={selectedTipo}
                            onChange={(e) => {
                                setSelectedTipo(e.target.value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Todos los Tipos</option>
                            <option value="VENTA">VENTA</option>
                            <option value="RETIRO">RETIRO</option>
                            <option value="DEPOSITO">DEPOSITO</option>
                        </select>
                    </div>

                    {/* Filtro Estatus */}
                    <div>
                        <label className="block text-xs text-slate-400 mb-1.5 font-medium">Estatus</label>
                        <select
                            value={selectedEstatus}
                            onChange={(e) => {
                                setSelectedEstatus(e.target.value);
                                setPagination((p) => ({ ...p, page: 1 }));
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Todos los Estatus</option>
                            <option value="COMPLETADO">COMPLETADO</option>
                            <option value="CANCELADO">CANCELADO</option>
                            <option value="ERROR">ERROR</option>
                        </select>
                    </div>

                    {/* Botón de Limpieza */}
                    <div className="flex items-end">
                        <button
                            onClick={handleResetFilters}
                            className="w-full flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 py-2 rounded-lg text-sm transition"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Limpiar Filtros
                        </button>
                    </div>
                </div>
            </div>

            {/* Mensaje de Error */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Tabla de Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 text-xs uppercase font-semibold">
                                <th className="py-4 px-6">ID</th>
                                <th className="py-4 px-6">Fecha y Hora</th>
                                <th className="py-4 px-6">Cajero</th>
                                <th className="py-4 px-6">Tipo</th>
                                <th className="py-4 px-6">Descripción</th>
                                <th className="py-4 px-6 text-right">Ingreso</th>
                                <th className="py-4 px-6 text-right">Cambio</th>
                                <th className="py-4 px-6 text-right">Total</th>
                                <th className="py-4 px-6 text-center">Estatus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                                            <span>Cargando transacciones...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-500">
                                        No se encontraron transacciones que coincidan con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/50 transition">
                                        {/* ID en la tabla */}
                                        <td className="py-4 px-6 font-mono text-xs text-slate-400 whitespace-nowrap">
                                            {log.localId} {/* O puedes usar log.localId si prefieres el ID del cajero */}
                                        </td>
                                        {/* Fecha */}
                                        <td className="py-4 px-6 text-slate-300 text-xs whitespace-nowrap">
                                            {new Date(log.fecha).toLocaleString('es-MX', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                second: '2-digit'
                                            })}
                                        </td>

                                        {/* Cajero */}
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Monitor className="w-4 h-4 text-slate-400" />
                                                <div>
                                                    <p className="font-medium text-white text-xs">{log.device?.name || 'Desconocido'}</p>
                                                    <p className="font-mono text-[11px] text-slate-500">{log.device?.uuid}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Tipo */}
                                        <td className="py-4 px-6 whitespace-nowrap">
                                            {renderTipoBadge(log.tipo)}
                                        </td>

                                        {/* Descripción */}
                                        <td className="py-4 px-6 text-slate-300 max-w-xs truncate text-xs">
                                            {log.descripcion || '-'}
                                        </td>

                                        {/* Ingreso */}
                                        <td className="py-4 px-6 text-right font-mono text-slate-400 text-xs whitespace-nowrap">
                                            {formatCurrency(log.ingreso)}
                                        </td>

                                        {/* Cambio */}
                                        <td className="py-4 px-6 text-right font-mono text-slate-400 text-xs whitespace-nowrap">
                                            {formatCurrency(log.cambio)}
                                        </td>

                                        {/* Total */}
                                        <td className="py-4 px-6 text-right font-mono font-bold text-white text-xs whitespace-nowrap">
                                            {formatCurrency(log.total)}
                                        </td>

                                        {/* Estatus */}
                                        <td className="py-4 px-6 text-center whitespace-nowrap">
                                            {renderEstatusBadge(log.estatus)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paginación */}
                <div className="border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/50">
                    <div className="text-xs text-slate-400">
                        Mostrando <span className="font-semibold text-white">{logs.length}</span> de{' '}
                        <span className="font-semibold text-white">{pagination.total}</span> registros
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Selector de límite por página */}
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>Filas:</span>
                            <select
                                value={pagination.limit}
                                onChange={(e) => {
                                    setPagination((p) => ({ ...p, limit: Number(e.target.value), page: 1 }));
                                }}
                                className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs focus:outline-none"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>

                        {/* Controles de página */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                                disabled={pagination.page <= 1 || loading}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <span className="text-xs font-medium text-slate-300">
                                {pagination.page} de {pagination.totalPages || 1}
                            </span>

                            <button
                                onClick={() => setPagination((p) => ({ ...p, page: Math.min(pagination.totalPages, p.page + 1) }))}
                                disabled={pagination.page >= pagination.totalPages || loading}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};