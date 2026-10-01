import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

// ============================================
// EXPORT AUTH CONTEXT
// ============================================
export const AuthContext = createContext();

// ============================================
// AUTH PROVIDER (KOMPONEN)
// ============================================
export const AuthProvider = ({ children }) => {
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
                username, 
                password, 
                role 
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

    // Tambahkan di dalam AuthProvider
    const updateUser = (newData) => {
        setUser(prev => {
            const updated = { ...prev, ...newData };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
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
        updateUser,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;