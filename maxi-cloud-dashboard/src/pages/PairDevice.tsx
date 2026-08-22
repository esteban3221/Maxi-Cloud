import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { Monitor, CheckCircle2, AlertCircle, Link2, Building } from 'lucide-react';

export const PairDevice: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const [pairingCode, setPairingCode] = useState(searchParams.get('code') || '');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const codeFromUrl = searchParams.get('code');
        if (codeFromUrl) {
            setPairingCode(codeFromUrl.toUpperCase());
        }
    }, [searchParams]);

    const handlePair = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            await axiosClient.post('/devices/claim', {
                pairingCode: pairingCode.trim().toUpperCase(),
                name: name.trim(),
            });

            setSuccess(true);
            setTimeout(() => {
                // Ya no llamamos a fetchDevices aquí porque no existe en este componente.
                // Al navegar a /devices, la vista de lista debería recargar los datos sola.
                navigate('/devices');
            }, 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'No se pudo vincular el cajero. Verifica el código.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="inline-flex p-3 bg-blue-500/10 text-blue-500 rounded-xl mb-3">
                        <Link2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Vincular Cajero POS</h1>
                    <p className="text-xs text-slate-400 mt-1">
                        Asigna un nombre a la sucursal para activar la conexión con la nube.
                    </p>
                </div>

                {success && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-400 text-sm">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <span>¡Cajero vinculado con éxito! Redirigiendo a dispositivos...</span>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handlePair} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Código de Vinculación</label>
                        <div className="relative">
                            <Monitor className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                required
                                maxLength={6}
                                value={pairingCode}
                                onChange={(e) => setPairingCode(e.target.value.toUpperCase())}
                                placeholder="EJ: A3F89C"
                                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono text-center tracking-widest text-blue-400 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Nombre o Sucursal del Cajero</label>
                        <div className="relative">
                            <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ej. Sucursal Centro - Cajero 1"
                                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || success}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl text-sm transition disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Vincular Dispositivo...' : 'Confirmar Vinculación'}
                    </button>
                </form>
            </div>
        </div>
    );
};