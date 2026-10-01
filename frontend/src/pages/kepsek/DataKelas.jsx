import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function DataKelas() {
    const navigate = useNavigate();
    const [kelasList, setKelasList] = useState([]);
    const [statistik, setStatistik] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterTingkat, setFilterTingkat] = useState('');

    useEffect(() => {
        loadKelas();
    }, []);

    const loadKelas = async () => {
        setLoading(true);
        try {
            const res = await api.get('/data-sekolah/kelas');
            setKelasList(res.data.data || []);
            setStatistik(res.data.statistik);
        } catch (err) {
            console.error('Error load kelas:', err);
        }
        setLoading(false);
    };

    const filteredKelas = kelasList.filter(k => 
        !filterTingkat || k.tingkat === filterTingkat
    );

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
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/kepsek')}
                        className="text-primary hover:underline mb-2 text-sm"
                    >
                        ← Kembali ke Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">
                        🏫 Data Kelas
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Daftar semua kelas dan wali kelas
                    </p>
                </div>

                {/* STATISTIK */}
                {statistik && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="card border-l-4 border-blue-500">
                            <p className="text-xs text-gray-600 font-semibold uppercase">Total Kelas</p>
                            <p className="text-3xl font-bold text-blue-700">{statistik.total_kelas}</p>
                            <p className="text-xs text-gray-500 mt-1">Kelas 7A - 9G</p>
                        </div>
                        <div className="card border-l-4 border-green-500">
                            <p className="text-xs text-gray-600 font-semibold uppercase">Total Murid</p>
                            <p className="text-3xl font-bold text-green-700">{statistik.total_murid}</p>
                            <p className="text-xs text-gray-500 mt-1">Semua kelas</p>
                        </div>
                        <div className="card border-l-4 border-red-500">
                            <p className="text-xs text-gray-600 font-semibold uppercase">Tanpa Wali</p>
                            <p className="text-3xl font-bold text-red-700">{statistik.kelas_tanpa_wali}</p>
                            <p className="text-xs text-gray-500 mt-1">Perlu diset</p>
                        </div>
                    </div>
                )}

                {/* FILTER */}
                <div className="card mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Filter Tingkat
                    </label>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterTingkat('')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                filterTingkat === '' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                        >
                            Semua
                        </button>
                        <button
                            onClick={() => setFilterTingkat('7')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                filterTingkat === '7' ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                            }`}
                        >
                            Kelas 7
                        </button>
                        <button
                            onClick={() => setFilterTingkat('8')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                filterTingkat === '8' ? 'bg-green-600 text-white' : 'bg-green-50 hover:bg-green-100 text-green-700'
                            }`}
                        >
                            Kelas 8
                        </button>
                        <button
                            onClick={() => setFilterTingkat('9')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                filterTingkat === '9' ? 'bg-purple-600 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                            }`}
                        >
                            Kelas 9
                        </button>
                    </div>
                </div>

                {/* GRID KELAS */}
                {loading ? (
                    <div className="card text-center py-12 text-gray-500">⏳ Memuat data...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredKelas.map((kelas) => (
                            <div key={kelas.id} className="card hover:shadow-lg transition">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getTingkatColor(kelas.tingkat)}`}>
                                        {kelas.nama_kelas}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {kelas.jumlah_murid} murid
                                    </span>
                                </div>

                                <div className="mb-3">
                                    <p className="text-xs text-gray-500 mb-1">Wali Kelas:</p>
                                    {kelas.ada_wali ? (
                                        <p className="font-bold text-gray-800">{kelas.wali_kelas_nama}</p>
                                    ) : (
                                        <p className="text-red-500 text-sm italic">⚠️ Belum diset</p>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">Rata-rata Poin:</span>
                                        <span className="text-lg font-bold text-primary">{kelas.rata_poin}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/kepsek/kelas/${kelas.id}`)}
                                    className="btn-primary w-full mt-3 text-sm"
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