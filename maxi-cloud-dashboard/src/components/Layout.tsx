import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Monitor, FileText, LogOut, ShieldCheck, User } from 'lucide-react';

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/devices', label: 'Cajeros Registrados', icon: Monitor },
        { to: '/logs', label: 'Historial de Logs', icon: FileText },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex">
            {/* Sidebar Lateral */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between flex-shrink-0">
                <div>
                    {/* Logo / Nombre */}
                    <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-lg">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg text-white leading-tight">Maxi-Cloud</h2>
                            <span className="text-xs text-slate-400">Panel Admin</span>
                        </div>
                    </div>

                    {/* Menú de Navegación */}
                    <nav className="p-4 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition ${isActive
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                        }`
                                    }
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.label}
                                </NavLink>
                            );
                        })}
                    </nav>
                </div>

                {/* Perfil de Usuario y Logout */}
                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-slate-700 rounded-full text-slate-300">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Cerrar sesión"
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Área Principal de Contenido */}
            <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
            </main>
        </div>
    );
};