import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const BASE_URL = 'http://localhost:5000';

export default function DashboardOrangTua() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedAnak, setSelectedAnak] = useState(null);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const res = await api.get('/orangtua/dashboard');
            if (res.data.info?.has_anak) {
                setData(res.data.data);
                setSelectedAnak(res.data.data.anak);
            } else {
                setError(res.data.info?.message || 'Anda belum memiliki anak yang terdaftar');
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Gagal memuat dashboard');
        }
        setLoading(false);
    };

    const handleGantiAnak = async (anak) => {
        setSelectedAnak(anak);
        // Kalau mau load detail anak spesifik, panggil endpoint /dashboard/:murid_id
        // Untuk sekarang, pakai data yang sudah ada
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'hadir': return 'text-green-600';
            case 'terlambat': return 'text-red-600';
            case 'izin': return 'text-yellow-600';
            case 'sakit': return 'text-blue-600';
            case 'alpa': return 'text-gray-600';
            case 'positif': return 'text-green-600';
            case 'negatif': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const getNotifEmoji = (tipe) => {
        switch (tipe) {
            case 'absensi': return '📥';
            case 'perilaku': return '🌟';
            default: return '🔔';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="card text-center py-12">
                        <div className="text-3xl">⏳</div>
                        <p className="text-gray-600 mt-2">Memuat dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="card bg-yellow-50 border-l-4 border-yellow-500">
                        <div className="flex items-start gap-3">
                            <div className="text-4xl">⚠️</div>
                            <div>
                                <h2 className="text-xl font-bold text-yellow-800">Informasi</h2>
                                <p className="text-yellow-700 mt-1">{error}</p>
                                <button
                                    onClick={logout}
                                    className="btn-danger mt-4"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const { statistik, grafik_bulanan, notifikasi, semua_anak } = data;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-6xl mx-auto">
                {/* ============================================ */}
                {/* HEADER */}
                {/* ============================================ */}
                <div className="card mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">
                                👨‍👩‍👧 Dashboard Orang Tua
                            </h1>
                            <p className="text-blue-100 mt-1">
                                Selamat datang, <strong>{user?.nama_lengkap}</strong>
                            </p>
                            <p className="text-blue-100 text-sm">
                                Orang Tua dari: <strong>{selectedAnak?.nama_lengkap}</strong> ({selectedAnak?.nama_kelas})
                            </p>
                        </div>
                    </div>

                    {/* SELECTOR ANAK (kalau lebih dari 1) */}
                    {semua_anak && semua_anak.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-white border-opacity-30">
                            <p className="text-sm text-blue-100 mb-2">
                                Pilih Anak ({semua_anak.length}):
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                {semua_anak.map((anak) => (
                                    <button
                                        key={anak.murid_id}
                                        onClick={() => handleGantiAnak(anak)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                            selectedAnak?.murid_id === anak.murid_id
                                                ? 'bg-white text-purple-600 shadow-lg'
                                                : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                        }`}
                                    >
                                        {anak.nama_lengkap} ({anak.nama_kelas})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ============================================ */}
                {/* 4 KARTU STATISTIK */}
                {/* ============================================ */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {/* Poin Bulan Ini */}
                    <div className="card border-l-4 border-blue-500 hover:shadow-lg transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">
                                    Poin Bulan Ini
                                </p>
                                <p className="text-4xl font-bold text-blue-700 mt-1">
                                    {statistik.poin_bulan_ini}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Total tahun: {statistik.poin_tahun_ini}
                                </p>
                            </div>
                            <div className="text-4xl">⭐</div>
                        </div>
                    </div>

                    {/* Kehadiran */}
                    <div className="card border-l-4 border-green-500 hover:shadow-lg transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">
                                    Kehadiran Bulan Ini
                                </p>
                                <p className="text-4xl font-bold text-green-700 mt-1">
                                    {statistik.persen_kehadiran}%
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {statistik.total_hadir} dari {statistik.total_hari} hari
                                </p>
                            </div>
                            <div className="text-4xl">📅</div>
                        </div>
                    </div>

                    {/* Perilaku Positif */}
                    <div className="card border-l-4 border-purple-500 hover:shadow-lg transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">
                                    Perilaku Positif
                                </p>
                                <p className="text-4xl font-bold text-purple-700 mt-1">
                                    {statistik.perilaku_positif}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {statistik.perilaku_negatif} negatif
                                </p>
                            </div>
                            <div className="text-4xl">🌟</div>
                        </div>
                    </div>

                    {/* Misi Selesai */}
                    <div className="card border-l-4 border-yellow-500 hover:shadow-lg transition">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">
                                    Misi Selesai
                                </p>
                                <p className="text-4xl font-bold text-yellow-700 mt-1">
                                    {statistik.misi_selesai}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Total misi divalidasi
                                </p>
                            </div>
                            <div className="text-4xl">🎯</div>
                        </div>
                    </div>
                </div>

                {/* ============================================ */}
                {/* MENU NAVIGASI */}
                {/* ============================================ */}
                <div className="card mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        ⚡ Menu Cepat
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => navigate(`/orangtua/absensi/${selectedAnak?.murid_id}`)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg p-4 text-left transition"
                        >
                            <div className="text-3xl mb-2">📅</div>
                            <div className="font-bold text-sm">Absensi</div>
                            <div className="text-xs opacity-70 mt-1">Detail kehadiran</div>
                        </button>

                        <button
                            onClick={() => navigate(`/orangtua/perilaku/${selectedAnak?.murid_id}`)}
                            className="bg-green-50 hover:bg-green-100 text-green-700 rounded-lg p-4 text-left transition"
                        >
                            <div className="text-3xl mb-2">📝</div>
                            <div className="font-bold text-sm">Perilaku</div>
                            <div className="text-xs opacity-70 mt-1">Catatan perilaku</div>
                        </button>

                        <button
                            onClick={() => navigate(`/orangtua/misi/${selectedAnak?.murid_id}`)}
                            className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg p-4 text-left transition"
                        >
                            <div className="text-3xl mb-2">🎯</div>
                            <div className="font-bold text-sm">Misi</div>
                            <div className="text-xs opacity-70 mt-1">Progress misi</div>
                        </button>

                        <button
                            onClick={() => navigate(`/orangtua/leaderboard/${selectedAnak?.murid_id}`)}
                            className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg p-4 text-left transition"
                        >
                            <div className="text-3xl mb-2">🏆</div>
                            <div className="font-bold text-sm">Leaderboard</div>
                            <div className="text-xs opacity-70 mt-1">Peringkat anak</div>
                        </button>

                        <button
                            onClick={() => navigate(`/orangtua/profil/${selectedAnak?.murid_id}`)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg p-4 text-left transition"
                        >
                            <div className="text-3xl mb-2">👤</div>
                            <div className="font-bold text-sm">Profil Anak</div>
                            <div className="text-xs opacity-70 mt-1">Info lengkap</div>
                        </button>

                        <button
                            onClick={() => navigate(`/orangtua/kontak/${selectedAnak?.murid_id}`)}
                            className="bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg p-4 text-left transition"
                        >
                            <div className="text-3xl mb-2">💬</div>
                            <div className="font-bold text-sm">Kontak Guru</div>
                            <div className="text-xs opacity-70 mt-1">Wali kelas & BK</div>
                        </button>

                        <button
                            onClick={() => navigate('/orangtua/pengaturan')}
                            className="bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg p-4 text-left transition"
                        >
                            <div className="text-3xl mb-2">⚙️</div>
                            <div className="font-bold text-sm">Pengaturan</div>
                            <div className="text-xs opacity-70 mt-1">Notifikasi WA</div>
                        </button>

                        <button
                            onClick={() => navigate('/laporan')}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg p-4 text-left transition"
                        >
                            <div className="text-3xl mb-2">📄</div>
                            <div className="font-bold text-sm">Laporan</div>
                            <div className="text-xs opacity-70 mt-1">Otomatis</div>
                        </button>
                    </div>
                </div>

                {/* ============================================ */}
                {/* GRAFIK POIN BULANAN */}
                {/* ============================================ */}
                <div className="card mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">
                            📊 Grafik Poin Bulanan
                        </h2>
                        <span className="text-xs text-gray-500">
                            6 bulan terakhir
                        </span>
                    </div>

                    {grafik_bulanan && grafik_bulanan.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart
                                data={grafik_bulanan}
                                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="bulan"
                                    stroke="#6b7280"
                                    style={{ fontSize: '12px' }}
                                />
                                <YAxis
                                    domain={[80, 130]}
                                    stroke="#6b7280"
                                    style={{ fontSize: '12px' }}
                                />
                                <Tooltip
                                    formatter={(value) => [`${value} poin`, 'Poin']}
                                    labelFormatter={(label) => `Bulan: ${label}`}
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        padding: '8px'
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="poin"
                                    stroke="#2563eb"
                                    strokeWidth={3}
                                    dot={{ fill: '#2563eb', r: 6 }}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            Belum ada data grafik
                        </div>
                    )}
                </div>

                {/* ============================================ */}
                {/* NOTIFIKASI TERBARU */}
                {/* ============================================ */}
                <div className="card mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">
                            🔔 Notifikasi Terbaru
                        </h2>
                        <span className="text-xs text-gray-500">
                            {notifikasi?.length || 0} notifikasi
                        </span>
                    </div>

                    {notifikasi && notifikasi.length > 0 ? (
                        <div className="space-y-2">
                            {notifikasi.map((notif, index) => (
                                <div
                                    key={`${notif.tipe}-${notif.id}-${index}`}
                                    className={`p-3 rounded-lg border-l-4 ${
                                        notif.poin > 0
                                            ? 'bg-green-50 border-green-500'
                                            : notif.poin < 0
                                            ? 'bg-red-50 border-red-500'
                                            : 'bg-gray-50 border-gray-400'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-800">
                                                {getNotifEmoji(notif.tipe)} {notif.judul}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                📅 {new Date(notif.tanggal).toLocaleDateString('id-ID', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                                {notif.waktu && ` • 🕐 ${String(notif.waktu).slice(0, 5)}`}
                                            </p>
                                        </div>
                                        {notif.poin !== null && notif.poin !== undefined && (
                                            <span className={`text-lg font-bold ${getStatusColor(notif.poin > 0 ? 'positif' : 'negatif')}`}>
                                                {notif.poin > 0 ? '+' : ''}{notif.poin}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            Belum ada notifikasi
                        </div>
                    )}
                </div>

                {/* ============================================ */}
                {/* TOMBOL LAPORAN */}
                {/* ============================================ */}
                <div className="card">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">📄 Laporan</h2>
                    <button
                        onClick={() => navigate('/laporan')}
                        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition"
                    >
                        📄 Buka Laporan Anak
                    </button>
                </div>
            </div>
        </div>
    );
}