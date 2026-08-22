import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { axiosClient } from '../api/axiosClient';
import { Monitor, Mail, Lock, AlertCircle } from 'lucide-react';
import type { LoginResponse } from '../types/api';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
            navigate('/devices');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Credenciales inválidas');
        } finally {
            setLoading(false);
        }
    };

    // Manejo de autenticación con Google
    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError(null);
        try {
            const response = await axiosClient.post<LoginResponse>('/auth/google', {
                idToken: credentialResponse.credential,
            });

            const { token, user } = response.data;
            localStorage.setItem('maxi_token', token);
            localStorage.setItem('maxi_user', JSON.stringify(user));

            // Recargar/Redirigir
            window.location.href = '/logs';
        } catch (err: any) {
            setError(err.response?.data?.error || 'Error al autenticar con Google');
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <div className="inline-flex p-3 bg-blue-500/10 text-blue-500 rounded-xl mb-3">
                        <Monitor className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-wide">Maxi-Cloud</h1>
                    <p className="text-xs text-slate-400 mt-1">Gestión Centralizada de Cajeros</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Botón de Google Sign-In */}
                <div className="flex justify-center mb-6">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Error al conectar con Google')}
                        theme="filled_black"
                        shape="pill"
                        useOneTap={false}
                    />
                </div>

                <div className="relative flex py-2 items-center mb-6">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-4 text-xs text-slate-500 font-medium uppercase">O con correo</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@maxicajero.com"
                                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">Contraseña</label>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-xl text-sm transition disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-400">
                    ¿No tienes una cuenta?{' '}
                    <Link to="/register" className="text-blue-400 hover:underline font-medium">
                        Regístrate aquí
                    </Link>
                </div>
            </div>
        </div>
    );
};