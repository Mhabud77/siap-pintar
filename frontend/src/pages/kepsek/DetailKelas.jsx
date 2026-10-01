import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function DetailKelas() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadDetailKelas();
    }, [id]);

    const loadDetailKelas = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/data-sekolah/kelas/${id}`);
            setData(res.data.data);
            setError('');
        } catch (err) {
            console.error('Error load detail kelas:', err);
            setError(err.response?.data?.message || 'Gagal memuat data kelas');
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="card text-center py-12">
                        <div className="text-3xl">⏳</div>
                        <p className="text-gray-600 mt-2">Memuat data kelas...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => navigate('/kepsek/kelas')}
                        className="text-primary hover:underline mb-4 text-sm"
                    >
                        ← Kembali ke Data Kelas
                    </button>
                    <div className="card bg-red-50 border-l-4 border-red-500">
                        <p className="text-red-700">❌ {error || 'Kelas tidak ditemukan'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const filteredMurid = data.murid.filter(m =>
        m.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
        m.nis?.includes(search)
    );

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/kepsek/kelas')}
                        className="text-primary hover:underline mb-2 text-sm"
                    >
                        ← Kembali ke Data Kelas
                    </button>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                🏫 Kelas {data.kelas.nama_kelas}
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Tingkat {data.kelas.tingkat} • {data.kelas.jumlah_murid} murid
                            </p>
                        </div>
                    </div>
                </div>

                {/* INFO WALI KELAS */}
                <div className="card mb-6 bg-blue-50 border-l-4 border-blue-500">
                    <div className="flex items-start gap-4">
                        <div className="text-4xl">👨‍🏫</div>
                        <div className="flex-1">
                            <p className="text-xs text-blue-600 font-bold uppercase">
                                Wali Kelas
                            </p>
                            {data.kelas.wali_kelas_nama ? (
                                <>
                                    <p className="text-xl font-bold text-blue-800 mt-1">
                                        {data.kelas.wali_kelas_nama}
                                    </p>
                                    <div className="text-sm text-blue-700 mt-1 space-y-0.5">
                                        <p>📧 {data.kelas.wali_kelas_email || '-'}</p>
                                        <p>📞 {data.kelas.wali_kelas_telepon || '-'}</p>
                                    </div>
                                </>
                            ) : (
                                <p className="text-red-600 font-bold mt-1">
                                    ⚠️ Belum ada wali kelas
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* STATISTIK KELAS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="card border-l-4 border-blue-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Jumlah Murid</p>
                        <p className="text-3xl font-bold text-blue-700">{data.kelas.jumlah_murid}</p>
                    </div>
                    <div className="card border-l-4 border-green-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Rata-rata Poin</p>
                        <p className="text-3xl font-bold text-green-700">{data.statistik.rata_poin}</p>
                    </div>
                    <div className="card border-l-4 border-yellow-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Poin Tertinggi</p>
                        <p className="text-3xl font-bold text-yellow-700">{data.statistik.poin_tertinggi}</p>
                    </div>
                    <div className="card border-l-4 border-red-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Poin Terendah</p>
                        <p className="text-3xl font-bold text-red-700">{data.statistik.poin_terendah}</p>
                    </div>
                </div>

                {/* DAFTAR MURID */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                        <h2 className="text-xl font-bold text-gray-800">
                            📋 Daftar Murid ({data.murid.length})
                        </h2>
                        <input
                            type="text"
                            placeholder="🔍 Cari nama atau NIS..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field w-64"
                        />
                    </div>

                    {filteredMurid.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-gray-600">
                                {search ? 'Tidak ada murid yang cocok' : 'Belum ada murid di kelas ini'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="px-4 py-2 text-left">No</th>
                                        <th className="px-4 py-2 text-left">Nama</th>
                                        <th className="px-4 py-2 text-left">NIS</th>
                                        <th className="px-4 py-2 text-center">Poin</th>
                                        <th className="px-4 py-2 text-center">Kehadiran</th>
                                        <th className="px-4 py-2 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMurid.map((m, i) => (
                                        <tr key={m.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{i + 1}</td>
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
                                                    👁️ Laporan
                                                </button>
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