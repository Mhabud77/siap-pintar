import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';

export default function ValidasiMisi() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [list, setList] = useState([]);
    const [info, setInfo] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null);
    const [aksesDitolak, setAksesDitolak] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setAksesDitolak(false);
        try {
            const res = await api.get('/misi/perlu-validasi');
            setList(res.data.data || []);
            setInfo(res.data.info || null);
        } catch (err) {
            console.error('Error load data:', err);
            // Kalau 403 (bukan wali kelas), tandai akses ditolak
            if (err.response?.status === 403) {
                setAksesDitolak(true);
            } else {
                setMessage({
                    type: 'error',
                    text: '❌ ' + (err.response?.data?.message || 'Gagal memuat data')
                });
            }
        }
        setLoading(false);
    };

    const validasi = async (id, status) => {
        const catatan = prompt(
            status === 'divalidasi'
                ? 'Catatan (opsional, untuk murid):'
                : 'Alasan penolakan (wajib):'
        );

        if (status === 'ditolak' && !catatan) {
            alert('Alasan penolakan wajib diisi!');
            return;
        }

        setProcessing(id);

        try {
            await api.post('/misi/validasi', {
                pengerjaan_id: id,
                status,
                catatan: catatan || ''
            });

            setMessage({
                type: 'success',
                text: status === 'divalidasi'
                    ? '✅ Misi berhasil divalidasi!'
                    : '✅ Misi ditolak.'
            });

            loadData();
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal validasi')
            });
        }

        setProcessing(null);
    };

    // ============================================
    // LOADING
    // ============================================
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="card text-center py-12">
                        <div className="text-2xl">⏳</div>
                        <p className="text-gray-600 mt-2">Memuat data...</p>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // AKSES DITOLAK (Admin bukan wali kelas)
    // ============================================
    if (aksesDitolak || (info && !info.is_wali_kelas)) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="text-primary hover:underline mb-2 text-sm"
                        >
                            ← Kembali
                        </button>
                        <h1 className="text-3xl font-bold text-gray-800">
                            ✅ Validasi Misi
                        </h1>
                    </div>

                    <div className="card bg-yellow-50 border-l-4 border-yellow-500">
                        <div className="flex items-start gap-4">
                            <div className="text-5xl">⚠️</div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-yellow-800">
                                    Akses Terbatas
                                </h2>
                                <p className="text-yellow-700 mt-2">
                                    Anda login sebagai <strong>{user?.role}</strong>.
                                    Halaman Validasi Misi hanya dapat diakses oleh
                                    <strong> Wali Kelas</strong>.
                                </p>
                                <p className="text-yellow-600 text-sm mt-3">
                                    💡 Validasi misi dilakukan oleh wali kelas
                                    masing-masing. Jika Anda admin, silakan kelola
                                    data misi di menu <strong>Data Misi</strong>.
                                </p>

                                <div className="flex gap-2 mt-4 flex-wrap">
                                    <button
                                        onClick={() => navigate('/admin/misi')}
                                        className="btn-primary text-sm"
                                    >
                                        🎯 Kelola Data Misi
                                    </button>
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm"
                                    >
                                        ← Kembali
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // WALI KELAS
    // ============================================
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-primary hover:underline mb-2 text-sm"
                    >
                        ← Kembali
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">
                        ✅ Validasi Misi
                    </h1>
                    {info?.kelas && (
                        <p className="text-gray-600 mt-1">
                            Kelas <strong>{info.kelas.nama_kelas}</strong>
                            {' '}(Tingkat {info.kelas.tingkat})
                        </p>
                    )}
                </div>

                {/* STATISTIK */}
                {info?.statistik && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="card text-center">
                            <p className="text-sm text-gray-500">Total Misi</p>
                            <p className="text-3xl font-bold text-gray-800">
                                {info.statistik.total || 0}
                            </p>
                        </div>
                        <div className="card text-center bg-yellow-50">
                            <p className="text-sm text-yellow-700">Menunggu</p>
                            <p className="text-3xl font-bold text-yellow-600">
                                {info.statistik.menunggu || 0}
                            </p>
                        </div>
                        <div className="card text-center bg-green-50">
                            <p className="text-sm text-green-700">Divalidasi</p>
                            <p className="text-3xl font-bold text-green-600">
                                {info.statistik.divalidasi || 0}
                            </p>
                        </div>
                        <div className="card text-center bg-red-50">
                            <p className="text-sm text-red-700">Ditolak</p>
                            <p className="text-3xl font-bold text-red-600">
                                {info.statistik.ditolak || 0}
                            </p>
                        </div>
                    </div>
                )}

                {/* MESSAGE */}
                {message && (
                    <div className={`card mb-4 border-l-4 ${
                        message.type === 'success'
                            ? 'bg-green-50 border-green-500'
                            : 'bg-red-50 border-red-500'
                    }`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                            {message.text}
                        </p>
                    </div>
                )}

                {/* LIST MISI */}
                {list.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">🎉</div>
                        <h2 className="text-xl font-bold text-gray-800">
                            Tidak Ada Misi yang Perlu Divalidasi
                        </h2>
                        <p className="text-gray-600 mt-2">
                            Semua misi murid di kelas Anda sudah divalidasi.
                        </p>
                        <button
                            onClick={loadData}
                            className="btn-primary mt-4"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                Daftar Misi Menunggu Validasi ({list.length})
                            </h2>
                            <button
                                onClick={loadData}
                                className="text-primary hover:underline text-sm"
                            >
                                🔄 Refresh
                            </button>
                        </div>

                        {list.map((item) => (
                            <div key={item.id} className="card hover:shadow-lg transition">
                                {/* HEADER CARD */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-bold text-lg text-gray-800">
                                                {item.nama_lengkap}
                                            </h3>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {item.nama_kelas}
                                            </span>
                                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                NIS: {item.nis}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">
                                            📅 Dikerjakan: {item.tanggal_pengerjaan
                                                ? new Date(item.tanggal_pengerjaan).toLocaleDateString('id-ID', {
                                                    weekday: 'long', day: 'numeric',
                                                    month: 'long', year: 'numeric'
                                                })
                                                : '-'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-green-600">
                                            +{item.poin_reward}
                                        </p>
                                        <p className="text-xs text-gray-500">poin</p>
                                    </div>
                                </div>

                                {/* MISI */}
                                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                                    <p className="text-xs text-blue-600 font-bold mb-1">
                                        🎯 MISI
                                    </p>
                                    <h4 className="font-bold text-gray-800">
                                        {item.misi_judul}
                                    </h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {item.misi_deskripsi}
                                    </p>
                                    {item.misi_kategori && (
                                        <span className="inline-block mt-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                            {item.misi_kategori}
                                        </span>
                                    )}
                                </div>

                                {/* CATATAN MURID */}
                                {item.catatan_murid && (
                                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                        <p className="text-xs text-gray-500 font-bold mb-1">
                                            💬 CATATAN MURID
                                        </p>
                                        <p className="text-sm text-gray-700">
                                            {item.catatan_murid}
                                        </p>
                                    </div>
                                )}

                                {/* BUKTI FOTO */}
                                {item.bukti_foto && (
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 font-bold mb-2">
                                            📷 BUKTI
                                        </p>
                                        <img
                                            src={item.bukti_foto}
                                            alt="Bukti misi"
                                            className="max-w-xs rounded-lg border border-gray-200"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                )}

                                {/* TOMBOL AKSI */}
                                <div className="flex gap-2 pt-3 border-t border-gray-200">
                                    <button
                                        onClick={() => validasi(item.id, 'divalidasi')}
                                        disabled={processing === item.id}
                                        className="btn-success flex-1 disabled:opacity-50"
                                    >
                                        {processing === item.id ? '⏳ Memproses...' : '✓ Validasi'}
                                    </button>
                                    <button
                                        onClick={() => validasi(item.id, 'ditolak')}
                                        disabled={processing === item.id}
                                        className="btn-danger flex-1 disabled:opacity-50"
                                    >
                                        {processing === item.id ? '⏳ Memproses...' : '✗ Tolak'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}