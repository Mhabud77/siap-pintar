import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Kategori default
const KATEGORI_OPTIONS = [
    'Kebersihan',
    'Sosial',
    'Lingkungan',
    'Akademik',
    'Kesehatan',
    'Kepemimpinan',
    'Kreativitas',
    'Pengembangan Diri',
    'Umum'
];

export default function DataMisi() {
    const navigate = useNavigate();
    const [misiList, setMisiList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [filterAktif, setFilterAktif] = useState('');
    const [filterKategori, setFilterKategori] = useState('');
    const [search, setSearch] = useState('');

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingMisi, setEditingMisi] = useState(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        judul: '',
        deskripsi: '',
        poin_reward: 10,
        kategori: 'Umum',
        aktif: true
    });

    useEffect(() => {
        loadMisi();
    }, []);

    const loadMisi = async () => {
        setLoading(true);
        try {
            const res = await api.get('/misi');
            setMisiList(res.data.data || []);
        } catch (err) {
            console.error('Error load misi:', err);
            setMessage({ type: 'error', text: 'Gagal memuat data misi' });
        }
        setLoading(false);
    };

    const resetForm = () => {
        setForm({
            judul: '',
            deskripsi: '',
            poin_reward: 10,
            kategori: 'Umum',
            aktif: true
        });
        setEditingMisi(null);
    };

    const openTambahModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (misi) => {
        setEditingMisi(misi);
        setForm({
            judul: misi.judul,
            deskripsi: misi.deskripsi,
            poin_reward: misi.poin_reward,
            kategori: misi.kategori || 'Umum',
            aktif: misi.aktif ? true : false
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingMisi) {
                await api.put(`/misi/${editingMisi.id}`, form);
                setMessage({ type: 'success', text: '✅ Misi berhasil diupdate!' });
            } else {
                await api.post('/misi', form);
                setMessage({ type: 'success', text: '✅ Misi berhasil ditambahkan!' });
            }
            setShowModal(false);
            resetForm();
            loadMisi();
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan')
            });
        }
        setSaving(false);
    };

    const handleDelete = async (misi) => {
        if (!confirm(`Yakin hapus misi "${misi.judul}"?`)) return;

        try {
            await api.delete(`/misi/${misi.id}`);
            setMessage({ type: 'success', text: '✅ Misi berhasil dihapus!' });
            loadMisi();
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menghapus')
            });
        }
    };

    const handleToggleAktif = async (misi) => {
        try {
            await api.patch(`/misi/${misi.id}/toggle`);
            setMessage({
                type: 'success',
                text: `✅ Misi "${misi.judul}" berhasil di${misi.aktif ? 'nonaktifkan' : 'aktifkan'}`
            });
            loadMisi();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal mengubah status' });
        }
    };

    // Filter
    const filteredMisi = misiList.filter(m => {
        const matchAktif = filterAktif === '' || String(m.aktif) === filterAktif;
        const matchKategori = !filterKategori || m.kategori === filterKategori;
        const matchSearch =
            m.judul?.toLowerCase().includes(search.toLowerCase()) ||
            m.deskripsi?.toLowerCase().includes(search.toLowerCase());
        return matchAktif && matchKategori && matchSearch;
    });

    // Statistik
    const totalMisi = misiList.length;
    const totalAktif = misiList.filter(m => m.aktif).length;
    const totalNonaktif = totalMisi - totalAktif;
    const totalPengerjaan = misiList.reduce((sum, m) => sum + (m.total_pengerjaan || 0), 0);

    // Kategori unik dari misiList
    const kategoriUnik = [...new Set(misiList.map(m => m.kategori).filter(Boolean))];

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-primary hover:underline mb-2 text-sm"
                    >
                        ← Kembali ke Dashboard
                    </button>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">
                                🎯 Data Misi Kebaikan
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Kelola misi kebaikan untuk murid
                            </p>
                        </div>
                        <button
                            onClick={openTambahModal}
                            className="btn-primary"
                        >
                            ➕ Tambah Misi Baru
                        </button>
                    </div>
                </div>

                {/* STATISTIK */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card border-l-4 border-blue-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Total Misi</p>
                        <p className="text-3xl font-bold text-blue-700">{totalMisi}</p>
                    </div>
                    <div className="card border-l-4 border-green-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Misi Aktif</p>
                        <p className="text-3xl font-bold text-green-700">{totalAktif}</p>
                    </div>
                    <div className="card border-l-4 border-gray-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Nonaktif</p>
                        <p className="text-3xl font-bold text-gray-700">{totalNonaktif}</p>
                    </div>
                    <div className="card border-l-4 border-purple-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Total Pengerjaan</p>
                        <p className="text-3xl font-bold text-purple-700">{totalPengerjaan}</p>
                    </div>
                </div>

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

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                value={filterAktif}
                                onChange={(e) => setFilterAktif(e.target.value)}
                                className="input-field"
                            >
                                <option value="">Semua</option>
                                <option value="true">Aktif</option>
                                <option value="false">Nonaktif</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Kategori
                            </label>
                            <select
                                value={filterKategori}
                                onChange={(e) => setFilterKategori(e.target.value)}
                                className="input-field"
                            >
                                <option value="">Semua Kategori</option>
                                {kategoriUnik.map(k => (
                                    <option key={k} value={k}>{k}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Cari
                            </label>
                            <input
                                type="text"
                                placeholder="🔍 Cari judul atau deskripsi misi..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field"
                            />
                        </div>
                    </div>
                </div>

                {/* LIST MISI */}
                {loading ? (
                    <div className="card text-center py-12 text-gray-500">
                        ⏳ Memuat data...
                    </div>
                ) : filteredMisi.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <h2 className="text-xl font-bold text-gray-800">
                            Belum Ada Misi
                        </h2>
                        <p className="text-gray-600 mt-2">
                            Klik tombol "Tambah Misi Baru" untuk membuat misi pertama.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredMisi.map((misi) => (
                            <div
                                key={misi.id}
                                className={`card border-l-4 ${
                                    misi.aktif ? 'border-green-500' : 'border-gray-300 opacity-70'
                                }`}
                            >
                                {/* HEADER CARD */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 className="font-bold text-lg text-gray-800">
                                                {misi.judul}
                                            </h3>
                                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                                                misi.aktif
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-200 text-gray-600'
                                            }`}>
                                                {misi.aktif ? '✓ AKTIF' : '✕ NONAKTIF'}
                                            </span>
                                        </div>
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                            {misi.kategori || 'Umum'}
                                        </span>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-2xl font-bold text-primary">
                                            +{misi.poin_reward}
                                        </p>
                                        <p className="text-xs text-gray-500">poin</p>
                                    </div>
                                </div>

                                {/* DESKRIPSI */}
                                <p className="text-sm text-gray-600 mb-3">
                                    {misi.deskripsi}
                                </p>

                                {/* STATISTIK */}
                                <div className="grid grid-cols-3 gap-2 mb-3 text-center text-xs">
                                    <div className="bg-gray-50 rounded p-2">
                                        <p className="text-gray-500">Total</p>
                                        <p className="font-bold text-gray-800">
                                            {misi.total_pengerjaan || 0}
                                        </p>
                                    </div>
                                    <div className="bg-yellow-50 rounded p-2">
                                        <p className="text-yellow-600">Menunggu</p>
                                        <p className="font-bold text-yellow-700">
                                            {misi.total_menunggu || 0}
                                        </p>
                                    </div>
                                    <div className="bg-green-50 rounded p-2">
                                        <p className="text-green-600">Divalidasi</p>
                                        <p className="font-bold text-green-700">
                                            {misi.total_divalidasi || 0}
                                        </p>
                                    </div>
                                </div>

                                {/* AKSI */}
                                <div className="flex gap-2 pt-3 border-t border-gray-200">
                                    <button
                                        onClick={() => openEditModal(misi)}
                                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleToggleAktif(misi)}
                                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                                            misi.aktif
                                                ? 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700'
                                                : 'bg-green-50 hover:bg-green-100 text-green-700'
                                        }`}
                                    >
                                        {misi.aktif ? '⏸️ Nonaktifkan' : '▶️ Aktifkan'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(misi)}
                                        className="bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MODAL TAMBAH/EDIT */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {editingMisi ? '✏️ Edit Misi' : '➕ Tambah Misi Baru'}
                                </h2>
                                <button
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* Judul */}
                                <div className="mb-3">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Judul Misi <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.judul}
                                        onChange={(e) => setForm({ ...form, judul: e.target.value })}
                                        className="input-field"
                                        placeholder="Contoh: Membersihkan Kelas"
                                        required
                                        maxLength={100}
                                    />
                                </div>

                                {/* Deskripsi */}
                                <div className="mb-3">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Deskripsi <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={form.deskripsi}
                                        onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                                        className="input-field"
                                        rows="3"
                                        placeholder="Jelaskan detail misi yang harus dilakukan murid..."
                                        required
                                    />
                                </div>

                                {/* Grid Kategori + Poin */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            Kategori
                                        </label>
                                        <select
                                            value={form.kategori}
                                            onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                                            className="input-field"
                                        >
                                            {KATEGORI_OPTIONS.map(k => (
                                                <option key={k} value={k}>{k}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            Poin Reward <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={form.poin_reward}
                                            onChange={(e) => setForm({ ...form, poin_reward: parseInt(e.target.value) || 0 })}
                                            className="input-field"
                                            min="1"
                                            max="100"
                                            required
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Antara 1 - 100
                                        </p>
                                    </div>
                                </div>

                                {/* Preview Poin */}
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-3">
                                    <p className="text-sm text-blue-700">
                                        💡 Poin reward: <strong>+{form.poin_reward}</strong> akan ditambahkan ke poin murid setelah misi divalidasi wali kelas.
                                    </p>
                                </div>

                                {/* Status Aktif */}
                                <div className="mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.aktif}
                                            onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            Aktifkan misi ini (muncul di daftar murid)
                                        </span>
                                    </label>
                                </div>

                                {/* Tombol */}
                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-primary flex-1 disabled:opacity-50"
                                    >
                                        {saving ? '⏳ Menyimpan...' : '💾 Simpan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowModal(false); resetForm(); }}
                                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}