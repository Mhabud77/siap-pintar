import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function KelolaUser() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    // State untuk Reset Password
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetUser, setResetUser] = useState(null);
    const [resetPassword, setResetPassword] = useState('guru123');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetResult, setResetResult] = useState(null);

    const [message, setMessage] = useState(null);

    const [form, setForm] = useState({
        username: '',
        nip: '',
        password: '',
        role: 'guru',
        jenis_guru: 'mapel',
        nama_lengkap: '',
        email: '',
        no_telepon: ''
    });

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data.data || []);
        } catch (err) {
            setMessage({ type: 'error', text: 'Gagal memuat data user' });
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, form);
                setMessage({ type: 'success', text: '✅ User berhasil diupdate!' });
            } else {
                await api.post('/users', form);
                setMessage({ type: 'success', text: '✅ User berhasil ditambahkan!' });
            }
            setShowModal(false);
            resetForm();
            loadUsers();
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan')
            });
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setForm({
            username: user.username || '',
            nip: user.nip || '',
            password: '',
            role: user.role || 'guru',
            jenis_guru: user.jenis_guru || 'mapel',
            nama_lengkap: user.nama_lengkap || '',
            email: user.email || '',
            no_telepon: user.no_telepon || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin hapus user ini?')) return;
        try {
            await api.delete(`/users/${id}`);
            setMessage({ type: 'success', text: '✅ User berhasil dihapus!' });
            loadUsers();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal menghapus' });
        }
    };

    const resetForm = () => {
        setForm({
            username: '',
            nip: '',
            password: '',
            role: 'guru',
            jenis_guru: 'mapel',
            nama_lengkap: '',
            email: '',
            no_telepon: ''
        });
        setEditingUser(null);
    };

    const filteredUsers = users.filter(u => {
        const matchSearch =
            u.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
            u.username?.toLowerCase().includes(search.toLowerCase()) ||
            u.nip?.toLowerCase().includes(search.toLowerCase());
        const matchRole = !filterRole || u.role === filterRole;
        return matchSearch && matchRole;
    });

    const getRoleBadge = (role) => {
        const colors = {
            admin: 'bg-red-100 text-red-700',
            kepsek: 'bg-purple-100 text-purple-700',
            guru: 'bg-blue-100 text-blue-700',
            guru_bk: 'bg-indigo-100 text-indigo-700',
            murid: 'bg-green-100 text-green-700',
            orangtua: 'bg-yellow-100 text-yellow-700'
        };
        return colors[role] || 'bg-gray-100 text-gray-700';
    };

    const openResetModal = (user) => {
        setResetUser(user);
        setResetPassword('guru123');   // default password
        setResetResult(null);
        setShowResetModal(true);
    };

    const handleResetPassword = async () => {
        if (!resetPassword || resetPassword.length < 6) {
            alert('Password minimal 6 karakter!');
            return;
        }

        if (!confirm(`Yakin reset password ${resetUser.nama_lengkap} menjadi "${resetPassword}"?`)) {
            return;
        }

        setResetLoading(true);
        try {
            const res = await api.post(`/users/${resetUser.id}/reset-password`, {
                password_baru: resetPassword
            });
            setResetResult(res.data.data);
        } catch (err) {
            alert('Gagal reset: ' + (err.response?.data?.message || err.message));
        }
        setResetLoading(false);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('✅ Password disalin: ' + text);
    };

    // Cek apakah role perlu NIP
    const perluNIP = ['admin', 'kepsek', 'guru', 'guru_bk'].includes(form.role);

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">👥 Kelola User</h1>
                        <p className="text-gray-600 mt-1">Total {users.length} user terdaftar</p>
                    </div>
                    <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary">
                        ➕ Tambah User
                    </button>
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

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <input
                            type="text"
                            placeholder="🔍 Cari nama, username, atau NIP..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input-field"
                        />
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="input-field"
                        >
                            <option value="">Semua Role</option>
                            <option value="admin">Admin</option>
                            <option value="kepsek">Kepala Sekolah</option>
                            <option value="guru">Guru</option>
                            <option value="guru_bk">Guru BK</option>
                            <option value="murid">Murid</option>
                            <option value="orangtua">Orang Tua</option>
                        </select>
                    </div>
                </div>

                {/* TABEL */}
                <div className="card overflow-x-auto">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">⏳ Memuat...</div>
                    ) : (
                        <table className="min-w-full">
                            <thead>
                                <tr className="table-header">
                                    <th className="px-4 py-2">No</th>
                                    <th className="px-4 py-2">Nama</th>
                                    <th className="px-4 py-2">Username</th>
                                    <th className="px-4 py-2">NIP</th>
                                    <th className="px-4 py-2">Role</th>
                                    <th className="px-4 py-2">Email</th>
                                    <th className="px-4 py-2">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u, i) => (
                                    <tr key={u.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-2">{i + 1}</td>
                                        <td className="px-4 py-2 font-medium">{u.nama_lengkap}</td>
                                        <td className="px-4 py-2 font-mono text-sm">{u.username}</td>
                                        <td className="px-4 py-2 font-mono text-xs text-gray-600">
                                            {u.nip || <span className="text-gray-400 italic">-</span>}
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`text-xs px-2 py-1 rounded ${getRoleBadge(u.role)}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-gray-600">{u.email || '-'}</td>
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => handleEdit(u)}
                                                className="text-blue-600 hover:underline mr-3 text-sm"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button
                                                onClick={() => openResetModal(u)}
                                                className="text-orange-600 hover:underline text-sm"
                                                title="Reset password"
                                            >
                                                🔑 Reset
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                className="text-red-600 hover:underline text-sm"
                                            >
                                                🗑️ Hapus
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
                            <h2 className="text-xl font-bold mb-4">
                                {editingUser ? '✏️ Edit User' : '➕ Tambah User'}
                            </h2>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Nama Lengkap *</label>
                                    <input
                                        type="text"
                                        value={form.nama_lengkap}
                                        onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>

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

                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">
                                        NIP
                                        {perluNIP ? (
                                            <span className="text-xs text-orange-500 ml-2">(disarankan untuk role ini)</span>
                                        ) : (
                                            <span className="text-xs text-gray-500 ml-2">(tidak perlu)</span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        value={form.nip}
                                        onChange={(e) => setForm({ ...form, nip: e.target.value })}
                                        className="input-field font-mono"
                                        placeholder="Contoh: 197001011990011001"
                                        maxLength={30}
                                        disabled={!perluNIP}
                                    />
                                    {perluNIP && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            NIP hanya untuk guru/pegawai. Kosongkan jika tidak ada.
                                        </p>
                                    )}
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">
                                        Password {editingUser && '(kosongkan jika tidak diubah)'}
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        className="input-field"
                                        required={!editingUser}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Role</label>
                                    <select
                                        value={form.role}
                                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                                        className="input-field"
                                        required
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="kepsek">Kepala Sekolah</option>
                                        <option value="guru">Guru</option>
                                        <option value="guru_bk">Guru BK</option>
                                        <option value="murid">Murid</option>
                                        <option value="orangtua">Orang Tua</option>
                                    </select>
                                </div>

                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                                        className="input-field"
                                    />
                                </div>

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
                                    <button type="submit" className="btn-primary flex-1">
                                        Simpan
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
            {/* ============================================ */}
{/* MODAL RESET PASSWORD */}
{/* ============================================ */}
{showResetModal && resetUser && (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-4 rounded-t-2xl">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-bold">🔑 Reset Password</h3>
                        <p className="text-orange-100 text-xs">Reset password user</p>
                    </div>
                    <button
                        onClick={() => { setShowResetModal(false); setResetResult(null); }}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center text-2xl"
                    >
                        ×
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-6">
                {/* Info User */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-orange-500">
                    <p className="text-xs text-gray-500 font-bold uppercase">User</p>
                    <p className="font-bold text-lg">{resetUser.nama_lengkap}</p>
                    <p className="text-sm text-gray-600">
                        @{resetUser.username} • {resetUser.role}
                    </p>
                </div>

                {/* Kalau sudah ada hasil */}
                {resetResult ? (
                    <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                        <p className="text-green-800 font-bold mb-2">✅ Password berhasil direset!</p>
                        <div className="bg-white p-3 rounded border">
                            <p className="text-xs text-gray-500 mb-1">Password baru:</p>
                            <div className="flex items-center gap-2">
                                <code className="text-lg font-mono font-bold text-green-700 flex-1">
                                    {resetResult.password_baru}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(resetResult.password_baru)}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                                >
                                    📋 Copy
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-green-700 mt-3">
                            ⚠️ <strong>Penting:</strong> Catat password ini dan beritahu user. 
                            Password tidak akan ditampilkan lagi.
                        </p>
                    </div>
                ) : (
                    <>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Password Baru
                        </label>
                        <input
                            type="text"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            className="input-field font-mono"
                            placeholder="Minimal 6 karakter"
                        />

                        {/* Rekomendasi Password */}
                        <div className="mt-3 flex flex-wrap gap-2">
                            <p className="text-xs text-gray-500 w-full">Rekomendasi:</p>
                            {['guru123', 'murid123', 'wali123', 'bk123', 'admin123'].map(pwd => (
                                <button
                                    key={pwd}
                                    onClick={() => setResetPassword(pwd)}
                                    className={`text-xs px-3 py-1 rounded-full border ${
                                        resetPassword === pwd
                                            ? 'bg-orange-500 text-white border-orange-600'
                                            : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50'
                                    }`}
                                >
                                    {pwd}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                            <p className="text-xs text-yellow-800">
                                ⚠️ Password lama user akan <strong>ditimpa</strong>. 
                                Pastikan Anda memberikan password baru ke user setelah reset.
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex gap-2 justify-end">
                {resetResult ? (
                    <button
                        onClick={() => { setShowResetModal(false); setResetResult(null); }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-medium"
                    >
                        Tutup
                    </button>
                ) : (
                    <>
                        <button
                            onClick={() => setShowResetModal(false)}
                            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-medium"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleResetPassword}
                            disabled={resetLoading}
                            className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-2 rounded-lg font-bold hover:shadow-lg disabled:opacity-50"
                        >
                            {resetLoading ? '⏳ Memproses...' : '🔑 Reset Password'}
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
)}
        </div>
    );
}