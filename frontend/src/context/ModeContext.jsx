import { createContext, useContext, useState, useEffect } from 'react';

export const ModeContext = createContext();

export const useMode = () => {
    const context = useContext(ModeContext);
    if (!context) {
        throw new Error('useMode must be used within ModeProvider');
    }
    return context;
};

export const ModeProvider = ({ children }) => {
    // Mode: 'wali' atau 'guru'
    const [mode, setMode] = useState('guru');
    const [isWaliKelas, setIsWaliKelas] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load mode dari localStorage saat pertama buka
    useEffect(() => {
        const savedMode = localStorage.getItem('dashboard_mode');
        if (savedMode === 'wali' || savedMode === 'guru') {
            setMode(savedMode);
        }
        setLoading(false);
    }, []);

    // Fungsi ganti mode
    const gantiMode = (newMode) => {
        if (newMode !== 'wali' && newMode !== 'guru') return;

        // Kalau mau ke mode wali tapi bukan wali kelas, tolak
        if (newMode === 'wali' && !isWaliKelas) {
            return {
                success: false,
                message: 'Anda bukan wali kelas, tidak bisa switch ke mode wali kelas.'
            };
        }

        setMode(newMode);
        localStorage.setItem('dashboard_mode', newMode);
        return { success: true };
    };

    const value = {
        mode,
        setMode,
        gantiMode,
        isWaliKelas,
        setIsWaliKelas,
        loading
    };

    return (
        <ModeContext.Provider value={value}>
            {children}
        </ModeContext.Provider>
    );
};