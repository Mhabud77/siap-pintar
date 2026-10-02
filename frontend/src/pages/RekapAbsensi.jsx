import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import { useMode } from '../context/ModeContext';

const BASE_URL = 'http://localhost:5000';
const PER_PAGE = 32;

export default function RekapAbsensi() {
    const { user } = useAuth();
    const { mode } = useMode();
    const navigate = useNavigate();

    const [kelasList, setKelasList] = useState([]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    // Filter - UBAH STATE AWAL KELAS ID DARI 'all' MENJADI '' (STRING KOSONG)
    const [kelasId, setKelasId] = useState('');
    const [periode, setPeriode] = useState('harian');
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [minggu, setMinggu] = useState(1);
    const [semester, setSemester] = useState('gasal');
    const [filterJK, setFilterJK] = useState('');

    // Pagination
    const [page, setPage] = useState(1);

    // Penanda role Orang Tua
    const isOrangTua = user?.role === 'orangtua';

    useEffect(() => { 
        loadKelas(); 
    }, [mode]);

    const loadKelas = async () => {
        try {
            // Jika orangtua, kirim mode 'orangtua' ke backend
            const currentMode = isOrangTua ? 'orangtua' : (mode || 'guru');
            const url = `/kelas/untuk-filter?mode=${currentMode}`;
            const res = await api.get(url);
            const list = res.data.data || [];
            setKelasList(list);

            // Auto-pilih kelas pertama jika role Orang Tua atau mode Wali Kelas
            if ((isOrangTua || mode === 'wali') && list.length > 0) {
                setKelasId(String(list[0].id));
            } else if (mode === 'guru' && !isOrangTua) {
                setKelasId('all');
            } else if (list.length > 0) {
                setKelasId(String(list[0].id));
            } else {
                setKelasId('all');
            }
        } catch (err) {
            console.error('Load kelas error:', err);
            setKelasList([]);
            setKelasId('all');
        } finally {
            setLoading(false);
        }
    };

    // Reset page saat filter berubah
    useEffect(() => {
        setPage(1);
    }, [kelasId, periode, bulan, tahun, tanggal, minggu, semester, filterJK]);

    useEffect(() => {
        // HANYA JALANKAN LOAD REKAP JIKA kelasId SUDAH TERISI (BUKAN STRING KOSONG)
        if (kelasId) {
            loadRekap();
        }
    }, [kelasId, periode, bulan, tahun, tanggal, minggu, semester, filterJK, page]);

    const loadRekap = async () => {
        // CEGAH PEMANGGILAN JIKA KELAS_ID BELUM TERESET DENGAN BENAR
        if (!kelasId) return;

        setLoadingData(true);
        setError('');
        setData(null);

        try {
            const offset = (page - 1) * PER_PAGE;
            let url;

            if (periode === 'harian') {
                url = `/rekap-absensi/harian?tanggal=${tanggal}&limit=${PER_PAGE}&offset=${offset}`;
                if (kelasId && kelasId !== 'all') url += `&kelas_id=${kelasId}`;
                if (filterJK) url += `&jenis_kelamin=${filterJK}`;
            } else {
                url = `/rekap-absensi/kelas?tahun=${tahun}&periode=${periode}&limit=${PER_PAGE}&offset=${offset}`;
                if (kelasId && kelasId !== 'all') url += `&kelas_id=${kelasId}`;

                if (periode === 'bulanan') url += `&bulan=${bulan}`;
                else if (periode === 'mingguan') url += `&bulan=${bulan}&minggu=${minggu}`;
                else if (periode === 'semester') url += `&semester=${semester}`;

                if (filterJK) url += `&jenis_kelamin=${filterJK}`;
            }

            const res = await api.get(url);
            setData(res.data.data);
        } catch (err) {
            console.error('Load rekap error:', err);
            setError(err.response?.data?.message || 'Gagal memuat data rekap');
            setData(null);
        }
        setLoadingData(false);
    };

    const handleExport = () => {
        const token = localStorage.getItem('token');
        let url = `${BASE_URL}/api/rekap-absensi/kelas/export?tahun=${tahun}&periode=${periode}&token=${token}`;
        if (kelasId && kelasId !== 'all') url += `&kelas_id=${kelasId}`;

        if (periode === 'bulanan') url += `&bulan=${bulan}`;
        else if (periode === 'mingguan') url += `&bulan=${bulan}&minggu=${minggu}`;
        else if (periode === 'semester') url += `&semester=${semester}`;
        else if (periode === 'harian') url += `&tanggal=${tanggal}`;

        if (filterJK) url += `&jenis_kelamin=${filterJK}`;
        window.open(url, '_blank');
    };

    const handlePrevPage = () => {
        if (page > 1) {
            setPage(page - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleNextPage = () => {
        if (data?.pagination && page < data.pagination.total_pages) {
            setPage(page + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const getPersenColor = (persen) => {
        if (persen >= 90) return 'text-green-600 bg-green-50';
        if (persen >= 75) return 'text-yellow-600 bg-yellow-50';
        return 'text-red-600 bg-red-50';
    };

    const getStatusBadge = (status) => {
        const badges = {
            hadir: 'bg-green-100 text-green-700',
            terlambat: 'bg-red-100 text-red-700',
            izin: 'bg-yellow-100 text-yellow-700',
            sakit: 'bg-blue-100 text-blue-700',
            alpa: 'bg-gray-200 text-gray-700',
            belum_absen: 'bg-gray-100 text-gray-400'
        };
        return badges[status] || 'bg-gray-100 text-gray-500';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="card text-center py-12">⏳ Memuat data...</div>
                </div>
            </div>
        );
    }

    const isHarian = periode === 'harian';
    const isSemester = periode === 'semester';
    const isMingguan = periode === 'mingguan';
    const isBulanan = periode === 'bulanan';

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <button onClick={() => navigate(-1)} className="text-primary hover:underline mb-2 text-sm">← Kembali</button>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">📊 Rekap Absensi</h1>
                            <p className="text-gray-600 mt-1">
                                {isOrangTua ? 'Lihat rekap kehadiran kelas anak Anda' : 'Lihat rekap kehadiran murid per kelas'}
                            </p>
                        </div>
                        {data && (<button onClick={handleExport} className="btn-success">📥 Export Excel</button>)}
                    </div>
                </div>

                {/* FILTER */}
                <div className="card mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Kelas</label>
                            <select 
                                value={kelasId} 
                                onChange={(e) => setKelasId(e.target.value)} 
                                disabled={isOrangTua && kelasList.length <= 1}
                                className="input-field bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                {!isOrangTua && <option value="all">🏫 Semua Kelas</option>}
                                {kelasList.map(k => (<option key={k.id} value={k.id}>{k.nama_kelas}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Periode</label>
                            <select value={periode} onChange={(e) => setPeriode(e.target.value)} className="input-field">
                                <option value="harian">📅 Harian</option>
                                <option value="mingguan">📆 Mingguan</option>
                                <option value="bulanan">🗓️ Bulanan</option>
                                <option value="semester">📚 Semester</option>
                                <option value="tahunan">📈 Tahunan</option>
                            </select>
                        </div>

                        {isHarian && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tanggal</label>
                                <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="input-field" />
                            </div>
                        )}

                        {isMingguan && (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Minggu ke-</label>
                                    <select value={minggu} onChange={(e) => setMinggu(parseInt(e.target.value))} className="input-field">
                                        <option value="1">Minggu 1</option>
                                        <option value="2">Minggu 2</option>
                                        <option value="3">Minggu 3</option>
                                        <option value="4">Minggu 4</option>
                                        <option value="5">Minggu 5</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Bulan</label>
                                    <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))} className="input-field">
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(b => (
                                            <option key={b} value={b}>{new Date(2026, b - 1).toLocaleDateString('id-ID', { month: 'long' })}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {isBulanan && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Bulan</label>
                                <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))} className="input-field">
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(b => (
                                        <option key={b} value={b}>{new Date(2026, b - 1).toLocaleDateString('id-ID', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {isSemester && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Semester</label>
                                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="input-field">
                                    <option value="gasal">📚 Gasal (Juli - Desember)</option>
                                    <option value="genap">📚 Genap (Januari - Juni)</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tahun</label>
                            <select value={tahun} onChange={(e) => setTahun(parseInt(e.target.value))} className="input-field">
                                {[2024, 2025, 2026, 2027].map(y => (<option key={y} value={y}>{y}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Jenis Kelamin</label>
                            <select value={filterJK} onChange={(e) => setFilterJK(e.target.value)} className="input-field">
                                <option value="">Semua</option>
                                <option value="L">👦 Laki-laki</option>
                                <option value="P">👧 Perempuan</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ERROR */}
                {error && (
                    <div className="card mb-4 bg-red-50 border-l-4 border-red-500">
                        <p className="text-red-700 font-medium">❌ {error}</p>
                    </div>
                )}

                {/* DATA */}
                {loadingData ? (
                    <div className="card text-center py-12">⏳ Memuat rekap...</div>
                ) : !data ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-gray-600">Tidak ada data untuk periode ini</p>
                    </div>
                ) : (
                    <>
                        {/* INFO KELAS */}
                        <div className="card mb-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                            <div className="flex justify-between items-center flex-wrap gap-3">
                                <div>
                                    <h2 className="text-2xl font-bold">
                                        {data.kelas?.nama_kelas || 'Semua Kelas'}
                                    </h2>
                                    <p className="text-blue-100 text-sm">
                                        {data.kelas?.wali_kelas_nama && data.kelas.wali_kelas_nama !== '-' 
                                            ? `Wali Kelas: ${data.kelas.wali_kelas_nama}` 
                                            : 'Semua kelas digabung'}
                                    </p>
                                    {data.statistik?.total_laki !== undefined && (
                                        <p className="text-blue-100 text-sm mt-1">
                                            👦 {data.statistik.total_laki} Laki-laki • 👧 {data.statistik.total_perempuan} Perempuan
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-blue-100">Periode</p>
                                    <p className="text-xl font-bold">
                                        {isHarian ? data.tanggal_label : data.periode?.label}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* STATISTIK */}
                        {data.statistik && (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                                <div className="card text-center py-3 border-l-4 border-blue-500">
                                    <p className="text-[10px] text-gray-500 font-semibold uppercase">Total Murid</p>
                                    <p className="text-2xl font-bold text-blue-700">{data.statistik.total_murid}</p>
                                </div>
                                <div className="card text-center py-3 border-l-4 border-green-500">
                                    <p className="text-[10px] text-green-600 font-semibold uppercase">✅ Hadir</p>
                                    <p className="text-2xl font-bold text-green-700">{data.statistik.total_hadir}</p>
                                </div>
                                <div className="card text-center py-3 border-l-4 border-red-500">
                                    <p className="text-[10px] text-red-600 font-semibold uppercase">⏰ Terlambat</p>
                                    <p className="text-2xl font-bold text-red-700">
                                        {isHarian ? data.statistik.terlambat : data.statistik.total_terlambat}
                                    </p>
                                </div>
                                <div className="card text-center py-3 border-l-4 border-yellow-500">
                                    <p className="text-[10px] text-yellow-600 font-semibold uppercase">📝 Izin</p>
                                    <p className="text-2xl font-bold text-yellow-700">
                                        {isHarian ? data.statistik.izin : data.statistik.total_izin}
                                    </p>
                                </div>
                                <div className="card text-center py-3 border-l-4 border-blue-400">
                                    <p className="text-[10px] text-blue-500 font-semibold uppercase">🤒 Sakit</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {isHarian ? data.statistik.sakit : data.statistik.total_sakit}
                                    </p>
                                </div>
                                <div className="card text-center py-3 border-l-4 border-gray-500">
                                    <p className="text-[10px] text-gray-600 font-semibold uppercase">❌ Alpa</p>
                                    <p className="text-2xl font-bold text-gray-700">
                                        {isHarian ? data.statistik.alpa : data.statistik.total_alpa}
                                    </p>
                                </div>
                                <div className="card text-center py-3 border-l-4 border-purple-500">
                                    <p className="text-[10px] text-purple-600 font-semibold uppercase">📊 % Hadir</p>
                                    <p className="text-2xl font-bold text-purple-700">{data.statistik.persen_hadir}%</p>
                                </div>
                            </div>
                        )}

                        {/* INFO PAGINATION */}
                        {data.pagination && (
                            <div className="card mb-4 bg-gray-50 border-l-4 border-gray-400">
                                <div className="flex justify-between items-center flex-wrap gap-3">
                                    <p className="text-sm text-gray-700">
                                        Menampilkan <strong>{data.murid.length}</strong> dari <strong>{data.pagination.total}</strong> murid • 
                                        Halaman <strong>{data.pagination.current_page}</strong> dari <strong>{data.pagination.total_pages}</strong>
                                    </p>
                                    {data.pagination.total_pages > 1 && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handlePrevPage}
                                                disabled={page <= 1}
                                                className="px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 text-white hover:bg-blue-600"
                                            >
                                                ← Sebelumnya
                                            </button>
                                            <button
                                                onClick={handleNextPage}
                                                disabled={page >= data.pagination.total_pages}
                                                className="px-4 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 text-white hover:bg-blue-600"
                                            >
                                                Selanjutnya →
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TABEL */}
                        <div className="card overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                            <th className="px-3 py-3 text-left text-xs font-bold uppercase">No</th>
                                            <th className="px-3 py-3 text-left text-xs font-bold uppercase">NIS</th>
                                            <th className="px-3 py-3 text-left text-xs font-bold uppercase">Nama</th>
                                            {kelasId === 'all' && (
                                                <th className="px-3 py-3 text-left text-xs font-bold uppercase">Kelas</th>
                                            )}
                                            <th className="px-3 py-3 text-center text-xs font-bold uppercase">JK</th>
                    
                                            {/* TAMPILAN DINAMIS KHUSUS MODE HARIAN */}
                                            {isHarian ? (
                                                <>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Jam Datang</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Status Datang</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Jam Pulang</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Status Pulang</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Poin</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Hadir</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Terlambat</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Izin</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Sakit</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Alpa</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">Total</th>
                                                    <th className="px-3 py-3 text-center text-xs font-bold uppercase">% Hadir</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.murid.map((m, i) => (
                                            <tr key={m.id} className={`border-b hover:bg-blue-50 transition ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                                <td className="px-3 py-2 text-sm font-medium text-gray-600">{m.no}</td>
                                                <td className="px-3 py-2 text-sm font-mono text-gray-600">{m.nis}</td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {m.foto_profil ? (
                                                            <img src={`${BASE_URL}${m.foto_profil}`} alt={m.nama_lengkap} className="w-7 h-7 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-7 h-7 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                                                                {m.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                            </div>
                                                        )}
                                                        <span className="font-medium text-sm">{m.nama_lengkap}</span>
                                                    </div>
                                                </td>
                                                {kelasId === 'all' && (
                                                    <td className="px-3 py-2">
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{m.nama_kelas}</span>
                                                    </td>
                                                )}
                                                <td className="px-3 py-2 text-center">
                                                    {m.jenis_kelamin === 'L' ? (
                                                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">L</span>
                                                    ) : m.jenis_kelamin === 'P' ? (
                                                        <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-pink-100 text-pink-700">P</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </td>

                                                {isHarian ? (
                                                    <>
                                                        {/* Jam Datang */}
                                                        <td className="px-3 py-2 text-center text-sm font-mono text-gray-600">
                                                            {m.jam_datang ? m.jam_datang.slice(0, 5) : '-'}
                                                        </td>
                                                        {/* Status Datang */}
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${getStatusBadge(m.status)}`}>
                                                                {m.status_label}
                                                            </span>
                                                        </td>
                                                        {/* Jam Pulang */}
                                                        <td className="px-3 py-2 text-center text-sm font-mono text-gray-600">
                                                            {m.jam_pulang ? m.jam_pulang.slice(0, 5) : '-'}
                                                        </td>
                                                        {/* Status Pulang */}
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold uppercase ${m.status_pulang !== '-' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                                                                {m.status_pulang}
                                                            </span>
                                                        </td>
                                                        {/* Poin */}
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`font-bold text-sm ${m.poin_didapat > 0 ? 'text-green-600' : m.poin_didapat < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                                {m.poin_didapat > 0 ? '+' : ''}{m.poin_didapat}
                                                            </span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="inline-block min-w-[40px] px-2 py-1 rounded font-bold text-sm bg-green-100 text-green-700">
                                                                {m.hadir_ontime !== undefined ? m.hadir_ontime : m.hadir}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-block min-w-[40px] px-2 py-1 rounded font-bold text-sm ${m.terlambat > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                {m.terlambat}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-block min-w-[40px] px-2 py-1 rounded font-bold text-sm ${(m.izin || 0) > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                {m.izin || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-block min-w-[40px] px-2 py-1 rounded font-bold text-sm ${(m.sakit || 0) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                {m.sakit || 0}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-block min-w-[40px] px-2 py-1 rounded font-bold text-sm ${m.alpa > 0 ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                {m.alpa}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="font-bold text-sm text-gray-800">{m.total_absen}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={`inline-block min-w-[60px] px-2 py-1 rounded-full font-bold text-xs ${getPersenColor(m.persen_hadir)}`}>
                                                                {m.persen_hadir}%
                                                            </span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* PAGINATION BOTTOM */}
                        {data.pagination && data.pagination.total_pages > 1 && (
                            <div className="card mt-4 bg-gray-50">
                                <div className="flex justify-between items-center flex-wrap gap-3">
                                    <button
                                        onClick={handlePrevPage}
                                        disabled={page <= 1}
                                        className="px-6 py-3 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 text-white hover:bg-blue-600"
                                    >
                                        ← Sebelumnya
                                    </button>
                                    <div className="text-center">
                                        <p className="font-bold text-gray-800">
                                            Halaman {data.pagination.current_page} dari {data.pagination.total_pages}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            Menampilkan {data.murid.length} dari {data.pagination.total} murid
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleNextPage}
                                        disabled={page >= data.pagination.total_pages}
                                        className="px-6 py-3 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 text-white hover:bg-blue-600"
                                    >
                                        Selanjutnya →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* INFO */}
                        <div className="card mt-6 bg-blue-50 border-l-4 border-blue-500">
                            <p className="text-sm text-blue-700">
                                💡 <strong>Info:</strong> Murid yang <strong>terlambat</strong> tetap dihitung <strong>HADIR</strong>, 
                                tapi dengan keterangan <strong>terlambat</strong>. 
                                <strong>% Hadir</strong> = (hadir tepat waktu + terlambat) ÷ (total hadir + izin + sakit + alpa) × 100%.
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}