import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import StatCard from '../components/StatCard';
import GrafikKehadiran from '../components/GrafikKehadiran';
import LeaderboardKelas from '../components/LeaderboardKelas';

export default function DashboardKepsek() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [statistik, setStatistik] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Laporan
    const [jenisLaporan, setJenisLaporan] = useState('bulanan');

    useEffect(() => {
        loadStatistik();
    }, []);

    const loadStatistik = async () => {
        setLoading(true);
        try {
            const res = await api.get('/dashboard/sekolah');
            setStatistik(res.data.data);
            setError('');
        } catch (err) {
            console.error('Error load statistik:', err);
            setError('Gagal memuat statistik. Coba refresh halaman.');
        }
        setLoading(false);
    };

    const handleDownloadLaporan = () => {
        const token = localStorage.getItem('token');
        const url = `http://localhost:5000/api/dashboard/laporan-agregat/download?jenis=${jenisLaporan}&token=${token}`;
        window.open(url, '_blank');
    };

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
                        Dashboard Kepala Sekolah
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Selamat datang, <strong>{user?.nama_lengkap}</strong>! 
                        {' '}Berikut ringkasan aktivitas sekolah.
                    </p>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="card bg-red-50 border-l-4 border-red-500 mb-6">
                        <p className="text-red-700">❌ {error}</p>
                    </div>
                )}

                {statistik && (
                    <>
                        {/* ============================================
                            STATISTIK UMUM (4 KARTU)
                        ============================================ */}
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

                        {/* ============================================
                            STATISTIK POIN SEKOLAH
                        ============================================ */}
                        <div className="card mb-6">
                            <h2 className="text-lg font-bold text-gray-800 mb-4">
                                📊 Statistik Sekolah Bulan Ini
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                                    <p className="text-xs text-blue-700 font-semibold uppercase">
                                        Rata-rata Poin Sekolah
                                    </p>
                                    <p className="text-3xl font-bold text-blue-700 mt-1">
                                        {statistik.poin_sekolah.rata_rata}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Dari 662 murid
                                    </p>
                                </div>

                                <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
                                    <p className="text-xs text-green-700 font-semibold uppercase">
                                        Murid Poin &gt; 100
                                    </p>
                                    <p className="text-3xl font-bold text-green-700 mt-1">
                                        {statistik.poin_sekolah.poin_diatas_100}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Murid berprestasi
                                    </p>
                                </div>

                                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                                    <p className="text-xs text-red-700 font-semibold uppercase">
                                        Murid Poin &lt; 100
                                    </p>
                                    <p className="text-3xl font-bold text-red-700 mt-1">
                                        {statistik.poin_sekolah.poin_dibawah_100}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Perlu perhatian
                                    </p>
                                </div>

                                <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4">
                                    <p className="text-xs text-purple-700 font-semibold uppercase">
                                        Misi Selesai
                                    </p>
                                    <p className="text-3xl font-bold text-purple-700 mt-1">
                                        {statistik.misi_selesai_bulan_ini}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Bulan ini
                                    </p>
                                </div>
                            </div>

                            {/* Info Tambahan */}
                            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Poin Tertinggi</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {statistik.poin_sekolah.poin_tertinggi}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Poin Terendah</p>
                                    <p className="text-xl font-bold text-red-600">
                                        {statistik.poin_sekolah.poin_terendah}
                                    </p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Poin Pas 100</p>
                                    <p className="text-xl font-bold text-gray-600">
                                        {statistik.poin_sekolah.poin_pas_100}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ============================================
                            GRAFIK + LEADERBOARD KELAS
                        ============================================ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                            <GrafikKehadiran data={statistik.grafik_kehadiran || []} />
                            <LeaderboardKelas data={statistik.leaderboard_kelas || []} />
                        </div>

                        {/* ============================================
                            PELANGGARAN TERBANYAK
                        ============================================ */}
                        {statistik.pelanggaran_terbanyak && statistik.pelanggaran_terbanyak.length > 0 && (
                            <div className="card mb-6">
                                <h3 className="text-lg font-bold text-gray-800 mb-4">
                                    ⚠️ Pelanggaran Terbanyak Bulan Ini
                                </h3>
                                <div className="space-y-2">
                                    {statistik.pelanggaran_terbanyak.map((p, i) => (
                                        <div key={i} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                                            <span className="text-sm text-gray-700">
                                                {i + 1}. {p.kategori}
                                            </span>
                                            <span className="font-bold text-red-700">
                                                {p.jumlah} kasus
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ============================================
                            MENU LAPORAN
                        ============================================ */}
                        <div className="card">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">
                                📄 Laporan Sekolah
                            </h3>
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setJenisLaporan('bulanan')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                                            jenisLaporan === 'bulanan'
                                                ? 'bg-white shadow text-primary'
                                                : 'text-gray-600'
                                        }`}
                                    >
                                        📅 Bulanan
                                    </button>
                                    <button
                                        onClick={() => setJenisLaporan('semester')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                                            jenisLaporan === 'semester'
                                                ? 'bg-white shadow text-primary'
                                                : 'text-gray-600'
                                        }`}
                                    >
                                        📆 Semester
                                    </button>
                                    <button
                                        onClick={() => setJenisLaporan('tahunan')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                                            jenisLaporan === 'tahunan'
                                                ? 'bg-white shadow text-primary'
                                                : 'text-gray-600'
                                        }`}
                                    >
                                        📊 Tahunan
                                    </button>
                                </div>

                                <button
                                    onClick={handleDownloadLaporan}
                                    className="btn-primary"
                                >
                                    📥 Download Laporan
                                </button>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs text-gray-500">
                                    💡 Laporan berisi rekap absensi, perilaku, dan misi 
                                    seluruh sekolah untuk periode yang dipilih.
                                </p>
                            </div>
                        </div>
                       {/* ============================================
                        MENU CEPAT - DATA SEKOLAH
                        ============================================ */}
                        <div className="card mt-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">
                                ⚡ Menu Cepat
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <button
                                    onClick={() => navigate('/kepsek/guru')}
                                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg p-4 hover:shadow-lg transition text-left"
                                >
                                    <div className="text-3xl mb-2">👨‍🏫</div>
                                    <div className="font-bold text-sm">Data Guru</div>
                                    <div className="text-xs opacity-70 mt-1">
                                        Lihat semua guru & wali kelas
                                    </div>
                                </button>

                                <button
                                    onClick={() => navigate('/kepsek/murid')}
                                    className="bg-green-50 hover:bg-green-100 text-green-700 rounded-lg p-4 hover:shadow-lg transition text-left"
                                >
                                    <div className="text-3xl mb-2">👨‍🎓</div>
                                    <div className="font-bold text-sm">Data Murid</div>
                                    <div className="text-xs opacity-70 mt-1">
                                        Lihat 662 murid dengan filter kelas
                                    </div>
                                </button>

                                <button
                                    onClick={() => navigate('/kepsek/kelas')}
                                    className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg p-4 hover:shadow-lg transition text-left"
                                >
                                    <div className="text-3xl mb-2">🏫</div>
                                    <div className="font-bold text-sm">Data Kelas</div>
                                    <div className="text-xs opacity-70 mt-1">
                                        Lihat 21 kelas & wali kelas
                                    </div>
                                </button>
                            </div>
                        </div> 
                    </>
                )}
            </div>
        </div>
    );
}