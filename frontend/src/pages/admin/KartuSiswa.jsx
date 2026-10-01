import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function KartuSiswa() {
    const navigate = useNavigate();
    const [muridList, setMuridList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [selectedKelas, setSelectedKelas] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [limit, setLimit] = useState(50);

    useEffect(() => {
        loadData();
    }, [selectedKelas, page, limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0);
            loadData();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        try {
            let url = `/qr-code/kartu-siswa?limit=${limit}&offset=${page * limit}`;
            if (selectedKelas) url += `&kelas_id=${selectedKelas}`;

            const res = await api.get(url);
            setMuridList(res.data.data || []);
            setKelasList(res.data.kelas_list || []);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error('Error load kartu siswa:', err);
        }
        setLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredMurid = muridList.filter(m =>
        m.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
        m.nis?.includes(search)
    );

    const totalPages = pagination ? Math.ceil(pagination.total / limit) : 0;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-6 print:hidden">
                    <button
                        onClick={() => navigate('/admin/qr-code')}
                        className="text-primary hover:underline mb-2 text-sm"
                    >
                        ← Kembali
                    </button>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                🎴 Kartu Siswa (B2)
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Kartu ukuran B2 dengan QR Code besar. 8 kartu per halaman.
                            </p>
                        </div>
                        <button onClick={handlePrint} className="btn-primary">
                            🖨️ Cetak / Save PDF (B2)
                        </button>
                    </div>
                </div>

                {/* FILTER */}
                <div className="card mb-6 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Filter Kelas
                            </label>
                            <select
                                value={selectedKelas}
                                onChange={(e) => { setSelectedKelas(e.target.value); setPage(0); }}
                                className="input-field"
                            >
                                <option value="">Semua Kelas</option>
                                {kelasList.map(k => (
                                    <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                ))}
                            </select>
                        </div>
                        <div>
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
                                Per Halaman
                            </label>
                            <select
                                value={limit}
                                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(0); }}
                                className="input-field"
                            >
                                <option value="24">24 kartu</option>
                                <option value="50">50 kartu (default)</option>
                                <option value="100">100 kartu</option>
                                <option value="200">200 kartu</option>
                            </select>
                        </div>
                    </div>
                    {pagination && (
                        <p className="text-sm text-gray-600 mt-3">
                            Menampilkan <strong>{filteredMurid.length}</strong> kartu • 
                            Total <strong>{pagination.total}</strong> murid • 
                            Halaman <strong>{page + 1}</strong> dari <strong>{totalPages}</strong> • 
                            Estimasi <strong>{Math.ceil(pagination.total / 8)}</strong> halaman B2
                        </p>
                    )}
                </div>

                {/* PAGINATION TOP */}
                {totalPages > 1 && (
                    <div className="card mb-4 print:hidden">
                        <div className="flex justify-between items-center flex-wrap gap-3">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                className="btn-primary disabled:opacity-50"
                            >
                                ← Sebelumnya
                            </button>
                            <p className="text-sm font-medium">
                                Halaman {page + 1} / {totalPages}
                            </p>
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

                {/* GRID KARTU */}
                {loading ? (
                    <div className="card text-center py-12">
                        <div className="text-3xl mb-2">⏳</div>
                        <p className="text-gray-600">Memuat kartu...</p>
                    </div>
                ) : filteredMurid.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-gray-600">Tidak ada murid</p>
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-lg shadow-lg print:p-0 print:shadow-none">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2 print:gap-3">
                            {filteredMurid.map((m) => (
                                <KartuItem key={m.id} murid={m} />
                            ))}
                        </div>
                    </div>
                )}

                {/* PAGINATION BOTTOM */}
                {totalPages > 1 && (
                    <div className="card mt-4 print:hidden">
                        <div className="flex justify-between items-center flex-wrap gap-3">
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                className="btn-primary disabled:opacity-50"
                            >
                                ← Sebelumnya
                            </button>
                            <p className="text-sm font-medium">
                                Halaman {page + 1} / {totalPages}
                            </p>
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
            </div>
        </div>
    );
}

// ============================================
// KOMPONEN: Kartu Siswa
// ============================================
function KartuItem({ murid }) {
    return (
        <div
            className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-blue-500 print:shadow-none print:break-inside-avoid"
            style={{ minHeight: '6cm' }}
        >
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-3 py-1.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <img
                            src="/logo-sekolah.png"
                            alt="Logo"
                            className="w-6 h-6 object-contain"
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                            <p className="text-[10px] font-bold leading-tight">
                                SMP NEGERI 1 GONDANG
                            </p>
                            <p className="text-[8px] opacity-90 leading-tight">
                                Kartu Identitas Siswa
                            </p>
                        </div>
                    </div>
                    <span className="text-[10px] bg-white bg-opacity-20 px-2 py-0.5 rounded font-bold">
                        {murid.nama_kelas}
                    </span>
                </div>
            </div>

            {/* BODY */}
            <div className="p-2 flex gap-2">
                {/* FOTO */}
                <div className="flex-shrink-0">
                    {murid.foto_profil ? (
                        <img
                            src={`${BASE_URL}${murid.foto_profil}`}
                            alt={murid.nama_lengkap}
                            className="w-20 h-24 rounded object-cover border-2 border-gray-300"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-20 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded flex items-center justify-center text-white font-bold text-xl border-2 border-gray-300">
                            {murid.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                        </div>
                    )}
                </div>

                {/* IDENTITAS */}
                <div className="flex-1 min-w-0">
                    <p className="text-[8px] text-gray-500 uppercase font-bold">Nama</p>
                    <p className="text-xs font-bold text-gray-800 leading-tight mb-1">
                        {murid.nama_lengkap}
                    </p>

                    <p className="text-[8px] text-gray-500 uppercase font-bold">NIS</p>
                    <p className="text-xs font-bold text-gray-800 font-mono mb-1">
                        {murid.nis}
                    </p>

                    <p className="text-[8px] text-gray-500 uppercase font-bold">Kelas</p>
                    <p className="text-xs font-bold text-gray-800">{murid.nama_kelas}</p>

                    <p className="text-[8px] text-gray-500 uppercase font-bold mt-1">JK</p>
                    <p className="text-xs font-bold text-gray-800">
                        {murid.jenis_kelamin === 'L' ? '👦 Laki-laki' : murid.jenis_kelamin === 'P' ? '👧 Perempuan' : '-'}
                    </p>
                </div>

                {/* QR CODE */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center">
                    {murid.qr_url ? (
                        <img
                            src={`${BASE_URL}${murid.qr_url}`}
                            alt="QR Code"
                            className="w-40 h-40 border-2 border-gray-300 rounded"
                            loading="lazy"
                        />
                    ) : murid.qr_image ? (
                        <img
                            src={murid.qr_image}
                            alt="QR Code"
                            className="w-20 h-20 border-2 border-gray-300 rounded"
                        />
                    ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded border-2 border-gray-300 flex items-center justify-center text-[8px] text-gray-400 text-center p-1">
                            QR belum<br/>di-generate
                        </div>
                    )}
                    <p className="text-[7px] text-gray-500 mt-0.5 text-center leading-tight font-bold">
                        SCAN ABSENSI
                    </p>
                </div>
            </div>

            {/* FOOTER */}
            <div className="bg-gray-100 px-2 py-0.5 text-center">
                <p className="text-[7px] text-gray-500">
                    Kartu ini tidak boleh dipinjamkan ke orang lain
                </p>
            </div>
        </div>
    );
}