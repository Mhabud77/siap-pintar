import { useAuth } from '../context/useAuth';
import { useMode } from '../context/ModeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { mode, gantiMode, isWaliKelas } = useMode();
    const navigate = useNavigate();
    const location = useLocation();
    const [showMenu, setShowMenu] = useState(false);
    const [showModeDropdown, setShowModeDropdown] = useState(false);
    const modeDropdownRef = useRef(null);

    // Tutup dropdown mode kalau klik di luar
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target)) {
                setShowModeDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Daftar menu berdasarkan role + mode
    const getMenuByRole = () => {
        if (!user) return [];

        // Menu untuk guru: beda antara mode wali dan mode guru
        if (user.role === 'guru') {
            if (mode === 'wali' && isWaliKelas) {
                return [
                    { icon: '🏠', label: 'Dashboard', path: '/guru' },
                    { icon: '📷', label: 'Scanner', path: '/scanner' },
                    { icon: '🏫', label: 'Data Kelas', path: '/data-kelas' },
                    { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
                    { icon: '💬', label: 'Pesan BK', path: '/guru/pesan-bk' },
                    { icon: '📊', label: 'Rekap Absensi', path: '/rekap-absensi' },
                ];
            } else {
                // Mode guru mapel
                return [
                    { icon: '🏠', label: 'Dashboard', path: '/guru' },
                    { icon: '📷', label: 'Scanner', path: '/scanner' },
                    { icon: '🏫', label: 'Data Kelas', path: '/data-kelas' },
                    { icon: '📝', label: 'Perilaku', path: '/perilaku' },
                    { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
                    { icon: '📄', label: 'Laporan', path: '/laporan' },
                    { icon: '💬', label: 'Pesan BK', path: '/guru/pesan-bk' },
                    { icon: '📊', label: 'Rekap Absensi', path: '/rekap-absensi' },
                ];
            }
        }

        const menus = {
            admin: [
                { icon: '🏠', label: 'Dashboard', path: '/admin' },
                { icon: '📷', label: 'Scanner', path: '/scanner' },
                { icon: '🏫', label: 'Data Kelas', path: '/data-kelas' },
                { icon: '📝', label: 'Perilaku', path: '/perilaku' },
                { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
                { icon: '📄', label: 'Laporan', path: '/laporan' },
                { icon: '📊', label: 'Rekap Absensi', path: '/rekap-absensi' },
            ],
            kepsek: [
                { icon: '🏠', label: 'Dashboard', path: '/kepsek' },
                { icon: '🏫', label: 'Data Kelas', path: '/data-kelas' },
                { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
                { icon: '📄', label: 'Laporan', path: '/laporan' },
                { icon: '📊', label: 'Rekap Absensi', path: '/rekap-absensi' },
            ],
            murid: [
                { icon: '🏠', label: 'Dashboard', path: '/murid' },
                { icon: '🎯', label: 'Misi', path: '/misi' },
                { icon: '🏫', label: 'Data Kelas', path: '/data-kelas' },
                { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
                { icon: '🏫', label: 'Data Kelas', path: '/murid/kelas' },
                { icon: '💬', label: 'Konseling', path: '/murid/bk' },
            ],
            orangtua: [
                { icon: '🏠', label: 'Dashboard', path: '/orangtua' },
                { icon: '🏫', label: 'Data Kelas', path: '/data-kelas' },
                { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
                { icon: '📊', label: 'Rekap Absensi', path: '/rekap-absensi' }, // <--- TAMBAHKAN LINE INI
                { icon: '📄', label: 'Laporan', path: '/laporan' },
                { icon: '⚙️', label: 'Pengaturan', path: '/orangtua/pengaturan' },
            ],
            guru_bk: [
                { icon: '🏠', label: 'Dashboard', path: '/guru-bk' },
                { icon: '🏫', label: 'Data Kelas', path: '/guru-bk/kelas' },
                { icon: '📷', label: 'Scanner', path: '/scanner' },
                { icon: '💬', label: 'Pesan BK', path: '/guru/pesan-bk' },
                { icon: '🏆', label: 'Leaderboard', path: '/leaderboard' },
                { icon: '📄', label: 'Laporan BK', path: '/guru-bk/laporan' },
                { icon: '📊', label: 'Rekap Absensi', path: '/rekap-absensi' },
            ],
        };

        return menus[user.role] || [];
    };

    const menuItems = getMenuByRole();

    const isActive = (path) => location.pathname === path;

    const handleGantiMode = (newMode) => {
        const result = gantiMode(newMode);
        if (!result.success) {
            alert(result.message);
        } else {
            setShowModeDropdown(false);
            // Redirect ke dashboard guru
            navigate('/guru');
        }
    };

    return (
        <nav className="bg-white shadow-md sticky top-0 z-50">
            {/* BARIS ATAS: Logo + Identitas + User */}
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* KIRI: Logo + Identitas Sekolah */}
                    <div className="flex items-center gap-3">
                        <img
                            src="/Logo-SiapPintar.png"
                            alt="Logo SiapPintar"
                            className="w-12 h-12 object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                            <h1 className="text-xl font-bold text-primary leading-tight">
                                SIAP PINTAR
                            </h1>
                            <p className="text-xs text-gray-600 leading-tight">
                                SMP NEGERI 1 GONDANG
                            </p>
                        </div>
                    </div>

                    {/* KANAN: Mode Dropdown + Info User + Logout */}
                    <div className="flex items-center gap-3">
                        {/* MODE DROPDOWN (HANYA UNTUK GURU) */}
                        {user?.role === 'guru' && (
                            <div className="relative" ref={modeDropdownRef}>
                                <button
                                    onClick={() => setShowModeDropdown(!showModeDropdown)}
                                    className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition border border-blue-200"
                                >
                                    {mode === 'wali' && isWaliKelas ? (
                                        <>
                                            <span>🏫</span>
                                            <span>Wali Kelas</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>📚</span>
                                            <span>Guru Mapel</span>
                                        </>
                                    )}
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* DROPDOWN MENU */}
                                {showModeDropdown && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                                        <div className="px-3 py-2 border-b border-gray-100">
                                            <p className="text-xs font-bold text-gray-500 uppercase">
                                                Ganti Mode Dashboard
                                            </p>
                                        </div>

                                        {/* Mode Wali Kelas */}
                                        {isWaliKelas && (
                                            <button
                                                onClick={() => handleGantiMode('wali')}
                                                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3 ${
                                                    mode === 'wali' ? 'bg-blue-50' : ''
                                                }`}
                                            >
                                                <div className="text-2xl">🏫</div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-bold text-gray-800 text-sm">
                                                            Wali Kelas
                                                        </p>
                                                        {mode === 'wali' && (
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                                Aktif
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Fokus kelas sendiri. Bisa validasi misi & catatan.
                                                    </p>
                                                </div>
                                            </button>
                                        )}

                                        {/* Mode Guru Mapel */}
                                        <button
                                            onClick={() => handleGantiMode('guru')}
                                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition flex items-start gap-3 ${
                                                mode === 'guru' || !isWaliKelas ? 'bg-blue-50' : ''
                                            }`}
                                        >
                                            <div className="text-2xl">📚</div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-800 text-sm">
                                                        Guru Mapel
                                                    </p>
                                                    {(mode === 'guru' || !isWaliKelas) && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                            Aktif
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Lihat semua murid 7-9. Bisa input perilaku & laporan.
                                                </p>
                                            </div>
                                        </button>

                                        {/* Info kalau bukan wali kelas */}
                                        {!isWaliKelas && (
                                            <div className="px-4 py-2 bg-yellow-50 border-t border-yellow-200">
                                                <p className="text-xs text-yellow-700">
                                                    ⚠️ Anda bukan wali kelas. Mode wali tidak tersedia.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Info User (Desktop) */}
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-bold text-gray-800 leading-tight">
                                {user?.nama_lengkap}
                            </p>
                            <p className="text-xs text-gray-500 capitalize leading-tight">
                                {user?.role === 'guru' && mode === 'wali' && isWaliKelas
                                    ? 'Wali Kelas'
                                    : user?.role === 'guru'
                                    ? 'Guru Mapel'
                                    : user?.role
                                }
                            </p>
                        </div>

                        {/* Avatar Bulat - dengan foto profil */}
                        <button
                            onClick={() => navigate('/profil')}
                            className="w-10 h-10 rounded-full overflow-hidden shadow hover:ring-2 hover:ring-primary transition"
                            title="Lihat Profil"
                        >
                            {user?.foto_profil ? (
                                <img
                                    src={`http://localhost:5000${user.foto_profil}`}
                                    alt={user.nama_lengkap}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Fallback ke inisial kalau foto gagal load
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = `
                                            <div class="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                                ${user?.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
                                            </div>
                                        `;
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                                    {user?.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'}
                                </div>
                            )}
                        </button>

                        {/* Tombol Logout */}
                        <button
                            onClick={logout}
                            className="hidden md:block bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                        >
                            Logout
                        </button>

                        {/* Hamburger Menu (Mobile) */}
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="md:hidden text-gray-700 text-2xl p-1"
                        >
                            {showMenu ? '✕' : '☰'}
                        </button>
                    </div>
                </div>
            </div>

            {/* BARIS BAWAH: Menu Navigasi (Desktop) */}
            <div className="hidden md:block border-t border-gray-100">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-1 overflow-x-auto">
                        {menuItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`flex items-center gap-1 px-3 py-2 text-sm font-medium transition border-b-2 ${
                                    isActive(item.path)
                                        ? 'text-primary border-primary'
                                        : 'text-gray-600 border-transparent hover:text-primary hover:border-gray-300'
                                }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* MENU MOBILE (Dropdown) */}
            {showMenu && (
                <div className="md:hidden border-t border-gray-100 bg-white">
                    <div className="px-4 py-2">
                        {/* Mode Switcher (Mobile) */}
                        {user?.role === 'guru' && isWaliKelas && (
                            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                                <p className="text-xs font-bold text-blue-700 mb-2">
                                    Ganti Mode:
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleGantiMode('wali')}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                            mode === 'wali'
                                                ? 'bg-primary text-white'
                                                : 'bg-white text-gray-700'
                                        }`}
                                    >
                                        🏫 Wali
                                    </button>
                                    <button
                                        onClick={() => handleGantiMode('guru')}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                            mode === 'guru'
                                                ? 'bg-primary text-white'
                                                : 'bg-white text-gray-700'
                                        }`}
                                    >
                                        📚 Guru
                                    </button>
                                </div>
                            </div>
                        )}

                        {menuItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setShowMenu(false);
                                }}
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition ${
                                    isActive(item.path)
                                        ? 'bg-blue-50 text-primary'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <span>{item.icon}</span>
                                <span>{item.label}</span>
                            </button>
                        ))}
                        
                        <button
                            onClick={() => {
                                navigate('/profil');
                                setShowMenu(false);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                        >
                            <span>👤</span>
                            <span>Profil Saya</span>
                        </button>

                        <button
                            onClick={logout}
                            className="flex items-center gap-2 w-full px-3 py-2 mt-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                        >
                            <span>🚪</span>
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}