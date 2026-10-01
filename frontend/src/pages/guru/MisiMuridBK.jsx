import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function MisiMuridBK() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [misiTersedia, setMisiTersedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [error, setError] = useState('');

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [misiRes, tersediaRes] = await Promise.all([
                api.get(`/wali-kelas/misi-murid-bk/${id}`),
                api.get(`/wali-kelas/misi-tersedia-bk/${id}`)
            ]);
            setData(misiRes.data.data);
            setMisiTersedia(tersediaRes.data.data || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat data misi');
        }
        setLoading(false);
    };

    const getStatusBadge = (status) => {
        const badges = {
            menunggu: 'bg-yellow-100 text-yellow-700 border-yellow-300',
            divalidasi: 'bg-green-100 text-green-700 border-green-300',
            ditolak: 'bg-red-100 text-red-700 border-red-300'
        };
        return badges[status] || 'bg-gray-100 text-gray-700 border-gray-300';
    };

    const getStatusLabel = (status) => {
        const labels = {
            menunggu: '⏳ Menunggu Validasi',
            divalidasi: '✅ Divalidasi',
            ditolak: '❌ Ditolak'
        };
        return labels[status] || status;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-5xl mx-auto">
                    <div className="card text-center py-12">⏳ Memuat data misi...</div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-5xl mx-auto">
                    <button onClick={() => navigate('/guru-bk')} className="text-primary hover:underline mb-4 text-sm">
                        ← Kembali ke Dashboard
                    </button>
                    <div className="card bg-red-50 border-l-4 border-red-500">
                        <p className="text-red-700">❌ {error || 'Data tidak ditemukan'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const { murid, misi, statistik } = data;
    const filteredMisi = filterStatus
        ? misi.filter(m => m.status === filterStatus)
        : misi;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                {/* HEADER */}
                <button
                    onClick={() => navigate(`/guru-bk/kelas/${murid.kelas_id || ''}`)}
                    className="text-primary hover:underline mb-4 text-sm"
                >
                    ← Kembali
                </button>

                {/* INFO MURID */}
                <div className="card mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <div className="flex items-center gap-4">
                        {murid.foto_profil ? (
                            <img
                                src={`${BASE_URL}${murid.foto_profil}`}
                                alt={murid.nama_lengkap}
                                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow"
                            />
                        ) : (
                            <div className="w-20 h-20 bg-white bg-opacity-20 backdrop-blur rounded-full flex items-center justify-center text-white font-bold text-3xl border-4 border-white">
                                {murid.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold">{murid.nama_lengkap}</h1>
                            <p className="text-blue-100">NIS: {murid.nis}</p>
                            <p className="text-blue-100 text-sm">Kelas {murid.nama_kelas}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm opacity-90">Poin Bulan Ini</p>
                            <p className="text-4xl font-bold">{murid.poin_bulan_ini}</p>
                        </div>
                    </div>
                </div>

                {/* STATISTIK MISI */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="card border-l-4 border-blue-500 text-center">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Total Misi</p>
                        <p className="text-3xl font-bold text-blue-700">{statistik.total}</p>
                    </div>
                    <div className="card border-l-4 border-green-500 text-center">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Divalidasi</p>
                        <p className="text-3xl font-bold text-green-700">{statistik.divalidasi}</p>
                    </div>
                    <div className="card border-l-4 border-yellow-500 text-center">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Menunggu</p>
                        <p className="text-3xl font-bold text-yellow-700">{statistik.menunggu}</p>
                    </div>
                    <div className="card border-l-4 border-red-500 text-center">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Ditolak</p>
                        <p className="text-3xl font-bold text-red-700">{statistik.ditolak}</p>
                    </div>
                    <div className="card border-l-4 border-purple-500 text-center">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Total Poin</p>
                        <p className="text-3xl font-bold text-purple-700">+{statistik.total_poin_didapat}</p>
                    </div>
                </div>

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setFilterStatus('')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                filterStatus === '' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                        >
                            Semua ({statistik.total})
                        </button>
                        <button
                            onClick={() => setFilterStatus('divalidasi')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                filterStatus === 'divalidasi' ? 'bg-green-600 text-white' : 'bg-green-50 hover:bg-green-100 text-green-700'
                            }`}
                        >
                            ✅ Divalidasi ({statistik.divalidasi})
                        </button>
                        <button
                            onClick={() => setFilterStatus('menunggu')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                filterStatus === 'menunggu' ? 'bg-yellow-600 text-white' : 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                            }`}
                        >
                            ⏳ Menunggu ({statistik.menunggu})
                        </button>
                        <button
                            onClick={() => setFilterStatus('ditolak')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                filterStatus === 'ditolak' ? 'bg-red-600 text-white' : 'bg-red-50 hover:bg-red-100 text-red-700'
                            }`}
                        >
                            ❌ Ditolak ({statistik.ditolak})
                        </button>
                    </div>
                </div>

                {/* DAFTAR MISI MURID */}
                <div className="card mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        📋 Misi yang Pernah Diambil ({filteredMisi.length})
                    </h2>

                    {filteredMisi.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-gray-600">
                                {filterStatus ? 'Tidak ada misi dengan status ini' : 'Belum ada misi yang diambil'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredMisi.map((m) => (
                                <div key={m.id} className="border rounded-lg p-4 hover:shadow-md transition">
                                    {/* HEADER */}
                                    <div className="flex justify-between items-start flex-wrap gap-2 mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <h3 className="font-bold text-gray-800">🎯 {m.judul}</h3>
                                                <span className={`text-xs px-2 py-0.5 rounded border ${getStatusBadge(m.status)}`}>
                                                    {getStatusLabel(m.status)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Kategori: {m.kategori} • Dikerjakan: {new Date(m.tanggal_pengerjaan).toLocaleDateString('id-ID', {
                                                    day: 'numeric', month: 'long', year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-green-600">+{m.poin_reward}</p>
                                            <p className="text-xs text-gray-500">poin</p>
                                        </div>
                                    </div>

                                    {/* DESKRIPSI MISI */}
                                    <p className="text-sm text-gray-600 mb-3">{m.deskripsi}</p>

                                    {/* CATATAN MURID */}
                                    {m.catatan_murid && (
                                        <div className="bg-gray-50 p-2 rounded mb-2">
                                            <p className="text-xs font-bold text-gray-500 mb-1">💬 Catatan Murid:</p>
                                            <p className="text-sm">{m.catatan_murid}</p>
                                        </div>
                                    )}

                                    {/* CATATAN WALI KELAS */}
                                    {m.catatan_wali_kelas && (
                                        <div className="bg-blue-50 p-2 rounded mb-2 border-l-4 border-blue-500">
                                            <p className="text-xs font-bold text-blue-700 mb-1">
                                                ✍️ Catatan Wali Kelas ({m.wali_kelas_nama}):
                                            </p>
                                            <p className="text-sm">{m.catatan_wali_kelas}</p>
                                        </div>
                                    )}

                                    {/* INFO VALIDASI */}
                                    {m.status === 'divalidasi' && m.tanggal_validasi && (
                                        <div className="text-xs text-gray-500 mt-2">
                                            ✅ Divalidasi oleh <strong>{m.divalidasi_oleh_nama || m.wali_kelas_nama}</strong> pada {new Date(m.tanggal_validasi).toLocaleDateString('id-ID')}
                                        </div>
                                    )}

                                    {/* BUKTI FOTO */}
                                    {m.bukti_foto && (
                                        <div className="mt-3 pt-3 border-t">
                                            <p className="text-xs font-bold text-gray-500 mb-2">📷 Bukti:</p>
                                            <img
                                                src={`${BASE_URL}${m.bukti_foto}`}
                                                alt="Bukti misi"
                                                className="max-w-xs rounded-lg border"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MISI TERSEDIA (YANG BISA DIAMBIL) */}
                {misiTersedia.length > 0 && (
                    <div className="card">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">
                            🎯 Misi Tersedia untuk Diambil ({misiTersedia.length})
                        </h2>
                        <p className="text-xs text-gray-500 mb-3">
                            ℹ️ Misi berikut belum diambil murid. Murid dapat mengambilnya dari dashboard mereka.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {misiTersedia.map((m) => (
                                <div key={m.id} className="border rounded-lg p-3 bg-blue-50">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-sm">{m.judul}</p>
                                        <span className="text-sm font-bold text-green-600">+{m.poin_reward}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-1">{m.deskripsi}</p>
                                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">
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