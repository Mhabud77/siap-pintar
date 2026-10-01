import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';

const BASE_URL = 'http://localhost:5000';

export default function DashboardMurid() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    useEffect(() => { loadDashboard(); }, []);

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const res = await api.get('/murid-dashboard/dashboard');
            setData(res.data.data);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Gagal memuat data' });
        }
        setLoading(false);
    };

    const handleAmbilMisi = async (misi_id, judul) => {
        if (!confirm(`Ambil misi "${judul}"?`)) return;
        try {
            await api.post('/misi/ambil', { misi_id });
            setMessage({ type: 'success', text: `✅ Misi "${judul}" berhasil diambil!` });
            loadDashboard();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ ' + (err.response?.data?.message || 'Gagal') });
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-100 p-6"><div className="max-w-5xl mx-auto"><div className="card text-center py-12">⏳ Memuat...</div></div></div>;
    if (!data) return <div className="min-h-screen bg-gray-100 p-6"><div className="max-w-5xl mx-auto"><div className="card bg-red-50 border-l-4 border-red-500"><p className="text-red-700">❌ Data tidak ditemukan</p></div></div></div>;

    const { murid, leaderboard_kelas, misi_tersedia, riwayat_perilaku, statistik_absensi, misi_selesai } = data;
    const podium = leaderboard_kelas.slice(0, 3);
    const others = leaderboard_kelas.slice(3);

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Dashboard Murid</h1>
                    <p className="text-gray-600 mt-1">Selamat datang, <strong>{murid.nama_lengkap}</strong>! Kelas {murid.nama_kelas}</p>
                </div>

                {message && (
                    <div className={`card mb-6 border-l-4 ${message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
                    </div>
                )}

                {/* POIN SAYA */}
                <div className="card mb-6 bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    <div className="text-center py-6">
                        <p className="text-sm opacity-90 mb-3">POIN SAYA BULAN INI</p>
                        <div className="inline-block bg-white bg-opacity-20 backdrop-blur rounded-2xl px-12 py-6 border-4 border-white border-opacity-30">
                            <p className="text-6xl font-bold">{murid.poin_bulan_ini}</p>
                            <p className="text-sm opacity-90 mt-1">POIN</p>
                        </div>
                        <div className="grid grid-cols-2 gap-6 mt-6 max-w-md mx-auto">
                            <div className="text-center">
                                <p className="text-sm opacity-90">Peringkat</p>
                                <p className="text-2xl font-bold">#{murid.peringkat}</p>
                                <p className="text-xs opacity-75">dari {murid.total_murid_kelas} murid</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm opacity-90">Poin Tahun Ini</p>
                                <p className="text-2xl font-bold">{murid.poin_tahun_ini}</p>
                                <p className="text-xs opacity-75">Akumulasi</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STATISTIK ABSENSI */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    <div className="card text-center py-3"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold">{statistik_absensi.total || 0}</p></div>
                    <div className="card text-center py-3 bg-green-50"><p className="text-xs text-green-700">Hadir</p><p className="text-2xl font-bold text-green-700">{statistik_absensi.hadir || 0}</p></div>
                    <div className="card text-center py-3 bg-yellow-50"><p className="text-xs text-yellow-700">Terlambat</p><p className="text-2xl font-bold text-yellow-700">{statistik_absensi.terlambat || 0}</p></div>
                    <div className="card text-center py-3 bg-blue-50"><p className="text-xs text-blue-700">Izin/Sakit</p><p className="text-2xl font-bold text-blue-700">{(statistik_absensi.izin || 0) + (statistik_absensi.sakit || 0)}</p></div>
                    <div className="card text-center py-3 bg-purple-50"><p className="text-xs text-purple-700">Misi Selesai</p><p className="text-2xl font-bold text-purple-700">{misi_selesai}</p></div>
                </div>

                {/* LEADERBOARD */}
                <div className="card mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">🏆 Leaderboard Kelas {murid.nama_kelas}</h2>
                    {podium.length === 3 && (
                        <div className="bg-gradient-to-b from-blue-500 to-purple-600 rounded-xl p-6 mb-4">
                            <div className="flex justify-center items-end gap-4">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 border-4 border-white">
                                        {podium[1].nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div className="text-2xl mb-1">🥈</div>
                                    <p className="text-white font-bold text-sm">{podium[1].nama_lengkap}</p>
                                    <p className="text-blue-100 text-xs">{podium[1].poin_bulan_ini} poin</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl mb-1">👑</div>
                                    <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-2 border-4 border-white">
                                        {podium[0].nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div className="text-2xl mb-1">🥇</div>
                                    <p className="text-white font-bold">{podium[0].nama_lengkap}</p>
                                    <p className="text-yellow-200 text-sm font-bold">{podium[0].poin_bulan_ini} poin</p>
                                </div>
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 border-4 border-white">
                                        {podium[2].nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div className="text-2xl mb-1">🥉</div>
                                    <p className="text-white font-bold text-sm">{podium[2].nama_lengkap}</p>
                                    <p className="text-blue-100 text-xs">{podium[2].poin_bulan_ini} poin</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        {others.map((siswa) => (
                            <div key={siswa.id} className={`flex justify-between items-center p-3 rounded-lg ${siswa.is_me ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-500 w-8">#{siswa.rank}</span>
                                    <span className={`font-medium ${siswa.is_me ? 'text-blue-700' : 'text-gray-700'}`}>
                                        {siswa.nama_lengkap}
                                        {siswa.is_me && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">SAYA</span>}
                                    </span>
                                </div>
                                <span className="font-bold text-primary">{siswa.poin_bulan_ini}</span>
                            </div>
                        ))}
                    </div>
                    <button onClick={() => navigate('/leaderboard')} className="text-primary hover:underline text-sm mt-4">Lihat Semua Peringkat →</button>
                </div>

                {/* MISI TERSEDIA */}
                {misi_tersedia.length > 0 && (
                    <div className="card mb-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Misi Tersedia</h2>
                        <div className="space-y-3">
                            {misi_tersedia.map((misi) => (
                                <div key={misi.id} className="flex justify-between items-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-800">🎯 {misi.judul}</p>
                                        <p className="text-sm text-gray-600 mt-1">{misi.deskripsi}</p>
                                        <span className="inline-block mt-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">{misi.kategori}</span>
                                    </div>
                                    <div className="text-right ml-4">
                                        <p className="text-2xl font-bold text-green-600">+{misi.poin_reward}</p>
                                        <p className="text-xs text-gray-500">poin</p>
                                        <button onClick={() => handleAmbilMisi(misi.id, misi.judul)} className="btn-primary mt-2 text-sm">Ambil Misi</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* RIWAYAT PERILAKU */}
                <div className="card mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">📜 Riwayat Perilaku</h2>
                    {riwayat_perilaku.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Belum ada riwayat</p>
                    ) : (
                        <div className="space-y-2">
                            {riwayat_perilaku.map((p) => (
                                <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg border-l-4 ${p.jenis === 'positif' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{p.deskripsi}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">📅 {new Date(p.tanggal).toLocaleDateString('id-ID')} • Dicatat oleh: {p.guru_nama}</p>
                                    </div>
                                    <span className={`text-lg font-bold ${p.poin > 0 ? 'text-green-600' : 'text-red-600'}`}>{p.poin > 0 ? '+' : ''}{p.poin}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MENU CEPAT */}
                <div className="card">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">⚡ Menu Cepat</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button onClick={() => navigate('/misi')} className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">🎯</div>
                            <div className="font-bold text-sm">Misi Kebaikan</div>
                        </button>
                        <button onClick={() => navigate('/leaderboard')} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">🏆</div>
                            <div className="font-bold text-sm">Leaderboard</div>
                        </button>
                        <button onClick={() => navigate('/murid/kelas')} className="bg-green-50 hover:bg-green-100 text-green-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">🏫</div>
                            <div className="font-bold text-sm">Data Kelas</div>
                        </button>
                        <button onClick={() => navigate('/murid/bk')} className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">💬</div>
                            <div className="font-bold text-sm">Konseling</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}