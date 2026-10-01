import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function DashboardGuruBK() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [kelasList, setKelasList] = useState([]);
    const [statistik, setStatistik] = useState(null);
    const [leaderboard, setLeaderboard] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [kelasRes, statRes, lbRes] = await Promise.all([
                api.get('/wali-kelas/kelas-bk'),
                api.get('/bk/statistik'),
                api.get('/wali-kelas/leaderboard-bk')
            ]);
            setKelasList(kelasRes.data.data || []);
            setStatistik(statRes.data.data);
            setLeaderboard(lbRes.data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    if (loading) return <div className="min-h-screen bg-gray-100 p-6"><div className="max-w-5xl mx-auto"><div className="card text-center py-12">⏳ Memuat...</div></div></div>;

    const totalMurid = kelasList.reduce((sum, k) => sum + k.jumlah_murid, 0);
    const podium = leaderboard?.top_murid?.slice(0, 3) || [];
    const others = leaderboard?.top_murid?.slice(3) || [];

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">💼 Dashboard Guru BK</h1>
                    <p className="text-gray-600 mt-1">Selamat datang, <strong>{user?.nama_lengkap}</strong></p>
                </div>

                {/* STATISTIK */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card border-l-4 border-blue-500">
                        <p className="text-xs text-gray-500">Kelas Diampu</p>
                        <p className="text-3xl font-bold text-blue-700">{kelasList.length}</p>
                    </div>
                    <div className="card border-l-4 border-green-500">
                        <p className="text-xs text-gray-500">Total Murid</p>
                        <p className="text-3xl font-bold text-green-700">{totalMurid}</p>
                    </div>
                    <div className="card border-l-4 border-yellow-500">
                        <p className="text-xs text-gray-500">Pesan Menunggu</p>
                        <p className="text-3xl font-bold text-yellow-700">{statistik?.menunggu || 0}</p>
                    </div>
                    <div className="card border-l-4 border-purple-500">
                        <p className="text-xs text-gray-500">Total Pesan</p>
                        <p className="text-3xl font-bold text-purple-700">{statistik?.total || 0}</p>
                    </div>
                </div>

                {/* MENU CEPAT */}
                <div className="card mb-6">
                    <h3 className="font-bold mb-4">⚡ Menu Cepat</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <button onClick={() => navigate('/guru-bk/kelas')} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">🏫</div>
                            <div className="font-bold text-sm">Data Kelas</div>
                            <div className="text-xs opacity-70 mt-1">{kelasList.length} kelas</div>
                        </button>
                        <button onClick={() => navigate('/guru/pesan-bk')} className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">💬</div>
                            <div className="font-bold text-sm">Pesan BK</div>
                            <div className="text-xs opacity-70 mt-1">{statistik?.menunggu || 0} menunggu</div>
                        </button>
                        <button onClick={() => navigate('/scanner')} className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">📷</div>
                            <div className="font-bold text-sm">Scanner</div>
                            <div className="text-xs opacity-70 mt-1">Scan QR absensi</div>
                        </button>
                        <button onClick={() => navigate('/perilaku')} className="bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">📝</div>
                            <div className="font-bold text-sm">Catat Perilaku</div>
                            <div className="text-xs opacity-70 mt-1">Catat perilaku murid</div>
                        </button>
                        <button onClick={() => navigate('/leaderboard')} className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">🏆</div>
                            <div className="font-bold text-sm">Leaderboard</div>
                            <div className="text-xs opacity-70 mt-1">Peringkat sekolah</div>
                        </button>
                        <button onClick={() => navigate('/guru-bk/laporan')} className="bg-green-50 hover:bg-green-100 text-green-700 rounded-lg p-4 text-left">
                            <div className="text-3xl mb-2">📄</div>
                            <div className="font-bold text-sm">Laporan BK</div>
                            <div className="text-xs opacity-70 mt-1">Rekap konseling</div>
                        </button>
                    </div>
                </div>

                {/* LEADERBOARD SECTION */}
                {leaderboard && leaderboard.top_murid.length > 0 && (
                    <div className="card mb-6">
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h3 className="text-xl font-bold text-gray-800">
                                🏆 Leaderboard Murid (Kelas Anda)
                            </h3>
                            <button onClick={() => navigate('/leaderboard')} className="text-primary hover:underline text-sm">
                                Lihat Semua →
                            </button>
                        </div>

                        {/* PODIUM TOP 3 */}
                        {podium.length === 3 && (
                            <div className="bg-gradient-to-b from-blue-500 to-purple-600 rounded-xl p-6 mb-4">
                                <div className="flex justify-center items-end gap-4">
                                    {/* JUARA 2 */}
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 border-4 border-white overflow-hidden">
                                            {podium[1].foto_profil ? (
                                                <img src={`${BASE_URL}${podium[1].foto_profil}`} alt={podium[1].nama_lengkap} className="w-full h-full object-cover" />
                                            ) : (
                                                podium[1].nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                                            )}
                                        </div>
                                        <div className="text-2xl mb-1">🥈</div>
                                        <p className="text-white font-bold text-sm">{podium[1].nama_lengkap}</p>
                                        <p className="text-blue-100 text-xs">{podium[1].nama_kelas}</p>
                                        <p className="text-blue-100 text-xs font-bold">{podium[1].poin_bulan_ini} poin</p>
                                    </div>

                                    {/* JUARA 1 */}
                                    <div className="text-center">
                                        <div className="text-3xl mb-1">👑</div>
                                        <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-2 border-4 border-white overflow-hidden">
                                            {podium[0].foto_profil ? (
                                                <img src={`${BASE_URL}${podium[0].foto_profil}`} alt={podium[0].nama_lengkap} className="w-full h-full object-cover" />
                                            ) : (
                                                podium[0].nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                                            )}
                                        </div>
                                        <div className="text-2xl mb-1">🥇</div>
                                        <p className="text-white font-bold">{podium[0].nama_lengkap}</p>
                                        <p className="text-yellow-200 text-xs">{podium[0].nama_kelas}</p>
                                        <p className="text-yellow-200 text-sm font-bold">{podium[0].poin_bulan_ini} poin</p>
                                    </div>

                                    {/* JUARA 3 */}
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-2 border-4 border-white overflow-hidden">
                                            {podium[2].foto_profil ? (
                                                <img src={`${BASE_URL}${podium[2].foto_profil}`} alt={podium[2].nama_lengkap} className="w-full h-full object-cover" />
                                            ) : (
                                                podium[2].nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                                            )}
                                        </div>
                                        <div className="text-2xl mb-1">🥉</div>
                                        <p className="text-white font-bold text-sm">{podium[2].nama_lengkap}</p>
                                        <p className="text-blue-100 text-xs">{podium[2].nama_kelas}</p>
                                        <p className="text-blue-100 text-xs font-bold">{podium[2].poin_bulan_ini} poin</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LIST 4-10 */}
                        {others.length > 0 && (
                            <div className="space-y-2">
                                {others.map((siswa) => (
                                    <div key={siswa.id} className="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-gray-500 w-8">#{siswa.rank}</span>
                                            {siswa.foto_profil ? (
                                                <img src={`${BASE_URL}${siswa.foto_profil}`} alt={siswa.nama_lengkap} className="w-8 h-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    {siswa.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-gray-800">{siswa.nama_lengkap}</p>
                                                <p className="text-xs text-gray-500">{siswa.nama_kelas}</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-primary">{siswa.poin_bulan_ini}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* LEADERBOARD PER KELAS */}
                {leaderboard && leaderboard.per_kelas.length > 0 && (
                    <div className="card mb-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">
                            📊 Ranking Kelas yang Anda Ampu
                        </h3>
                        <div className="space-y-2">
                            {leaderboard.per_kelas.map((k, i) => (
                                <div key={k.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl w-8 text-center">
                                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                                        </span>
                                        <div>
                                            <p className="font-bold text-gray-800">Kelas {k.nama_kelas}</p>
                                            <p className="text-xs text-gray-500">
                                                {k.jumlah_murid} murid • Poin tertinggi: {k.poin_tertinggi || 0}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-primary">{k.rata_poin}</p>
                                        <p className="text-xs text-gray-500">rata-rata</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* KELAS DIAMPU */}
                <div className="card">
                    <h3 className="font-bold mb-4">🏫 Kelas yang Anda Ampu</h3>
                    {kelasList.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Belum ada kelas yang di-assign ke Anda</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {kelasList.map((k) => (
                                <div key={k.id} className="border rounded-lg p-4 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">{k.nama_kelas}</span>
                                        <span className="text-xs text-gray-500">{k.jumlah_murid} murid</span>
                                    </div>
                                    <p className="text-sm text-gray-600">Rata-rata Poin: <strong>{k.rata_poin}</strong></p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}