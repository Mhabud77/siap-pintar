import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function PerilakuAnak() {
    const navigate = useNavigate();
    const { murid_id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterJenis, setFilterJenis] = useState('');

    useEffect(() => { loadData(); }, [murid_id, filterJenis]);

    const loadData = async () => {
        setLoading(true);
        try {
            let url = `/orangtua/perilaku/${murid_id}`;
            if (filterJenis) url += `?jenis=${filterJenis}`;
            const res = await api.get(url);
            setData(res.data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    if (loading) return <div className="p-6 text-center">⏳ Memuat...</div>;
    if (!data) return <div className="p-6 text-center">Data tidak ditemukan</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => navigate('/orangtua')} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali
                </button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">📝 Perilaku Anak</h1>

                {/* STATISTIK */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card border-l-4 border-green-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Positif</p>
                        <p className="text-3xl font-bold text-green-700">{data.statistik.positif}</p>
                        <p className="text-xs text-green-600 mt-1">+{data.statistik.total_poin_positif} poin</p>
                    </div>
                    <div className="card border-l-4 border-red-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Negatif</p>
                        <p className="text-3xl font-bold text-red-700">{data.statistik.negatif}</p>
                        <p className="text-xs text-red-600 mt-1">{data.statistik.total_poin_negatif} poin</p>
                    </div>
                    <div className="card border-l-4 border-blue-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Total</p>
                        <p className="text-3xl font-bold text-blue-700">{data.statistik.total}</p>
                    </div>
                    <div className="card border-l-4 border-purple-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Net Poin</p>
                        <p className="text-3xl font-bold text-purple-700">
                            {data.statistik.total_poin_positif + data.statistik.total_poin_negatif}
                        </p>
                    </div>
                </div>

                {/* PER KATEGORI */}
                <div className="card mb-6">
                    <h2 className="font-bold text-lg mb-4">📊 Per Kategori</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {data.per_kategori.map((k, i) => (
                            <div key={i} className={`p-3 rounded-lg border-l-4 ${
                                k.jenis === 'positif' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                            }`}>
                                <div className="flex justify-between">
                                    <span className="font-medium">{k.kategori}</span>
                                    <span className="text-sm">{k.jumlah}x</span>
                                </div>
                                <div className="text-xs text-gray-600">
                                    Total: {k.total_poin > 0 ? '+' : ''}{k.total_poin} poin
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="flex gap-2">
                        {[
                            { v: '', l: 'Semua' },
                            { v: 'positif', l: '🌟 Positif' },
                            { v: 'negatif', l: '⚠️ Negatif' }
                        ].map((f) => (
                            <button
                                key={f.v}
                                onClick={() => setFilterJenis(f.v)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                                    filterJenis === f.v ? 'bg-primary text-white' : 'bg-gray-100'
                                }`}
                            >
                                {f.l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* RIWAYAT */}
                <div className="card">
                    <h2 className="font-bold text-lg mb-4">📜 Riwayat Perilaku</h2>
                    {data.perilaku.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">Belum ada data</p>
                    ) : (
                        <div className="space-y-2">
                            {data.perilaku.map((p) => (
                                <div key={p.id} className={`p-3 rounded-lg border-l-4 ${
                                    p.jenis === 'positif' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                                }`}>
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <p className="font-medium">{p.deskripsi}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                📅 {new Date(p.tanggal).toLocaleDateString('id-ID')}
                                                {p.waktu && ` • 🕐 ${p.waktu.slice(0, 5)}`}
                                                {' • '}Dicatat oleh: <strong>{p.guru_nama}</strong>
                                            </p>
                                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded mt-1 inline-block">
                                                {p.kategori}
                                            </span>
                                        </div>
                                        <span className={`text-xl font-bold ${p.poin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {p.poin > 0 ? '+' : ''}{p.poin}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}