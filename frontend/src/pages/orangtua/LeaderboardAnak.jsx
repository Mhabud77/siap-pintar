import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function LeaderboardAnak() {
    const navigate = useNavigate();
    const { murid_id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, [murid_id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/orangtua/leaderboard/${murid_id}`);
            setData(res.data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    if (loading) return <div className="p-6 text-center">⏳ Memuat...</div>;
    if (!data) return <div className="p-6 text-center">Data tidak ditemukan</div>;

    const podium = data.top10.slice(0, 3);
    const others = data.top10.slice(3);

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/orangtua')} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali
                </button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">🏆 Leaderboard Anak</h1>

                {/* PERINGKAT ANAK */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="card bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                        <p className="text-sm opacity-90">Peringkat di Kelas {data.kelas.nama_kelas}</p>
                        <p className="text-5xl font-bold">#{data.peringkat_kelas}</p>
                        <p className="text-sm opacity-90">dari {data.total_kelas} murid</p>
                    </div>
                    <div className="card bg-gradient-to-r from-green-500 to-emerald-600 text-white">
                        <p className="text-sm opacity-90">Peringkat di Sekolah</p>
                        <p className="text-5xl font-bold">#{data.peringkat_sekolah}</p>
                        <p className="text-sm opacity-90">dari {data.total_sekolah} murid</p>
                    </div>
                </div>

                {/* PODIUM */}
                {podium.length === 3 && (
                    <div className="bg-gradient-to-b from-blue-500 to-purple-600 rounded-2xl p-6 mb-6">
                        <h2 className="text-white font-bold text-center text-lg mb-4">Top 3 Kelas</h2>
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

                {/* LIST 4-10 */}
                <div className="card">
                    <h2 className="font-bold text-lg mb-4">Top 10 Kelas</h2>
                    <div className="space-y-2">
                        {others.map((m) => (
                            <div key={m.id} className={`flex justify-between items-center p-3 rounded-lg ${
                                m.id === parseInt(murid_id) ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50'
                            }`}>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-500 w-8">#{data.top10.indexOf(m) + 1}</span>
                                    {m.foto_profil ? (
                                        <img src={`${BASE_URL}${m.foto_profil}`} alt={m.nama_lengkap} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                            {m.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                        </div>
                                    )}
                                    <span className="font-medium">{m.nama_lengkap}</span>
                                    {m.id === parseInt(murid_id) && (
                                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">ANAK ANDA</span>
                                    )}
                                </div>
                                <span className="font-bold text-primary">{m.poin_bulan_ini}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}