import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function DataKelasBKList() {
    const navigate = useNavigate();
    const [kelasList, setKelasList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/wali-kelas/kelas-bk');
            setKelasList(res.data.data || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const totalMurid = kelasList.reduce((sum, k) => sum + k.jumlah_murid, 0);

    const getTingkatColor = (tingkat) => {
        const colors = {
            '7': 'bg-blue-100 text-blue-700 border-blue-300',
            '8': 'bg-green-100 text-green-700 border-green-300',
            '9': 'bg-purple-100 text-purple-700 border-purple-300'
        };
        return colors[tingkat] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-6xl mx-auto">
                <button onClick={() => navigate('/guru-bk')} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali ke Dashboard
                </button>

                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">🏫 Data Kelas</h1>
                    <p className="text-gray-600 mt-1">Kelas yang Anda ampu sebagai Guru BK</p>
                </div>

                {/* STATISTIK */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="card border-l-4 border-blue-500">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Total Kelas</p>
                        <p className="text-3xl font-bold text-blue-700">{kelasList.length}</p>
                    </div>
                    <div className="card border-l-4 border-green-500">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Total Murid</p>
                        <p className="text-3xl font-bold text-green-700">{totalMurid}</p>
                    </div>
                </div>

                {loading ? (
                    <div className="card text-center py-12">⏳ Memuat...</div>
                ) : kelasList.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-gray-600">Belum ada kelas yang di-assign ke Anda</p>
                        <p className="text-sm text-gray-500 mt-2">Hubungi admin untuk set kelas yang Anda ampu</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {kelasList.map((k) => (
                            <div key={k.id} className="card hover:shadow-lg transition">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getTingkatColor(k.tingkat)}`}>
                                        {k.nama_kelas}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {k.jumlah_murid} murid
                                    </span>
                                </div>

                                <div className="mb-4">
                                    <p className="text-xs text-gray-500 mb-1">Tingkat</p>
                                    <p className="font-bold text-gray-800">Kelas {k.tingkat}</p>
                                </div>

                                <div className="pt-3 border-t border-gray-200 mb-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">Rata-rata Poin:</span>
                                        <span className="text-lg font-bold text-primary">{k.rata_poin}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/guru-bk/kelas/${k.id}`)}
                                    className="btn-primary w-full text-sm"
                                >
                                    👁️ Lihat Detail
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}