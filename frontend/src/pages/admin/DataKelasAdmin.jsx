import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function DataKelasAdmin() {
    const navigate = useNavigate();
    const [kelasList, setKelasList] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // Modal edit
    const [showModal, setShowModal] = useState(false);
    const [editingKelas, setEditingKelas] = useState(null);
    const [form, setForm] = useState({ nama_kelas: '', tingkat: '7', wali_kelas_id: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadKelas();
    }, []);

    const loadKelas = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin-data/kelas');
            setKelasList(res.data.data || []);
            setGuruList(res.data.guru_list || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const openEdit = (kelas) => {
        setEditingKelas(kelas);
        setForm({
            nama_kelas: kelas.nama_kelas,
            tingkat: kelas.tingkat,
            wali_kelas_id: kelas.wali_kelas_id || ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/admin-data/kelas/${editingKelas.id}`, form);
            setMessage({ type: 'success', text: '✅ Kelas berhasil diupdate!' });
            setShowModal(false);
            loadKelas();
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan')
            });
        }
        setSaving(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-primary hover:underline mb-2 text-sm"
                    >
                        ← Kembali ke Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">
                        🏫 Kelola Data Kelas
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Atur wali kelas & lihat jumlah murid
                    </p>
                </div>

                {message && (
                    <div className={`card mb-4 border-l-4 ${
                        message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                    }`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                            {message.text}
                        </p>
                    </div>
                )}

                <div className="card">
                    <h2 className="text-lg font-bold mb-4">
                        Daftar Kelas ({kelasList.length})
                    </h2>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">⏳ Memuat...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="px-4 py-2 text-left">No</th>
                                        <th className="px-4 py-2 text-left">Kelas</th>
                                        <th className="px-4 py-2 text-left">Tingkat</th>
                                        <th className="px-4 py-2 text-left">Wali Kelas</th>
                                        <th className="px-4 py-2 text-center">Jumlah Murid</th>
                                        <th className="px-4 py-2 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {kelasList.map((k, i) => (
                                        <tr key={k.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{i + 1}</td>
                                            <td className="px-4 py-3 font-bold">{k.nama_kelas}</td>
                                            <td className="px-4 py-3">{k.tingkat}</td>
                                            <td className="px-4 py-3">
                                                {k.wali_kelas_nama || (
                                                    <span className="text-red-500 text-sm italic">Belum diset</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="bg-gray-100 px-3 py-1 rounded-full font-bold text-sm">
                                                    {k.jumlah_murid} murid
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => openEdit(k)}
                                                    className="text-primary hover:underline text-sm"
                                                >
                                                    ✏️ Edit
                                                </button>
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
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <h2 className="text-xl font-bold mb-4">
                                ✏️ Edit Kelas {editingKelas?.nama_kelas}
                            </h2>

                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Nama Kelas</label>
                                    <input
                                        type="text"
                                        value={form.nama_kelas}
                                        onChange={(e) => setForm({ ...form, nama_kelas: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Tingkat</label>
                                    <select
                                        value={form.tingkat}
                                        onChange={(e) => setForm({ ...form, tingkat: e.target.value })}
                                        className="input-field"
                                        required
                                    >
                                        <option value="7">7</option>
                                        <option value="8">8</option>
                                        <option value="9">9</option>
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-1">Wali Kelas</label>
                                    <select
                                        value={form.wali_kelas_id}
                                        onChange={(e) => setForm({ ...form, wali_kelas_id: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="">-- Tidak Ada Wali Kelas --</option>
                                        {guruList.map(g => (
                                            <option
                                                key={g.id}
                                                value={g.id}
                                                disabled={g.jumlah_kelas_diampu > 0 && g.id !== editingKelas?.wali_kelas_id}
                                            >
                                                {g.nama_lengkap}
                                                {g.jumlah_kelas_diampu > 0 && g.id !== editingKelas?.wali_kelas_id
                                                    ? ` (sudah wali ${g.jumlah_kelas_diampu} kelas)`
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
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
                                        onClick={() => setShowModal(false)}
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