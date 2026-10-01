import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function DataMuridAdmin() {
    const navigate = useNavigate();
    const [muridList, setMuridList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [filterJK, setFilterJK] = useState('');
    const [page, setPage] = useState(0);
    const [message, setMessage] = useState(null);
    const limit = 50;

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [editingMurid, setEditingMurid] = useState(null);
    const [saving, setSaving] = useState(false);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [fotoFile, setFotoFile] = useState(null);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        username: '', password: '', nama_lengkap: '', nis: '',
        jenis_kelamin: 'L', kelas_id: '', email: '', no_telepon: ''
    });

    useEffect(() => { loadMurid(); }, [filterKelas, filterJK, page]);

    useEffect(() => {
        const timer = setTimeout(() => { setPage(0); loadMurid(); }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const loadMurid = async () => {
        setLoading(true);
        try {
            let url = `/admin-data/murid?limit=${limit}&offset=${page * limit}`;
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (filterKelas) url += `&kelas_id=${filterKelas}`;
            if (filterJK) url += `&jenis_kelamin=${filterJK}`;

            const res = await api.get(url);
            setMuridList(res.data.data || []);
            setKelasList(res.data.kelas_list || []);
            setPagination(res.data.pagination);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const openTambah = () => {
        setEditingMurid(null);
        setForm({
            username: '', password: '', nama_lengkap: '', nis: '',
            jenis_kelamin: 'L', kelas_id: kelasList[0]?.id || '', email: '', no_telepon: ''
        });
        setFotoPreview(null);
        setFotoFile(null);
        setShowModal(true);
    };

    const openEdit = (murid) => {
        setEditingMurid(murid);
        setForm({
            username: murid.username,
            password: '',
            nama_lengkap: murid.nama_lengkap,
            nis: murid.nis,
            jenis_kelamin: murid.jenis_kelamin || 'L',
            kelas_id: murid.kelas_id,
            email: murid.email || '',
            no_telepon: ''
        });
        setFotoPreview(murid.foto_profil ? `${BASE_URL}${murid.foto_profil}` : null);
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
            formData.append('nama_lengkap', form.nama_lengkap);
            formData.append('nis', form.nis);
            formData.append('jenis_kelamin', form.jenis_kelamin);
            formData.append('kelas_id', form.kelas_id);
            formData.append('email', form.email);
            formData.append('no_telepon', form.no_telepon);
            if (form.password) formData.append('password', form.password);
            if (fotoFile) formData.append('foto_profil', fotoFile);

            if (editingMurid) {
                await api.put(`/admin-data/murid/${editingMurid.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setMessage({ type: 'success', text: '✅ Murid berhasil diupdate!' });
            } else {
                await api.post('/admin-data/murid', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setMessage({ type: 'success', text: '✅ Murid berhasil ditambahkan!' });
            }

            setShowModal(false);
            loadMurid();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ ' + (err.response?.data?.message || 'Gagal') });
        }
        setSaving(false);
    };

    const handleDelete = async (murid) => {
        if (!confirm(`Yakin hapus murid "${murid.nama_lengkap}"?`)) return;
        try {
            await api.delete(`/admin-data/murid/${murid.id}`);
            setMessage({ type: 'success', text: '✅ Murid berhasil dihapus!' });
            loadMurid();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal menghapus' });
        }
    };

    const totalPages = pagination ? Math.ceil(pagination.total / limit) : 0;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <button onClick={() => navigate('/admin')} className="text-primary hover:underline mb-2 text-sm">
                        ← Kembali ke Dashboard
                    </button>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">👨‍🎓 Kelola Data Murid</h1>
                            <p className="text-gray-600 mt-1">Tambah, edit, dan hapus data murid</p>
                        </div>
                        <button onClick={openTambah} className="btn-primary">➕ Tambah Murid</button>
                    </div>
                </div>

                {message && (
                    <div className={`card mb-4 border-l-4 ${message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
                    </div>
                )}

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <input type="text" placeholder="🔍 Cari nama atau NIS..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field md:col-span-2" />
                        <select value={filterKelas} onChange={(e) => { setFilterKelas(e.target.value); setPage(0); }} className="input-field">
                            <option value="">Semua Kelas</option>
                            {kelasList.map(k => (<option key={k.id} value={k.id}>{k.nama_kelas}</option>))}
                        </select>
                        <select value={filterJK} onChange={(e) => { setFilterJK(e.target.value); setPage(0); }} className="input-field">
                            <option value="">Semua JK</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </select>
                    </div>
                </div>

                {/* TABEL */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">Daftar Murid ({pagination?.total || 0})</h2>
                        <button onClick={loadMurid} className="text-primary hover:underline text-sm">🔄 Refresh</button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">⏳ Memuat...</div>
                    ) : muridList.length === 0 ? (
                        <div className="text-center py-12"><div className="text-6xl mb-4">📭</div><p className="text-gray-600">Tidak ada data murid</p></div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="table-header">
                                            <th className="px-3 py-2 text-left">No</th>
                                            <th className="px-3 py-2 text-left">Foto</th>
                                            <th className="px-3 py-2 text-left">Nama</th>
                                            <th className="px-3 py-2 text-left">NIS</th>
                                            <th className="px-3 py-2 text-center">JK</th>
                                            <th className="px-3 py-2 text-left">Kelas</th>
                                            <th className="px-3 py-2 text-center">Poin</th>
                                            <th className="px-3 py-2 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {muridList.map((m, i) => (
                                            <tr key={m.id} className="border-b hover:bg-gray-50">
                                                <td className="px-3 py-3">{page * limit + i + 1}</td>
                                                <td className="px-3 py-3">
                                                    {m.foto_profil ? (
                                                        <img src={`${BASE_URL}${m.foto_profil}`} alt={m.nama_lengkap} className="w-10 h-10 rounded-full object-cover border-2 border-gray-200" />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                            {m.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 font-medium">{m.nama_lengkap}</td>
                                                <td className="px-3 py-3 text-sm font-mono">{m.nis}</td>
                                                <td className="px-3 py-3 text-center">
                                                    {m.jenis_kelamin === 'L' ? (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">L</span>
                                                    ) : m.jenis_kelamin === 'P' ? (
                                                        <span className="text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded font-bold">P</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{m.nama_kelas}</span>
                                                </td>
                                                <td className="px-3 py-3 text-center font-bold">{m.poin_bulan_ini}</td>
                                                <td className="px-3 py-3 text-center">
                                                    <div className="flex gap-1 justify-center">
                                                        <button onClick={() => openEdit(m)} className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium">✏️ Edit</button>
                                                        <button onClick={() => handleDelete(m)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium">🗑️ Hapus</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                    <p className="text-sm text-gray-600">Halaman {page + 1} dari {totalPages}</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="btn-primary disabled:opacity-50">← Sebelumnya</button>
                                        <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="btn-primary disabled:opacity-50">Selanjutnya →</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">{editingMurid ? '✏️ Edit Murid' : '➕ Tambah Murid'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                {/* FOTO */}
                                <div className="mb-4 flex flex-col items-center">
                                    {fotoPreview ? (
                                        <img src={fotoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-blue-200 mb-2" />
                                    ) : (
                                        <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-2">
                                            {form.nama_lengkap ? form.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : '?'}
                                        </div>
                                    )}
                                    <input type="file" ref={fileInputRef} onChange={handleFotoChange} accept="image/*" className="hidden" />
                                    <button type="button" onClick={() => fileInputRef.current.click()} className="text-sm text-primary hover:underline">
                                        📷 {fotoPreview ? 'Ganti Foto' : 'Upload Foto'}
                                    </button>
                                    <p className="text-xs text-gray-500 mt-1">Maks 2MB</p>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Nama Lengkap *</label>
                                    <input type="text" value={form.nama_lengkap} onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })} className="input-field" required />
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">NIS *</label>
                                        <input type="text" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} className="input-field" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Jenis Kelamin *</label>
                                        <select value={form.jenis_kelamin} onChange={(e) => setForm({ ...form, jenis_kelamin: e.target.value })} className="input-field" required>
                                            <option value="L">👦 Laki-laki</option>
                                            <option value="P">👧 Perempuan</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Kelas *</label>
                                    <select value={form.kelas_id} onChange={(e) => setForm({ ...form, kelas_id: e.target.value })} className="input-field" required>
                                        <option value="">-- Pilih Kelas --</option>
                                        {kelasList.map(k => (<option key={k.id} value={k.id}>{k.nama_kelas}</option>))}
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Username *</label>
                                    <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="input-field" required />
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Password {editingMurid && '(kosongkan jika tidak diubah)'}</label>
                                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" required={!editingMurid} />
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div>
                                        <label className="block text-sm font-bold mb-1">Email</label>
                                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold mb-1">No. Telepon</label>
                                        <input type="text" value={form.no_telepon} onChange={(e) => setForm({ ...form, no_telepon: e.target.value })} className="input-field" />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">{saving ? '⏳ Menyimpan...' : '💾 Simpan'}</button>
                                    <button type="button" onClick={() => setShowModal(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg">Batal</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}