import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import StatCard from '../components/StatCard';
import GrafikKehadiran from '../components/GrafikKehadiran';

export default function DashboardAdmin() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [statistik, setStatistik] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStatistik();
    }, []);

    const loadStatistik = async () => {
        setLoading(true);
        try {
            const res = await api.get('/dashboard/statistik');
            setStatistik(res.data.data);
            setError('');
        } catch (err) {
            console.error('Error load statistik:', err);
            setError('Gagal memuat statistik. Coba refresh halaman.');
        }
        setLoading(false);
    };

    const menuCepat = [
        { icon: '👨‍🏫', label: 'Data Guru', path: '/admin/data-guru', color: 'bg-blue-100 text-blue-700' },
        { icon: '👨‍🎓', label: 'Data Murid', path: '/admin/data-murid', color: 'bg-green-100 text-green-700' },
        { icon: '🏫', label: 'Data Kelas', path: '/admin/data-kelas', color: 'bg-purple-100 text-purple-700' },
        { icon: '👥', label: 'Kelola User', path: '/admin/user', color: 'bg-indigo-100 text-indigo-700' },
        { icon: '📥', label: 'Download User', path: '/admin/download-user', color: 'bg-cyan-100 text-cyan-700' },
        { icon: '🔲', label: 'Generate QR', path: '/admin/qr-code', color: 'bg-emerald-100 text-emerald-700' },
        { icon: '🎴', label: 'Kartu Siswa', path: '/admin/kartu-siswa', color: 'bg-teal-100 text-teal-700' },
        { icon: '⭐', label: 'Konfigurasi Poin', path: '/admin/poin', color: 'bg-yellow-100 text-yellow-700' },
        { icon: '📄', label: 'Laporan', path: '/laporan', color: 'bg-pink-100 text-pink-700' },
        { icon: '🎯', label: 'Data Misi', path: '/admin/misi', color: 'bg-orange-100 text-orange-700' },
        { icon: '⚙️', label: 'Pengaturan Absensi', path: '/admin/pengaturan-absensi', color: 'bg-gray-100 text-gray-700' },  // ← TAMBAH INI
        { icon: '💾', label: 'Backup Data', path: '/admin/backup', color: 'bg-red-100 text-red-700' },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="card text-center py-12">
                        <div className="text-3xl">⏳</div>
                        <p className="text-gray-600 mt-2">Memuat dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* ============================================
                    WELCOME HEADER
                ============================================ */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Dashboard Admin
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Selamat datang, <strong>{user?.nama_lengkap}</strong>! 
                        {' '}Berikut ringkasan aktivitas sekolah hari ini.
                    </p>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="card bg-red-50 border-l-4 border-red-500 mb-6">
                        <p className="text-red-700">❌ {error}</p>
                    </div>
                )}

                {/* ============================================
                    KARTU STATISTIK
                ============================================ */}
                {statistik && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            icon="👨‍🎓"
                            label="Total Murid"
                            value={statistik.total_murid}
                            subtitle="Siswa aktif"
                            color="blue"
                        />
                        <StatCard
                            icon="👨‍🏫"
                            label="Total Guru"
                            value={statistik.total_guru}
                            subtitle="Guru & staf"
                            color="green"
                        />
                        <StatCard
                            icon="✅"
                            label="Kehadiran Hari Ini"
                            value={`${statistik.kehadiran_hari_ini}%`}
                            subtitle={`${statistik.kehadiran_detail?.total_hadir || 0} dari ${statistik.kehadiran_detail?.total_absen || 0} murid`}
                            color={statistik.kehadiran_hari_ini >= 90 ? 'green' : 'yellow'}
                        />
                        <StatCard
                            icon="⚠️"
                            label="Pelanggaran"
                            value={statistik.pelanggaran_bulan_ini}
                            subtitle="Bulan ini"
                            color="red"
                        />
                    </div>
                )}

                {/* ============================================
                    GRAFIK KEHADIRAN
                ============================================ */}
                {statistik && (
                    <div className="mb-6">
                        <GrafikKehadiran data={statistik.grafik_kehadiran || []} />
                    </div>
                )}

                {/* ============================================
                    MENU CEPAT
                ============================================ */}
                <div className="card">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                        ⚡ Menu Cepat
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {menuCepat.map((menu, i) => (
                            <button
                                key={i}
                                onClick={() => navigate(menu.path)}
                                className={`${menu.color} rounded-lg p-4 hover:shadow-lg transition text-left`}
                            >
                                <div className="text-3xl mb-2">{menu.icon}</div>
                                <div className="font-bold text-sm">
                                    {menu.label}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ============================================
                    INFO TAMBAHAN
                ============================================ */}
                {statistik && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="card">
                            <h4 className="font-bold text-gray-800 mb-3">
                                📊 Ringkasan Kehadiran Hari Ini
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total Absen</span>
                                    <span className="font-bold">{statistik.kehadiran_detail?.total_absen || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Hadir</span>
                                    <span className="font-bold text-green-600">
                                        {statistik.kehadiran_detail?.total_hadir || 0}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Terlambat</span>
                                    <span className="font-bold text-red-600">
                                        {statistik.kehadiran_detail?.total_terlambat || 0}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h4 className="font-bold text-gray-800 mb-3">
                                🎯 Misi Kebaikan
                            </h4>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Misi Aktif</span>
                                    <span className="font-bold text-primary">
                                        {statistik.total_misi_aktif || 0}
                                    </span>
                                </div>
                                <button
                                    onClick={() => navigate('/validasi-misi')}
                                    className="btn-primary w-full mt-2 text-sm"
                                >
                                    Lihat Validasi Misi
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}