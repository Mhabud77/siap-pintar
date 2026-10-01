import { useState, useEffect } from 'react';
import AuthContext from './AuthContext';
import api from '../services/api';

export default function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
            setUser(JSON.parse(userData));
        }
        setLoading(false);
    }, []);

    const login = async (username, password, role) => {
        try {
            const response = await api.post('/auth/login', { 
                username, password, role 
            });
            const { token, user } = response.data.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            
            return { success: true, user };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login gagal'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}