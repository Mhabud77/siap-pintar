import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { useMode } from '../context/ModeContext';
import api from '../services/api';
import StatCard from '../components/StatCard';

export default function DashboardGuru() {
    const { user } = useAuth();
    const { mode, isWaliKelas, setIsWaliKelas } = useMode();
    const navigate = useNavigate();

    // State lokal
    const [loading, setLoading] = useState(true);
    const [statistik, setStatistik] = useState(null);
    const [kelas, setKelas] = useState(null);
    const [muridList, setMuridList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [search, setSearch] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [message, setMessage] = useState(null);

    // Load awal: cek wali kelas + load data
    useEffect(() => {
        initDashboard();
    }, []);

    // Load data saat mode berubah
    useEffect(() => {
        if (mode) {
            loadDataByMode();
        }
    }, [mode]);

    // Reload murid saat search/filter berubah (khusus mode guru)
    useEffect(() => {
        if (mode === 'guru') {
            const timer = setTimeout(() => {
                loadGlobalMurid();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [search, filterKelas]);

    const initDashboard = async () => {
        try {
            const resWali = await api.get('/wali-kelas/statistik');
            const isWali = resWali.data.info?.is_wali_kelas === true;
            setIsWaliKelas(isWali);
        } catch (err) {
            console.error('Error init dashboard:', err);
            setMessage({ type: 'error', text: 'Gagal memuat data dashboard' });
        }
    };

    const loadDataByMode = async () => {
        setLoading(true);
        try {
            if (mode === 'wali' && isWaliKelas) {
                // MODE WALI KELAS
                const res = await api.get('/wali-kelas/statistik');
                setStatistik(res.data.data.statistik);
                setKelas(res.data.data.kelas);
                setMuridList(res.data.data.murid || []);
            } else {
                // MODE GURU MAPEL
                const res = await api.get('/wali-kelas/statistik-global?limit=50');
                setStatistik(res.data.data.statistik);
                setMuridList(res.data.data.murid || []);
                setKelasList(res.data.data.kelas_list || []);
            }
        } catch (err) {
            console.error('Error load data:', err);
            setMessage({ type: 'error', text: 'Gagal memuat data' });
        }
        setLoading(false);
    };

    const loadGlobalMurid = async () => {
        try {
            let url = '/wali-kelas/statistik-global?limit=50';
            if (search) url += `&search=${encodeURIComponent(search)}`;
            if (filterKelas) url += `&kelas_id=${filterKelas}`;

            const res = await api.get(url);
            setMuridList(res.data.data.murid || []);
        } catch (err) {
            console.error('Error reload murid:', err);
        }
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

    const filteredMurid = mode === 'wali'
        ? muridList.filter(m =>
            m.nama_lengkap?.toLowerCase().includes(search.toLowerCase()) ||
            m.nis?.includes(search)
          )
        : muridList;

    if (loading && !statistik) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="card text-center py-12">
                        <div className="text-3xl">⏳</div>
                        <p className="text-gray-600 mt-2">Memuat dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">
                        {mode === 'wali' && isWaliKelas
                            ? '🏫 Dashboard Wali Kelas'
                            : '📊 Dashboard Guru'}
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Selamat datang, <strong>{user?.nama_lengkap}</strong>
                        {mode === 'wali' && kelas && (
                            <> — Wali Kelas <strong>{kelas.nama_kelas}</strong></>
                        )}
                        {mode === 'guru' && (
                            <> — Guru Mata Pelajaran</>
                        )}
                    </p>
                </div>

                {/* INFO MODE */}
                {mode === 'guru' && (
                    <div className="card mb-6 bg-blue-50 border-l-4 border-blue-500">
                        <div className="flex items-start gap-3">
                            <div className="text-3xl">ℹ️</div>
                            <div>
                                <p className="text-blue-800 font-bold">
                                    Mode Guru Mata Pelajaran
                                </p>
                                <p className="text-blue-700 text-sm mt-1">
                                    Anda dapat memantau <strong>seluruh murid</strong> dari kelas 7-9,
                                    mengisi catatan perilaku, dan melihat laporan.
                                    {isWaliKelas && (
                                        <> Untuk validasi misi dan catatan wali kelas, 
                                        switch ke mode <strong>Wali Kelas</strong> di navbar.</>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* MESSAGE */}
                {message && (
                    <div className={`card mb-6 ${
                        message.type === 'error'
                            ? 'bg-red-50 border-l-4 border-red-500'
                            : 'bg-green-50 border-l-4 border-green-500'
                    }`}>
                        <p className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                            {message.text}
                        </p>
                    </div>
                )}

                {/* STATISTIK */}
                {statistik && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard
                            icon={mode === 'wali' ? '👨‍🎓' : '👥'}
                            label={mode === 'wali' ? 'Murid Saya' : 'Total Murid'}
                            value={statistik.total_murid}
                            subtitle={mode === 'wali' ? `Kelas ${kelas?.nama_kelas}` : 'Kelas 7 - 9'}
                            color="blue"
                        />
                        <StatCard
                            icon="✅"
                            label="Hadir Hari Ini"
                            value={statistik.hadir_hari_ini}
                            subtitle={`Dari ${statistik.total_absen_hari_ini} murid`}
                            color="green"
                        />
                        <StatCard
                            icon={mode === 'wali' ? '🎯' : '⭐'}
                            label={mode === 'wali' ? 'Perlu Validasi' : 'Misi Aktif'}
                            value={mode === 'wali' ? statistik.perlu_validasi : statistik.misi_aktif}
                            subtitle={mode === 'wali' ? 'Misi menunggu' : 'Misi tersedia'}
                            color={mode === 'wali' && statistik.perlu_validasi > 0 ? 'yellow' : 'purple'}
                        />
                        <StatCard
                            icon="⚠️"
                            label={mode === 'wali' ? 'Misi Aktif' : 'Pelanggaran'}
                            value={mode === 'wali' ? statistik.misi_aktif : statistik.pelanggaran_bulan_ini}
                            subtitle={mode === 'wali' ? 'Misi tersedia' : 'Bulan ini'}
                            color={mode === 'wali' ? 'purple' : 'red'}
                        />
                    </div>
                )}

                {/* DAFTAR MURID */}
                <div className="card mb-6">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                        <h2 className="text-xl font-bold text-gray-800">
                            {mode === 'wali'
                                ? `📋 Daftar Murid Kelas ${kelas?.nama_kelas} (${muridList.length})`
                                : `📋 Daftar Semua Murid (${muridList.length})`
                            }
                        </h2>
                        <div className="flex gap-2 items-center flex-wrap">
                            <input
                                type="text"
                                placeholder="🔍 Cari nama atau NIS..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field w-64"
                            />
                            {mode === 'guru' && (
                                <select
                                    value={filterKelas}
                                    onChange={(e) => setFilterKelas(e.target.value)}
                                    className="input-field w-40"
                                >
                                    <option value="">Semua Kelas</option>
                                    {kelasList.map(k => (
                                        <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                    ))}
                                </select>
                            )}
                            <button
                                onClick={loadDataByMode}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-2 rounded-lg text-sm"
                            >
                                🔄
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="table-header">
                                    <th className="px-4 py-2 text-left">No</th>
                                    <th className="px-4 py-2 text-left">Nama</th>
                                    {mode === 'guru' && (
                                        <th className="px-4 py-2 text-left">Kelas</th>
                                    )}
                                    <th className="px-4 py-2 text-left">NIS</th>
                                    <th className="px-4 py-2 text-center">Poin</th>
                                    <th className="px-4 py-2 text-center">Kehadiran</th>
                                    <th className="px-4 py-2 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMurid.map((m, i) => (
                                    <tr key={m.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3">{i + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    {m.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                </div>
                                                <span className="font-medium">{m.nama_lengkap}</span>
                                            </div>
                                        </td>
                                        {mode === 'guru' && (
                                            <td className="px-4 py-3">
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                                                    {m.nama_kelas}
                                                </span>
                                            </td>
                                        )}
                                        <td className="px-4 py-3 text-sm font-mono text-gray-600">
                                            {m.nis}
                                        </td>
                                        <td className={`px-4 py-3 text-center ${getPoinColor(m.poin_bulan_ini)}`}>
                                            {m.poin_bulan_ini}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getPersenColor(m.persen_kehadiran)}`}>
                                                {m.persen_kehadiran}%
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-1 justify-center flex-wrap">
                                                <button
                                                    onClick={() => navigate(`/perilaku?murid_id=${m.id}`)}
                                                    className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium"
                                                >
                                                    📝 Perilaku
                                                </button>
                                                {mode === 'wali' && (
                                                    <button
                                                        onClick={() => navigate(`/catatan-wali-kelas?murid_id=${m.id}`)}
                                                        className="text-purple-600 hover:bg-purple-50 px-2 py-1 rounded text-xs font-medium"
                                                    >
                                                        ✍️ Catatan
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => navigate(`/laporan?murid_id=${m.id}`)}
                                                    className="text-gray-600 hover:bg-gray-100 px-2 py-1 rounded text-xs font-medium"
                                                >
                                                    👁️ Detail
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredMurid.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                {search ? 'Tidak ada murid yang cocok' : 'Belum ada murid'}
                            </div>
                        )}
                    </div>
                </div>

                {/* MENU CEPAT */}
                <div className="card">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                        ⚡ Menu Cepat
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            onClick={() => navigate('/perilaku')}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg p-4 hover:shadow-lg transition text-left"
                        >
                            <div className="text-3xl mb-2">📝</div>
                            <div className="font-bold text-sm">Input Perilaku</div>
                            <div className="text-xs opacity-70 mt-1">Catat perilaku murid</div>
                        </button>

                        {mode === 'wali' && (
                            <button
                                onClick={() => navigate('/validasi-misi')}
                                className="bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg p-4 hover:shadow-lg transition text-left"
                            >
                                <div className="text-3xl mb-2">🎯</div>
                                <div className="font-bold text-sm">Validasi Misi</div>
                                <div className="text-xs opacity-70 mt-1">Validasi misi murid</div>
                            </button>
                        )}

                        {mode === 'wali' && (
                            <button
                                onClick={() => navigate('/catatan-wali-kelas')}
                                className="bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg p-4 hover:shadow-lg transition text-left"
                            >
                                <div className="text-3xl mb-2">✍️</div>
                                <div className="font-bold text-sm">Catatan Wali Kelas</div>
                                <div className="text-xs opacity-70 mt-1">Tulis catatan per murid</div>
                            </button>
                        )}

                        <button
                            onClick={() => navigate('/laporan')}
                            className="bg-green-50 hover:bg-green-100 text-green-700 rounded-lg p-4 hover:shadow-lg transition text-left"
                        >
                            <div className="text-3xl mb-2">📄</div>
                            <div className="font-bold text-sm">Laporan</div>
                            <div className="text-xs opacity-70 mt-1">Lihat laporan murid</div>
                        </button>

                        <button
                            onClick={() => navigate('/leaderboard')}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg p-4 hover:shadow-lg transition text-left"
                        >
                            <div className="text-3xl mb-2">🏆</div>
                            <div className="font-bold text-sm">Leaderboard</div>
                            <div className="text-xs opacity-70 mt-1">Peringkat murid</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}