import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function DataGuru() {
    const navigate = useNavigate();
    const [guruList, setGuruList] = useState([]);
    const [statistik, setStatistik] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    useEffect(() => {
        loadGuru();
    }, [filterStatus]);

    const loadGuru = async () => {
        setLoading(true);
        try {
            let url = '/data-sekolah/guru';
            const params = [];
            if (search) params.push(`search=${encodeURIComponent(search)}`);
            if (filterStatus) params.push(`status=${filterStatus}`);
            if (params.length > 0) url += '?' + params.join('&');

            const res = await api.get(url);
            setGuruList(res.data.data || []);
            setStatistik(res.data.statistik);
        } catch (err) {
            console.error('Error load guru:', err);
        }
        setLoading(false);
    };

    // Reload saat search berubah (debounce)
    useEffect(() => {
        const timer = setTimeout(() => {
            loadGuru();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const filteredGuru = guruList;

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
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                👨‍🏫 Data Guru
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Daftar semua guru dan wali kelas
                            </p>
                        </div>
                    </div>
                </div>

                {/* STATISTIK */}
                {statistik && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="card border-l-4 border-blue-500">
                            <p className="text-xs text-gray-600 font-semibold uppercase">Total Guru</p>
                            <p className="text-3xl font-bold text-blue-700">{statistik.total}</p>
                            <p className="text-xs text-gray-500 mt-1">Guru & staf</p>
                        </div>
                        <div className="card border-l-4 border-green-500">
                            <p className="text-xs text-gray-600 font-semibold uppercase">Wali Kelas</p>
                            <p className="text-3xl font-bold text-green-700">{statistik.wali_kelas}</p>
                            <p className="text-xs text-gray-500 mt-1">Guru yang jadi wali</p>
                        </div>
                        <div className="card border-l-4 border-purple-500">
                            <p className="text-xs text-gray-600 font-semibold uppercase">Guru Mapel</p>
                            <p className="text-3xl font-bold text-purple-700">{statistik.guru_mapel}</p>
                            <p className="text-xs text-gray-500 mt-1">Guru mata pelajaran</p>
                        </div>
                    </div>
                )}

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Cari
                            </label>
                            <input
                                type="text"
                                placeholder="🔍 Cari nama, username, atau email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Kategori
                            </label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="input-field"
                            >
                                <option value="">Semua</option>
                                <option value="wali_kelas">Wali Kelas</option>
                                <option value="guru_mapel">Guru Mapel</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* TABEL GURU */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">
                            Daftar Guru ({filteredGuru.length})
                        </h2>
                        <button
                            onClick={loadGuru}
                            className="text-primary hover:underline text-sm"
                        >
                            🔄 Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">⏳ Memuat data...</div>
                    ) : filteredGuru.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-gray-600">Tidak ada guru yang cocok</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="px-4 py-2 text-left">No</th>
                                        <th className="px-4 py-2 text-left">Nama</th>
                                        <th className="px-4 py-2 text-left">Username</th>
                                        <th className="px-4 py-2 text-left">Kontak</th>
                                        <th className="px-4 py-2 text-left">Status</th>
                                        <th className="px-4 py-2 text-center">Aktivitas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredGuru.map((g, i) => (
                                        <tr key={g.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                        {g.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-800">{g.nama_lengkap}</p>
                                                        <p className="text-xs text-gray-500">ID: {g.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                                {g.username}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <p className="text-gray-700">{g.email || '-'}</p>
                                                <p className="text-xs text-gray-500">{g.no_telepon || '-'}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {g.kategori === 'wali_kelas' ? (
                                                    <div>
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                                                            WALI KELAS
                                                        </span>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            {g.wali_kelas_dari}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold">
                                                        GURU MAPEL
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="text-xs text-gray-500">
                                                    <p>📝 {g.total_input_perilaku} perilaku</p>
                                                    <p>🎯 {g.total_validasi_misi} validasi</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}