import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function DataKelasBK() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [showProfilModal, setShowProfilModal] = useState(false);
    const [profilMurid, setProfilMurid] = useState(null);
    const [loadingProfil, setLoadingProfil] = useState(false);

    useEffect(() => { loadData(); }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/wali-kelas/kelas-bk/${id}`);
            setData(res.data.data);
            setError('');
        } catch (err) {
            console.error('Error load detail kelas:', err);
            const status = err.response?.status;
            const message = err.response?.data?.message;

            if (status === 403) {
                setError('Anda tidak memiliki akses ke kelas ini. Pastikan admin sudah mengatur Anda sebagai guru BK untuk kelas ini.');
            } else if (status === 404) {
                setError('Kelas tidak ditemukan.');
            } else {
                setError(message || 'Gagal memuat data kelas');
            }
        }
        setLoading(false);
    };

    const handleCatatPerilaku = (murid) => {
        navigate(`/perilaku?murid_id=${murid.id}`);
    };

    const handleLihatProfil = async (murid) => {
        setShowProfilModal(true);
        setLoadingProfil(true);
        setProfilMurid(null);

        try {
            const res = await api.get(`/wali-kelas/profil-murid-bk/${murid.id}`);
            setProfilMurid(res.data.data);
        } catch (err) {
            console.error('Error load profil:', err);
            const status = err.response?.status;
            const message = err.response?.data?.message;

            if (status === 403) {
                alert('Anda tidak memiliki akses ke murid ini.');
            } else {
                alert(message || 'Gagal memuat profil murid');
            }
            setShowProfilModal(false);
        }
        setLoadingProfil(false);
    };

    const handleLihatMisi = (murid) => {
        navigate(`/guru-bk/murid/${murid.id}/misi`);
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
                <div className="max-w-6xl mx-auto">
                    <div className="card text-center py-12">⏳ Memuat data kelas...</div>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-4xl mx-auto">
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

    const { kelas, murid } = data;
    const filteredMurid = murid.filter(m =>
        m.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
        m.nis?.includes(search)
    );

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-6xl mx-auto">
                {/* HEADER */}
                <button onClick={() => navigate('/guru-bk')} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali ke Dashboard
                </button>

                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">🏫 Kelas {kelas.nama_kelas}</h1>
                    <p className="text-gray-600 mt-1">
                        Tingkat {kelas.tingkat} • {kelas.jumlah_murid} murid
                    </p>
                </div>

                {/* INFO WALI KELAS */}
                <div className="card mb-6 bg-blue-50 border-l-4 border-blue-500">
                    <h2 className="font-bold text-blue-800 mb-3">👨‍🏫 Wali Kelas</h2>
                    {kelas.wali_kelas_nama ? (
                        <div className="flex items-center gap-4 flex-wrap">
                            {kelas.wali_kelas_foto ? (
                                <img
                                    src={`${BASE_URL}${kelas.wali_kelas_foto}`}
                                    alt={kelas.wali_kelas_nama}
                                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                    {kelas.wali_kelas_nama.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="font-bold text-lg text-blue-800">{kelas.wali_kelas_nama}</p>
                                <p className="text-sm text-blue-600">📧 {kelas.wali_kelas_email || '-'}</p>
                                <p className="text-sm text-blue-600">📞 {kelas.wali_kelas_telepon || '-'}</p>
                            </div>
                            {kelas.wali_kelas_telepon && (
                                <a
                                    href={`https://wa.me/${kelas.wali_kelas_telepon.replace(/^0/, '62')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-success text-sm"
                                >
                                    💬 WhatsApp
                                </a>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">Belum ada wali kelas</p>
                    )}
                </div>

                {/* STATISTIK KELAS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card border-l-4 border-blue-500">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Jumlah Murid</p>
                        <p className="text-3xl font-bold text-blue-700">{kelas.jumlah_murid}</p>
                    </div>
                    <div className="card border-l-4 border-green-500">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Rata-rata Poin</p>
                        <p className="text-3xl font-bold text-green-700">{kelas.rata_poin}</p>
                    </div>
                    <div className="card border-l-4 border-yellow-500">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Poin Tertinggi</p>
                        <p className="text-3xl font-bold text-yellow-700">{kelas.poin_tertinggi || 0}</p>
                    </div>
                    <div className="card border-l-4 border-red-500">
                        <p className="text-xs text-gray-500 font-semibold uppercase">Poin Terendah</p>
                        <p className="text-3xl font-bold text-red-700">{kelas.poin_terendah || 0}</p>
                    </div>
                </div>

                {/* DAFTAR MURID */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                        <h2 className="text-xl font-bold text-gray-800">
                            📋 Daftar Murid ({murid.length})
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
                                        <th className="px-3 py-2 text-left">No</th>
                                        <th className="px-3 py-2 text-left">Nama</th>
                                        <th className="px-3 py-2 text-left">NIS</th>
                                        <th className="px-3 py-2 text-center">JK</th>
                                        <th className="px-3 py-2 text-center">Poin</th>
                                        <th className="px-3 py-2 text-center">Hadir</th>
                                        <th className="px-3 py-2 text-center">Pelanggaran</th>
                                        <th className="px-3 py-2 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMurid.map((m, i) => (
                                        <tr key={m.id} className="border-b hover:bg-gray-50">
                                            <td className="px-3 py-3">{i + 1}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-2">
                                                    {m.foto_profil ? (
                                                        <img
                                                            src={`${BASE_URL}${m.foto_profil}`}
                                                            alt={m.nama_lengkap}
                                                            className="w-8 h-8 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                            {m.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="font-medium">{m.nama_lengkap}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-sm font-mono text-gray-600">{m.nis}</td>
                                            <td className="px-3 py-3 text-center">
                                                {m.jenis_kelamin === 'L' ? (
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">L</span>
                                                ) : m.jenis_kelamin === 'P' ? (
                                                    <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded font-bold">P</span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className={`px-3 py-3 text-center ${getPoinColor(m.poin_bulan_ini)}`}>
                                                {m.poin_bulan_ini}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${getPersenColor(m.persen_kehadiran)}`}>
                                                    {m.persen_kehadiran}%
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                {m.total_pelanggaran > 0 ? (
                                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600">
                                                        ⚠️ {m.total_pelanggaran}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex gap-1 justify-center flex-wrap">
                                                    {/* AKSI 1: Catat Perilaku */}
                                                    <button
                                                        onClick={() => handleCatatPerilaku(m)}
                                                        className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                                                        title="Catat Perilaku"
                                                    >
                                                        📝 Perilaku
                                                    </button>

                                                    {/* AKSI 2: Lihat Profil */}
                                                    <button
                                                        onClick={() => handleLihatProfil(m)}
                                                        className="text-purple-600 hover:bg-purple-50 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                                                        title="Lihat Profil"
                                                    >
                                                        👤 Profil
                                                    </button>

                                                    {/* AKSI 3: Lihat Misi */}
                                                    <button
                                                        onClick={() => handleLihatMisi(m)}
                                                        className="text-orange-600 hover:bg-orange-50 px-2 py-1 rounded text-xs font-medium whitespace-nowrap"
                                                        title="Lihat Misi"
                                                    >
                                                        🎯 Misi
                                                    </button>
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
                {/* MODAL PROFIL MURID */}
                {showProfilModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg w-full max-w-2xl my-8">
                            {loadingProfil ? (
                                <div className="p-12 text-center">
                                    <div className="text-3xl">⏳</div>
                                    <p className="text-gray-600 mt-2">Memuat profil...</p>
                                </div>
                            ) : profilMurid ? (
                                <>
                                    {/* HEADER MODAL */}
                                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white rounded-t-lg">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-4">
                                                {profilMurid.murid.foto_profil ? (
                                                    <img
                                                        src={`${BASE_URL}${profilMurid.murid.foto_profil}`}
                                                        alt={profilMurid.murid.nama_lengkap}
                                                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow"
                                                    />
                                                ) : (
                                                    <div className="w-20 h-20 bg-white bg-opacity-20 backdrop-blur rounded-full flex items-center justify-center text-white font-bold text-3xl border-4 border-white">
                                                        {profilMurid.murid.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <h2 className="text-2xl font-bold">
                                                    {profilMurid.murid.nama_lengkap}
                                                    </h2>
                                                    <p className="text-blue-100">NIS: {profilMurid.murid.nis}</p>
                                                    <p className="text-blue-100 text-sm">
                                                        Kelas {profilMurid.murid.nama_kelas} • @{profilMurid.murid.username}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => { setShowProfilModal(false); setProfilMurid(null); }}
                                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center text-2xl"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>

                                    {/* BODY MODAL */}
                                    <div className="p-6">
                                        {/* INFO KONTAK */}
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-500 mb-1">📧 Email</p>
                                                <p className="font-medium text-sm">{profilMurid.murid.email || '-'}</p>
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-500 mb-1">📞 No. Telepon</p>
                                                <p className="font-medium text-sm">{profilMurid.murid.no_telepon || '-'}</p>
                                            </div>
                                        </div>

                                    {/* POIN & PERINGKAT */}
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-blue-50 p-4 rounded-lg text-center border-l-4 border-blue-500">
                                            <p className="text-xs text-blue-700 mb-1">Poin Bulan Ini</p>
                                            <p className="text-3xl font-bold text-blue-700">
                                                {profilMurid.murid.poin_bulan_ini}
                                            </p>
                                        </div>
                                        <div className="bg-green-50 p-4 rounded-lg text-center border-l-4 border-green-500">
                                            <p className="text-xs text-green-700 mb-1">Poin Tahun Ini</p>
                                            <p className="text-3xl font-bold text-green-700">
                                                {profilMurid.murid.poin_tahun_ini}
                                            </p>
                                        </div>
                                    </div>

                                    {/* STATISTIK ABSENSI */}
                                    <div className="mb-4">
                                        <h3 className="font-bold text-gray-800 mb-2">
                                            📅 Absensi Bulan Ini
                                        </h3>
                                        <div className="grid grid-cols-5 gap-2 text-center">
                                            <div className="bg-gray-50 p-2 rounded">
                                                <p className="text-xs text-gray-500">Total</p>
                                                <p className="font-bold">{profilMurid.statistik.absensi.total || 0}</p>
                                            </div>
                                            <div className="bg-green-50 p-2 rounded">
                                                <p className="text-xs text-green-600">Hadir</p>
                                                <p className="font-bold text-green-700">{profilMurid.statistik.absensi.hadir || 0}</p>
                                            </div>
                                            <div className="bg-yellow-50 p-2 rounded">
                                                <p className="text-xs text-yellow-600">Telat</p>
                                                <p className="font-bold text-yellow-700">{profilMurid.statistik.absensi.terlambat || 0}</p>
                                            </div>
                                            <div className="bg-blue-50 p-2 rounded">
                                                <p className="text-xs text-blue-600">Izin</p>
                                                <p className="font-bold text-blue-700">{profilMurid.statistik.absensi.izin || 0}</p>
                                            </div>
                                            <div className="bg-red-50 p-2 rounded">
                                                <p className="text-xs text-red-600">Alpa</p>
                                                <p className="font-bold text-red-700">{profilMurid.statistik.absensi.alpa || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* STATISTIK PERILAKU */}
                                    <div className="mb-4">
                                        <h3 className="font-bold text-gray-800 mb-2">
                                            📊 Perilaku Bulan Ini
                                        </h3>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-green-50 p-3 rounded-lg text-center">
                                                <p className="text-xs text-green-600">Positif</p>
                                                <p className="text-2xl font-bold text-green-700">
                                                    {profilMurid.statistik.perilaku.positif || 0}
                                                </p>
                                            </div>
                                            <div className="bg-red-50 p-3 rounded-lg text-center">
                                                <p className="text-xs text-red-600">Negatif</p>
                                                <p className="text-2xl font-bold text-red-700">
                                                    {profilMurid.statistik.perilaku.negatif || 0}
                                                </p>
                                            </div>
                                            <div className="bg-purple-50 p-3 rounded-lg text-center">
                                                <p className="text-xs text-purple-600">Misi Selesai</p>
                                                <p className="text-2xl font-bold text-purple-700">
                                                    {profilMurid.statistik.misi_selesai || 0}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* WALI KELAS */}
                                    {profilMurid.murid.wali_kelas_nama && (
                                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                            <p className="text-xs text-blue-700 font-bold mb-1">👨‍🏫 WALI KELAS</p>
                                            <p className="font-bold">{profilMurid.murid.wali_kelas_nama}</p>
                                            <p className="text-sm text-gray-600">
                                                📧 {profilMurid.murid.wali_kelas_email || '-'} • 
                                                📞 {profilMurid.murid.wali_kelas_telepon || '-'}
                                            </p>
                                        </div>
                                    )}

                                    {/* RIWAYAT PERILAKU */}
                                    {profilMurid.riwayat_perilaku.length > 0 && (
                                        <div className="mb-4">
                                            <h3 className="font-bold text-gray-800 mb-2">
                                                📜 Riwayat Perilaku Terakhir
                                            </h3>
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {profilMurid.riwayat_perilaku.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        className={`flex justify-between items-center p-2 rounded border-l-4 ${
                                                            p.jenis === 'positif'
                                                                ? 'bg-green-50 border-green-500'
                                                                : 'bg-red-50 border-red-500'
                                                        }`}
                                                    >
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{p.deskripsi}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(p.tanggal).toLocaleDateString('id-ID')} • {p.guru_nama}
                                                        </p>
                                                    </div>
                                                    <span className={`font-bold ${p.poin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        {p.poin > 0 ? '+' : ''}{p.poin}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* RIWAYAT BK */}
                                {profilMurid.riwayat_bk.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="font-bold text-gray-800 mb-2">
                                        💬 Riwayat Bimbingan Konseling
                                        </h3>
                                        <div className="space-y-2 max-h-32 overflow-y-auto">
                                            {profilMurid.riwayat_bk.map((bk) => (
                                                <div key={bk.id} className="p-2 bg-gray-50 rounded text-sm">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-medium">{bk.judul}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {new Date(bk.created_at).toLocaleDateString('id-ID')} • 
                                                                ke {bk.penerima_nama} • {bk.kategori}
                                                            </p>
                                                        </div>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${
                                                            bk.status === 'selesai' ? 'bg-green-100 text-green-700' :
                                                            bk.status === 'dibalas' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                            {bk.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TOMBOL AKSI */}
                                <div className="flex gap-2 pt-4 border-t">
                                    <button
                                        onClick={() => {
                                            setShowProfilModal(false);
                                            setProfilMurid(null);
                                            navigate(`/perilaku?murid_id=${profilMurid.murid.id}`);
                                        }}
                                        className="btn-primary flex-1"
                                    >
                                        📝 Catat Perilaku
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowProfilModal(false);
                                            setProfilMurid(null);
                                        }}
                                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="p-12 text-center">
                            <p className="text-red-600">Gagal memuat profil murid</p>
                            <button
                                onClick={() => { setShowProfilModal(false); setProfilMurid(null); }}
                                className="btn-primary mt-4"
                            >
                                Tutup
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}
        </div>
    );
}