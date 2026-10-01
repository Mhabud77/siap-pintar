import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function DownloadUser() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [statistik, setStatistik] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // Filter
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterJenisGuru, setFilterJenisGuru] = useState('');
    const [page, setPage] = useState(0);
    const limit = 50;

    // Toggle show/hide password
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        loadData();
    }, [filterRole, filterJenisGuru, page]);

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
            const params = new URLSearchParams();
            params.append('limit', limit);
            params.append('offset', page * limit);
            if (search) params.append('search', search);
            if (filterRole) params.append('role', filterRole);
            if (filterJenisGuru) params.append('jenis_guru', filterJenisGuru);

            const res = await api.get(`/download-user/preview?${params.toString()}`);
            setUsers(res.data.data || []);
            setStatistik(res.data.statistik);
            setPagination(res.data.pagination);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Gagal memuat data user' });
        }
        setLoading(false);
    };

    const handleDownload = (format) => {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (filterRole) params.append('role', filterRole);
        if (filterJenisGuru) params.append('jenis_guru', filterJenisGuru);
        params.append('token', token);

        const url = `http://localhost:5000/api/download-user/${format}?${params.toString()}`;
        window.open(url, '_blank');

        setMessage({
            type: 'success',
            text: `✅ Download ${format.toUpperCase()} dimulai. Cek folder Downloads.`
        });
    };

    const getRoleBadge = (role) => {
        const badges = {
            admin: 'bg-red-100 text-red-700',
            kepsek: 'bg-purple-100 text-purple-700',
            guru: 'bg-blue-100 text-blue-700',
            guru_bk: 'bg-indigo-100 text-indigo-700',
            murid: 'bg-green-100 text-green-700',
            orangtua: 'bg-yellow-100 text-yellow-700'
        };
        return badges[role] || 'bg-gray-100 text-gray-700';
    };

    const maskPassword = (pwd) => {
        if (!pwd) return '-';
        return '•'.repeat(20);
    };

    const totalPages = pagination ? Math.ceil(pagination.total / limit) : 0;

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
                                📥 Download Data User
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Download data lengkap user (ID, username, password hash, dll)
                            </p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium"
                            >
                                {showPassword ? '🙈 Sembunyikan Password' : '👁️ Tampilkan Password'}
                            </button>
                            <button
                                onClick={() => handleDownload('csv')}
                                className="btn-success"
                            >
                                📄 Download CSV
                            </button>
                            <button
                                onClick={() => handleDownload('excel')}
                                className="btn-primary"
                            >
                                📊 Download Excel
                            </button>
                        </div>
                    </div>
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

                {/* INFO KEAMANAN */}
                <div className="card mb-6 bg-yellow-50 border-l-4 border-yellow-500">
                    <div className="flex items-start gap-3">
                        <div className="text-3xl">⚠️</div>
                        <div>
                            <p className="font-bold text-yellow-800">Perhatian Keamanan</p>
                            <p className="text-yellow-700 text-sm mt-1">
                                Password yang di-download dalam bentuk <strong>hash</strong> (bcrypt), 
                                bukan plain text. Hash tidak bisa dibalik ke password asli. 
                                Simpan file dengan aman dan jangan dibagikan ke pihak yang tidak berwenang.
                            </p>
                        </div>
                    </div>
                </div>

                {/* STATISTIK */}
                {statistik && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                        <div className="card text-center py-3 border-l-4 border-gray-700">
                            <p className="text-xs text-gray-500 font-semibold uppercase">Total</p>
                            <p className="text-2xl font-bold">{statistik.total}</p>
                        </div>
                        <div className="card text-center py-3 border-l-4 border-red-500">
                            <p className="text-xs text-red-600 font-semibold uppercase">Admin</p>
                            <p className="text-2xl font-bold text-red-700">{statistik.admin}</p>
                        </div>
                        <div className="card text-center py-3 border-l-4 border-purple-500">
                            <p className="text-xs text-purple-600 font-semibold uppercase">Kepsek</p>
                            <p className="text-2xl font-bold text-purple-700">{statistik.kepsek}</p>
                        </div>
                        <div className="card text-center py-3 border-l-4 border-blue-500">
                            <p className="text-xs text-blue-600 font-semibold uppercase">Guru</p>
                            <p className="text-2xl font-bold text-blue-700">{statistik.guru}</p>
                        </div>
                        <div className="card text-center py-3 border-l-4 border-indigo-500">
                            <p className="text-xs text-indigo-600 font-semibold uppercase">Guru BK</p>
                            <p className="text-2xl font-bold text-indigo-700">{statistik.guru_bk}</p>
                        </div>
                        <div className="card text-center py-3 border-l-4 border-green-500">
                            <p className="text-xs text-green-600 font-semibold uppercase">Murid</p>
                            <p className="text-2xl font-bold text-green-700">{statistik.murid}</p>
                        </div>
                        <div className="card text-center py-3 border-l-4 border-yellow-500">
                            <p className="text-xs text-yellow-600 font-semibold uppercase">Orang Tua</p>
                            <p className="text-2xl font-bold text-yellow-700">{statistik.orangtua}</p>
                        </div>
                    </div>
                )}

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Cari</label>
                            <input
                                type="text"
                                placeholder="🔍 Cari nama, username, email, atau NIS..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
                            <select
                                value={filterRole}
                                onChange={(e) => { setFilterRole(e.target.value); setPage(0); }}
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
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Jenis Guru</label>
                            <select
                                value={filterJenisGuru}
                                onChange={(e) => { setFilterJenisGuru(e.target.value); setPage(0); }}
                                className="input-field"
                            >
                                <option value="">Semua</option>
                                <option value="wali_kelas">Wali Kelas</option>
                                <option value="mapel">Guru Mapel</option>
                                <option value="bk">Guru BK</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* TABEL PREVIEW */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold">
                            Preview Data User ({pagination?.total || 0})
                        </h2>
                        <button
                            onClick={loadData}
                            className="text-primary hover:underline text-sm"
                        >
                            🔄 Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">⏳ Memuat...</div>
                    ) : users.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-gray-600">Tidak ada data user</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="table-header">
                                            <th className="px-3 py-2 text-left">ID</th>
                                            <th className="px-3 py-2 text-left">Username</th>
                                            <th className="px-3 py-2 text-left">Password Hash</th>
                                            <th className="px-3 py-2 text-left">Nama Lengkap</th>
                                            <th className="px-3 py-2 text-left">Role</th>
                                            <th className="px-3 py-2 text-left">Jenis Guru</th>
                                            <th className="px-3 py-2 text-left">Email</th>
                                            <th className="px-3 py-2 text-left">No. Telepon</th>
                                            <th className="px-3 py-2 text-left">NIS</th>
                                            <th className="px-3 py-2 text-left">Kelas</th>
                                            <th className="px-3 py-2 text-center">Poin</th>
                                            <th className="px-3 py-2 text-left">Tgl Daftar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr key={u.id} className="border-b hover:bg-gray-50">
                                                <td className="px-3 py-2 font-mono text-xs">{u.id}</td>
                                                <td className="px-3 py-2 font-mono text-xs font-bold">{u.username}</td>
                                                <td className="px-3 py-2 font-mono text-xs text-gray-500 max-w-[200px] truncate" title={u.password}>
                                                    {showPassword ? (
                                                        <span className="text-red-600">{u.password}</span>
                                                    ) : (
                                                        <span>••••••••</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 font-medium">{u.nama_lengkap}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`text-xs px-2 py-1 rounded ${getRoleBadge(u.role)}`}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-xs">{u.jenis_guru || '-'}</td>
                                                <td className="px-3 py-2 text-xs">{u.email || '-'}</td>
                                                <td className="px-3 py-2 text-xs">{u.no_telepon || '-'}</td>
                                                <td className="px-3 py-2 text-xs font-mono">{u.nis || '-'}</td>
                                                <td className="px-3 py-2 text-xs">{u.nama_kelas || '-'}</td>
                                                <td className="px-3 py-2 text-center text-xs font-bold">
                                                    {u.role === 'murid' ? u.poin_bulan_ini : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-500">
                                                    {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* PAGINATION */}
                            {totalPages > 1 && (
                                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                    <p className="text-sm text-gray-600">
                                        Halaman {page + 1} dari {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(Math.max(0, page - 1))}
                                            disabled={page === 0}
                                            className="btn-primary disabled:opacity-50"
                                        >
                                            ← Sebelumnya
                                        </button>
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
                        </>
                    )}
                </div>

                {/* INFO CARA DOWNLOAD */}
                <div className="card mt-6 bg-blue-50 border-l-4 border-blue-500">
                    <h3 className="font-bold text-blue-800 mb-2">💡 Cara Download</h3>
                    <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                        <li>Pilih filter <strong>Role</strong> (misal: Murid) untuk download sebagian</li>
                        <li>Klik <strong>📄 Download CSV</strong> untuk format CSV</li>
                        <li>Klik <strong>📊 Download Excel</strong> untuk format Excel (.xlsx) dengan 2 sheet</li>
                        <li>File akan ter-download otomatis ke folder <strong>Downloads</strong> komputer</li>
                        <li>File Excel berisi sheet <strong>Data User</strong> + sheet <strong>Statistik</strong></li>
                    </ol>
                </div>
            </div>
        </div>
    );
}