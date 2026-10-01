import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function DataMurid() {
    const navigate = useNavigate();
    const [muridList, setMuridList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [page, setPage] = useState(0);
    const limit = 50;

    useEffect(() => {
        loadMurid();
    }, [filterKelas, page]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0);
            loadMurid();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const loadMurid = async () => {
        setLoading(true);
        try {
            let url = `/data-sekolah/murid?limit=${limit}&offset=${page * limit}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (filterKelas) url += `&kelas_id=${filterKelas}`;

            const res = await api.get(url);
            setMuridList(res.data.data || []);
            setKelasList(res.data.kelas_list || []);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Error load murid:', err);
        }
        setLoading(false);
    };

    const getPersenColor = (persen) => {
        if (persen >= 95) return 'text-green-600 bg-green-50';
        if (persen >= 85) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const getPoinColor = (poin) => {
        if (poin >= 110) return 'text-green-600 font-bold';
        if (poin >= 90) return 'text-gray-800 font-bold';
        return 'text-red-600 font-bold';
    };

    const totalPages = pagination ? Math.ceil(pagination.total / limit) : 0;

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
                        👨‍🎓 Data Murid
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Daftar semua murid dari kelas 7 sampai 9
                    </p>
                </div>

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Cari
                            </label>
                            <input
                                type="text"
                                placeholder="🔍 Cari nama atau NIS..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Kelas
                            </label>
                            <select
                                value={filterKelas}
                                onChange={(e) => { setFilterKelas(e.target.value); setPage(0); }}
                                className="input-field"
                            >
                                <option value="">Semua Kelas</option>
                                {kelasList.map(k => (
                                    <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* TABEL MURID */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">
                            Daftar Murid ({pagination?.total || 0})
                        </h2>
                        <button
                            onClick={loadMurid}
                            className="text-primary hover:underline text-sm"
                        >
                            🔄 Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">⏳ Memuat data...</div>
                    ) : muridList.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-gray-600">Tidak ada murid yang cocok</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="table-header">
                                            <th className="px-4 py-2 text-left">No</th>
                                            <th className="px-4 py-2 text-left">Nama</th>
                                            <th className="px-4 py-2 text-left">NIS</th>
                                            <th className="px-4 py-2 text-left">Kelas</th>
                                            <th className="px-4 py-2 text-center">Poin</th>
                                            <th className="px-4 py-2 text-center">Kehadiran</th>
                                            <th className="px-4 py-2 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {muridList.map((m, i) => (
                                            <tr key={m.id} className="border-b hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    {page * limit + i + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                            {m.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                        </div>
                                                        <span className="font-medium">{m.nama_lengkap}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                                    {m.nis}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                                                        {m.nama_kelas}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 text-center ${getPoinColor(m.poin_bulan_ini)}`}>
                                                    {m.poin_bulan_ini}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getPersenColor(m.persen_kehadiran)}`}>
                                                        {m.persen_kehadiran}%
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => navigate(`/laporan?murid_id=${m.id}`)}
                                                        className="text-primary hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium"
                                                    >
                                                        👁️ Detail
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAGINATION */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-sm text-gray-600">
                                        Halaman {page + 1} dari {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(Math.max(0, page - 1))}
                                            disabled={page === 0}
                                            className="btn-primary disabled:opacity-50"
                                        >
                                            ← Sebelumnya
                                        </button>
                                        <button
                                            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                                            disabled={page >= totalPages - 1}
                                            className="btn-primary disabled:opacity-50"
                                        >
                                            Selanjutnya →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}