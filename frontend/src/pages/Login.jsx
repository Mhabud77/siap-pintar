import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password, role);
        
        if (result.success) {
            const userRole = result.user.role;
            const selectedRole = role; // role yang dipilih di dropdown

            //prioritas: cek role yang dipilih dulu
            if (role === 'wali_kelas') {
                navigate('/guru');
            } else if (selectedRole === 'guru_bk' || userRole === 'guru_bk') {
                navigate('/guru-bk')}
            
            // Redirect berdasarkan role
            switch (role) {
                case 'admin':    navigate('/admin'); break;
                case 'kepsek':   navigate('/kepsek'); break;
                case 'guru':     navigate('/guru'); break;
                case 'wali_kelas': navigate('/guru'); break;
                case 'guru_bk':  navigate('/guru-bk'); break;   // ← halaman khusus BK
                case 'murid':    navigate('/murid'); break;
                case 'orangtua': navigate('/orangtua'); break;
            }
        } else {
            setError(result.message);
        }
        
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                {/* ============================================
                    LOGO & IDENTITAS SEKOLAH
                ============================================ */}
                <div className="text-center mb-6">
                    <img
                        src="/Logo-SiapPintar.png"
                        alt="Logo Sekolah"
                        className="w-24 h-24 object-contain mx-auto mb-3"
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <h1 className="text-2xl font-bold text-gray-800 leading-tight">
                        SIAP PINTAR
                    </h1>
                    <p className="text-sm text-gray-800 mt-1">
                        Sistem Informasi Absensi, Perilaku, dan Poin Terintegrasi
                    </p>
                    <div className="mt-3 pt-3 border-t border-gray-200">  
                    </div>
                </div>

                {/* ============================================
                    ERROR MESSAGE
                ============================================ */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                {/* ============================================
                    FORM LOGIN
                ============================================ */}
                <form onSubmit={handleSubmit}>
                    {/* Jenis User (Dropdown) */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Jenis User
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="input-field"
                            required
                        >
                            <option value="">-- Pilih Jenis User --</option>
                            <option value="admin">👨‍💼 Admin</option>
                            <option value="kepsek">👨‍🏫 Kepala Sekolah</option>
                            <option value="guru">👨‍🏫 Guru Mapel</option>
                            <option value="wali_kelas">🏫 Wali Kelas</option>
                            <option value="guru_bk">💼 Guru BK</option>
                            <option value="murid">👨‍🎓 Murid</option>
                            <option value="orangtua">👨‍👩‍👧 Orang Tua</option>
                        </select>
                    </div>

                    {/* Username */}
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Username / NIS
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input-field"
                            placeholder="Masukkan username atau NIS"
                            required
                            autoComplete="username"
                        />
                    </div>

                    {/* Password dengan Toggle */}
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field pr-12"
                                placeholder="Masukkan password"
                                required
                                autoComplete="current-password"
                            />
                            {/* Tombol Toggle */}
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    // Icon mata terbuka (eye)
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                ) : (
                                    // Icon mata tertutup (eye-off)
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Tombol Login */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary py-3 text-lg font-semibold disabled:opacity-50"
                    >
                        {loading ? '⏳ Memproses...' : '🔐 LOGIN'}
                    </button>
                </form>

                {/* Footer */}
                <div className="text-center mt-6 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                        © 2026 SIAP PINTAR
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        SMP Negeri 1 Gondang
                    </p>
                </div>
            </div>
        </div>
    );
}