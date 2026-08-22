import React, { useEffect, useState } from 'react';
import { axiosClient } from '../api/axiosClient';
import type { Device } from '../types/api';
import {
    Monitor,
    CheckCircle2,
    XCircle,
    Database,
    RefreshCw,
    Copy,
    Check,
    AlertCircle
} from 'lucide-react';

export const Devices: React.FC = () => {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedUuid, setCopiedUuid] = useState<string | null>(null);

    const fetchDevices = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosClient.get<{ devices: Device[] }>('/devices');
            setDevices(response.data?.devices || []);

        } catch (err: any) {
            setDevices([]);
            setError(err.response?.data?.error || 'Error al obtener los cajeros');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
    }, []);

    const handleCopy = (uuid: string) => {
        navigator.clipboard.writeText(uuid);
        setCopiedUuid(uuid);
        setTimeout(() => setCopiedUuid(null), 2000);
    };

    // Cálculo de métricas
    const totalDevices = devices.length;
    const activeDevices = devices.filter((d) => d.active).length;
    const inactiveDevices = devices.filter((d) => !d.active).length;
    const totalLogs = devices.reduce((sum, d) => sum + (d._count?.logs || 0), 0);

    return (
        <div className="space-y-8">
            {/* Encabezado y Acción de Recarga */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">Cajeros Registrados</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Monitoreo y estado de los dispositivos Maxi-Cajero vinculados a la nube
                    </p>
                </div>
                <button
                    onClick={fetchDevices}
                    disabled={loading}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
            </div>

            {/* Tarjetas de Métricas (Stat Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Total Cajeros</p>
                        <p className="text-2xl font-bold text-white mt-1">{totalDevices}</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
                        <Monitor className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Activos</p>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">{activeDevices}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Inactivos</p>
                        <p className="text-2xl font-bold text-rose-400 mt-1">{inactiveDevices}</p>
                    </div>
                    <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg">
                        <XCircle className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Logs Sincronizados</p>
                        <p className="text-2xl font-bold text-purple-400 mt-1">{totalLogs}</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg">
                        <Database className="w-6 h-6" />
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

            {/* Tabla de Dispositivos */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 text-xs uppercase font-semibold">
                                <th className="py-4 px-6">Estado</th>
                                <th className="py-4 px-6">Nombre del Cajero</th>
                                <th className="py-4 px-6">UUID Dispositivo</th>
                                <th className="py-4 px-6 text-center">Registros (Logs)</th>
                                <th className="py-4 px-6">Fecha Registro</th>
                                <th className="py-4 px-6 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                            {loading && devices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                                            <span>Cargando cajeros...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : devices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-500">
                                        No se encontraron cajeros registrados en la plataforma.
                                    </td>
                                </tr>
                            ) : (
                                devices.map((device) => (
                                    <tr key={device.id} className="hover:bg-slate-800/50 transition">
                                        {/* Estado */}
                                        <td className="py-4 px-6">
                                            {device.active ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>

                                        {/* Nombre */}
                                        <td className="py-4 px-6 font-medium text-white">
                                            {device.name}
                                        </td>

                                        {/* UUID */}
                                        <td className="py-4 px-6 font-mono text-slate-400">
                                            {device.uuid}
                                        </td>

                                        {/* Conteo de Logs */}
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-block bg-slate-800 text-blue-400 px-3 py-1 rounded-md text-xs font-semibold">
                                                {device._count?.logs || 0}
                                            </span>
                                        </td>

                                        {/* Fecha de Registro */}
                                        <td className="py-4 px-6 text-slate-400 text-xs">
                                            {new Date(device.createdAt).toLocaleDateString('es-MX', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>

                                        {/* Acciones */}
                                        <td className="py-4 px-6 text-right">
                                            <button
                                                onClick={() => handleCopy(device.uuid)}
                                                title="Copiar UUID"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
                                            >
                                                {copiedUuid === device.uuid ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                        <span className="text-emerald-400">Copiado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>Copiar UUID</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};