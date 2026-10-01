import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function MisiAnak() {
    const navigate = useNavigate();
    const { murid_id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => { loadData(); }, [murid_id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/orangtua/misi/${murid_id}`);
            setData(res.data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const getStatusBadge = (status) => {
        const badges = {
            menunggu: 'bg-yellow-100 text-yellow-700',
            divalidasi: 'bg-green-100 text-green-700',
            ditolak: 'bg-red-100 text-red-700'
        };
        return badges[status] || 'bg-gray-100';
    };

    if (loading) return <div className="p-6 text-center">⏳ Memuat...</div>;
    if (!data) return <div className="p-6 text-center">Data tidak ditemukan</div>;

    const filteredMisi = filterStatus 
        ? data.misi.filter(m => m.status === filterStatus) 
        : data.misi;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => navigate('/orangtua')} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali
                </button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">🎯 Misi Anak</h1>

                {/* PROGRESS */}
                <div className="card mb-6">
                    <h2 className="font-bold text-lg mb-3">Progress Misi</h2>
                    <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                            className="h-6 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${data.statistik.progress_persen}%`, minWidth: data.statistik.progress_persen > 0 ? '40px' : '0' }}
                        >
                            {data.statistik.progress_persen >= 10 && (
                                <span className="text-white text-xs font-bold">{data.statistik.progress_persen}%</span>
                            )}
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                        <strong>{data.statistik.divalidasi}</strong> dari <strong>{data.statistik.total}</strong> misi selesai
                    </p>
                </div>

                {/* STATISTIK */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card border-l-4 border-green-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Divalidasi</p>
                        <p className="text-3xl font-bold text-green-700">{data.statistik.divalidasi}</p>
                    </div>
                    <div className="card border-l-4 border-yellow-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Menunggu</p>
                        <p className="text-3xl font-bold text-yellow-700">{data.statistik.menunggu}</p>
                    </div>
                    <div className="card border-l-4 border-red-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Ditolak</p>
                        <p className="text-3xl font-bold text-red-700">{data.statistik.ditolak}</p>
                    </div>
                    <div className="card border-l-4 border-purple-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Total Poin</p>
                        <p className="text-3xl font-bold text-purple-700">+{data.statistik.total_poin}</p>
                    </div>
                </div>

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { v: '', l: `Semua (${data.misi.length})` },
                            { v: 'divalidasi', l: `✅ Divalidasi (${data.statistik.divalidasi})` },
                            { v: 'menunggu', l: `⏳ Menunggu (${data.statistik.menunggu})` },
                            { v: 'ditolak', l: `❌ Ditolak (${data.statistik.ditolak})` }
                        ].map((f) => (
                            <button
                                key={f.v}
                                onClick={() => setFilterStatus(f.v)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                    filterStatus === f.v ? 'bg-primary text-white' : 'bg-gray-100'
                                }`}
                            >
                                {f.l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* DAFTAR MISI */}
                <div className="card mb-6">
                    <h2 className="font-bold text-lg mb-4">📋 Misi yang Dikerjakan ({filteredMisi.length})</h2>
                    {filteredMisi.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">Belum ada misi</p>
                    ) : (
                        <div className="space-y-3">
                            {filteredMisi.map((m) => (
                                <div key={m.id} className="border rounded-lg p-4 hover:shadow-md transition">
                                    <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold">🎯 {m.judul}</h3>
                                                <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(m.status)}`}>
                                                    {m.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                📅 {new Date(m.tanggal_pengerjaan).toLocaleDateString('id-ID')}
                                                {m.validator_nama && ` • ✅ Divalidasi oleh ${m.validator_nama}`}
                                            </p>
                                        </div>
                                        <span className="text-xl font-bold text-green-600">+{m.poin_reward}</span>
                                    </div>
                                    {m.catatan_murid && (
                                        <div className="bg-gray-50 p-2 rounded text-sm mt-2">
                                            <p className="text-xs font-bold text-gray-500">💬 Catatan Murid:</p>
                                            <p>{m.catatan_murid}</p>
                                        </div>
                                    )}
                                    {m.catatan_wali_kelas && (
                                        <div className="bg-blue-50 p-2 rounded text-sm mt-2 border-l-4 border-blue-500">
                                            <p className="text-xs font-bold text-blue-700">✍️ Catatan Wali Kelas:</p>
                                            <p>{m.catatan_wali_kelas}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MISI TERSEDIA */}
                {data.misi_tersedia.length > 0 && (
                    <div className="card">
                        <h2 className="font-bold text-lg mb-4">🎁 Misi Tersedia ({data.misi_tersedia.length})</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {data.misi_tersedia.map((m) => (
                                <div key={m.id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex justify-between">
                                        <p className="font-bold text-sm">{m.judul}</p>
                                        <span className="text-green-600 font-bold">+{m.poin_reward}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">{m.deskripsi}</p>
                                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded mt-2 inline-block">
                                        {m.kategori}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}