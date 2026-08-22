import React, { createContext, useContext, useState } from 'react';
import type { User, LoginResponse } from '../types/api'; // <-- Agregado 'type'
import { axiosClient } from '../api/axiosClient';

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('maxi_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem('maxi_token');
    });

    const login = async (email: string, password: string) => {
        const response = await axiosClient.post<LoginResponse>('/auth/login', { email, password });
        const { token: newToken, user: userData } = response.data;

        setToken(newToken);
        setUser(userData);

        localStorage.setItem('maxi_token', newToken);
        localStorage.setItem('maxi_user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('maxi_token');
        localStorage.removeItem('maxi_user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe ser usado dentro de AuthProvider');
    return context;
};