import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function DataGuruAdmin() {
    const navigate = useNavigate();
    const [guruList, setGuruList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [message, setMessage] = useState(null);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingGuru, setEditingGuru] = useState(null);
    const [saving, setSaving] = useState(false);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [fotoFile, setFotoFile] = useState(null);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        username: '',
        nip: '',
        password: '',
        nama_lengkap: '',
        email: '',
        no_telepon: '',
        jenis_guru: 'mapel',
        role: 'guru'
    });

    useEffect(() => {
        loadGuru();
    }, []);

    const loadGuru = async () => {
        setLoading(true);
        try {
            let url = '/admin-data/guru';
            if (search) url += `?search=${encodeURIComponent(search)}`;
            const res = await api.get(url);
            setGuruList(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => loadGuru(), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const resetForm = () => {
        setForm({
            username: '',
            nip: '',
            password: '',
            nama_lengkap: '',
            email: '',
            no_telepon: '',
            jenis_guru: 'mapel',
            role: 'guru'
        });
        setEditingGuru(null);
        setFotoPreview(null);
        setFotoFile(null);
    };

    const openTambah = () => {
        resetForm();
        setShowModal(true);
    };

    const openEdit = (guru) => {
        setEditingGuru(guru);
        setForm({
            username: guru.username || '',
            nip: guru.nip || '',
            password: '',
            nama_lengkap: guru.nama_lengkap || '',
            email: guru.email || '',
            no_telepon: guru.no_telepon || '',
            jenis_guru: guru.jenis_guru || 'mapel',
            role: guru.role || 'guru'
        });
        setFotoPreview(guru.foto_profil
            ? `${BASE_URL}${guru.foto_profil}`
            : null
        );
        setFotoFile(null);
        setShowModal(true);
    };

    const handleFotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: '❌ Ukuran foto maksimal 2MB' });
            return;
        }

        setFotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setFotoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const formData = new FormData();
            formData.append('username', form.username);
            formData.append('nip', form.nip || '');
            formData.append('nama_lengkap', form.nama_lengkap);
            formData.append('email', form.email || '');
            formData.append('no_telepon', form.no_telepon || '');
            formData.append('jenis_guru', form.jenis_guru);
            formData.append('role', form.role);
            if (form.password) formData.append('password', form.password);
            if (fotoFile) formData.append('foto_profil', fotoFile);

            if (editingGuru) {
                await api.put(`/admin-data/guru/${editingGuru.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setMessage({ type: 'success', text: '✅ Guru berhasil diupdate!' });
            } else {
                await api.post('/admin-data/guru', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setMessage({ type: 'success', text: '✅ Guru berhasil ditambahkan!' });
            }

            setShowModal(false);
            resetForm();
            loadGuru();
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan')
            });
        }
        setSaving(false);
    };

    const handleDelete = async (guru) => {
        if (!confirm(`Yakin hapus guru "${guru.nama_lengkap}"?`)) return;

        try {
            await api.delete(`/admin-data/guru/${guru.id}`);
            setMessage({ type: 'success', text: '✅ Guru berhasil dihapus!' });
            loadGuru();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal menghapus' });
        }
    };

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
                                👨‍🏫 Kelola Data Guru
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Tambah, edit, dan hapus data guru
                            </p>
                        </div>
                        <button onClick={openTambah} className="btn-primary">
                            ➕ Tambah Guru
                        </button>
                    </div>
                </div>

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

                {/* SEARCH */}
                <div className="card mb-4">
                    <input
                        type="text"
                        placeholder="🔍 Cari nama, username, atau NIP..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input-field"
                    />
                </div>

                {/* TABEL */}
                <div className="card">
                    <h2 className="text-lg font-bold mb-4">
                        Daftar Guru ({guruList.length})
                    </h2>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">⏳ Memuat...</div>
                    ) : guruList.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-gray-600">Tidak ada data guru</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="px-4 py-2 text-left">No</th>
                                        <th className="px-4 py-2 text-left">Foto</th>
                                        <th className="px-4 py-2 text-left">Nama</th>
                                        <th className="px-4 py-2 text-left">NIP</th>
                                        <th className="px-4 py-2 text-left">Username</th>
                                        <th className="px-4 py-2 text-left">Kontak</th>
                                        <th className="px-4 py-2 text-left">Status</th>
                                        <th className="px-4 py-2 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {guruList.map((g, i) => (
                                        <tr key={g.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                {g.foto_profil ? (
                                                    <img
                                                        src={`${BASE_URL}${g.foto_profil}`}
                                                        alt={g.nama_lengkap}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                                        {g.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium">{g.nama_lengkap}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                                                {g.nip || <span className="text-gray-400 italic">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                                {g.username}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <p>{g.email || '-'}</p>
                                                <p className="text-xs text-gray-500">{g.no_telepon || '-'}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {g.jumlah_kelas_diampu > 0 ? (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">
                                                        Wali {g.wali_kelas_dari}
                                                    </span>
                                                ) : g.role === 'guru_bk' || g.jenis_guru === 'bk' ? (
                                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">
                                                        GURU BK
                                                    </span>
                                                ) : (
                                                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                                        Guru Mapel
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex gap-1 justify-center">
                                                    <button
                                                        onClick={() => openEdit(g)}
                                                        className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(g)}
                                                        className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium"
                                                    >
                                                        🗑️ Hapus
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

                {/* MODAL */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">
                                    {editingGuru ? '✏️ Edit Guru' : '➕ Tambah Guru'}
                                </h2>
                                <button
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="text-gray-400 hover:text-gray-600 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* FOTO PROFIL */}
                                <div className="mb-4 flex flex-col items-center">
                                    {fotoPreview ? (
                                        <img
                                            src={fotoPreview}
                                            alt="Preview"
                                            className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 mb-2"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-2">
                                            {form.nama_lengkap
                                                ? form.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
                                                : '?'}
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFotoChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current.click()}
                                        className="text-sm text-primary hover:underline"
                                    >
                                        📷 {fotoPreview ? 'Ganti Foto' : 'Upload Foto'}
                                    </button>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Maks 2MB (JPG, PNG, WEBP)
                                    </p>
                                </div>

                                {/* NAMA LENGKAP */}
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">
                                        Nama Lengkap *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.nama_lengkap}
                                        onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>

                                {/* NIP */}
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">
                                        NIP
                                        <span className="text-xs font-normal text-gray-500 ml-2">(opsional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.nip}
                                        onChange={(e) => setForm({ ...form, nip: e.target.value })}
                                        className="input-field"
                                        placeholder="Contoh: 197001011990011001"
                                        maxLength={30}
                                    />
                                </div>

                                {/* USERNAME */}
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Username *</label>
                                    <input
                                        type="text"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>

                                {/* PASSWORD */}
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">
                                        Password {editingGuru && '(kosongkan jika tidak diubah)'}
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="input-field"
                                        required={!editingGuru}
                                    />
                                </div>

                                {/* JENIS GURU */}
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Jenis Guru *</label>
                                    <select
                                        value={form.jenis_guru}
                                        onChange={(e) => {
                                            const jg = e.target.value;
                                            setForm({
                                                ...form,
                                                jenis_guru: jg,
                                                role: jg === 'bk' ? 'guru_bk' : 'guru'
                                            });
                                        }}
                                        className="input-field"
                                        required
                                    >
                                        <option value="mapel">Guru Mapel</option>
                                        <option value="wali_kelas">Wali Kelas</option>
                                        <option value="bk">Guru BK</option>
                                    </select>
                                </div>

                                {/* EMAIL */}
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="input-field"
                                    />
                                </div>

                                {/* NO TELEPON */}
                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-1">No. Telepon</label>
                                    <input
                                        type="text"
                                        value={form.no_telepon}
                                        onChange={(e) => setForm({ ...form, no_telepon: e.target.value })}
                                        className="input-field"
                                    />
                                </div>

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