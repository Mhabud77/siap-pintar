import { useState, useEffect } from 'react';
import api from '../services/api';

const BASE_URL = 'http://localhost:5000';

// ============================================
// DAFTAR BULAN
// ============================================
const BULAN = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
];

// ============================================
// KOMPONEN: Avatar
// ============================================
function Avatar({ nama, foto, size = 'md', rank }) {
    const sizeClasses = {
        sm: 'w-10 h-10 text-sm',
        md: 'w-16 h-16 text-xl',
        lg: 'w-24 h-24 text-3xl',
        xl: 'w-32 h-32 text-5xl'
    };

    const inisial = nama?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

    const bgColor = rank === 1 ? 'bg-yellow-400' :
                    rank === 2 ? 'bg-gray-300' :
                    rank === 3 ? 'bg-orange-400' :
                    'bg-gradient-to-br from-blue-400 to-purple-500';

    return (
        <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center font-bold text-white shadow-lg border-4 border-white overflow-hidden`}>
            {foto ? (
                <img src={`${BASE_URL}${foto}`} alt={nama} className="w-full h-full object-cover" />
            ) : (
                <span>{inisial}</span>
            )}
        </div>
    );
}

// ============================================
// KOMPONEN: Podium
// ============================================
function Podium({ top3 }) {
    if (!top3 || top3.length === 0) {
        return (
            <div className="bg-gradient-to-b from-blue-500 via-purple-500 to-indigo-600 rounded-2xl p-8 mb-8 text-center">
                <p className="text-white text-xl">📭 Belum ada data untuk periode ini</p>
            </div>
        );
    }

    const [juara1, juara2, juara3] = top3;

    return (
        <div className="relative bg-gradient-to-b from-blue-500 via-purple-500 to-indigo-600 rounded-2xl p-8 mb-8 overflow-hidden">
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 left-4 text-6xl">⭐</div>
                <div className="absolute top-10 right-10 text-6xl">✨</div>
                <div className="absolute bottom-4 left-1/4 text-6xl">🌟</div>
                <div className="absolute bottom-10 right-1/4 text-6xl">💫</div>
            </div>

            <div className="text-center mb-8 relative">
                <h2 className="text-3xl font-bold text-white">🏆 TOP 3 SISWA TERBAIK 🏆</h2>
                <p className="text-blue-100 mt-1 text-lg font-semibold">SMP NEGERI 1 GONDANG</p>
            </div>

            <div className="flex justify-center items-end gap-4 md:gap-8 relative">
                {juara2 && (
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <Avatar nama={juara2.nama_lengkap} foto={juara2.foto_profil} size="lg" rank={2} />
                            <div className="absolute -top-2 -right-2 text-3xl">🥈</div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="font-bold text-white text-lg">{juara2.nama_lengkap}</p>
                            <p className="text-blue-100 text-sm">{juara2.nama_kelas}</p>
                            <div className="mt-2 bg-white/20 backdrop-blur rounded-full px-4 py-1">
                                <p className="text-2xl font-bold text-white">{juara2.poin_total}</p>
                                <p className="text-xs text-blue-100">poin</p>
                            </div>
                        </div>
                        <div className="mt-4 w-32 h-20 bg-gradient-to-b from-gray-300 to-gray-400 rounded-t-lg flex items-center justify-center">
                            <span className="text-4xl font-bold text-gray-700">2</span>
                        </div>
                    </div>
                )}

                {juara1 && (
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-4xl">👑</div>
                            <Avatar nama={juara1.nama_lengkap} foto={juara1.foto_profil} size="xl" rank={1} />
                            <div className="absolute -top-2 -right-2 text-4xl">🥇</div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="font-bold text-white text-xl">{juara1.nama_lengkap}</p>
                            <p className="text-blue-100 text-sm">{juara1.nama_kelas}</p>
                            <div className="mt-2 bg-yellow-400 rounded-full px-6 py-2 shadow-lg">
                                <p className="text-3xl font-bold text-yellow-900">{juara1.poin_total}</p>
                                <p className="text-xs text-yellow-800">poin</p>
                            </div>
                        </div>
                        <div className="mt-4 w-40 h-32 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-t-lg flex items-center justify-center">
                            <span className="text-5xl font-bold text-yellow-800">1</span>
                        </div>
                    </div>
                )}

                {juara3 && (
                    <div className="flex flex-col items-center">
                        <div className="relative">
                            <Avatar nama={juara3.nama_lengkap} foto={juara3.foto_profil} size="lg" rank={3} />
                            <div className="absolute -top-2 -right-2 text-3xl">🥉</div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="font-bold text-white text-lg">{juara3.nama_lengkap}</p>
                            <p className="text-blue-100 text-sm">{juara3.nama_kelas}</p>
                            <div className="mt-2 bg-white/20 backdrop-blur rounded-full px-4 py-1">
                                <p className="text-2xl font-bold text-white">{juara3.poin_total}</p>
                                <p className="text-xs text-blue-100">poin</p>
                            </div>
                        </div>
                        <div className="mt-4 w-32 h-16 bg-gradient-to-b from-orange-300 to-orange-500 rounded-t-lg flex items-center justify-center">
                            <span className="text-4xl font-bold text-orange-800">3</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// KOMPONEN: Filter Periode
// ============================================
function PeriodeFilter({ mode, bulan, tahun, semester, onChange }) {
    const tahunSekarang = new Date().getFullYear();
    const daftarTahun = [tahunSekarang - 1, tahunSekarang, tahunSekarang + 1];

    return (
        <div className="card mb-6">
            <div className="flex flex-wrap items-center gap-4">
                {/* Mode Toggle */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Mode</label>
                    <div className="flex bg-gray-100 rounded-lg p-1 flex-wrap">
                        <button
                            onClick={() => onChange({ mode: 'harian' })}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition ${mode === 'harian' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
                        >
                            📅 Harian
                        </button>
                        <button
                            onClick={() => onChange({ mode: 'mingguan' })}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition ${mode === 'mingguan' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
                        >
                            📆 Mingguan
                        </button>
                        <button
                            onClick={() => onChange({ mode: 'bulanan' })}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition ${mode === 'bulanan' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
                        >
                            🗓️ Bulanan
                        </button>
                        <button
                            onClick={() => onChange({ mode: 'semester' })}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition ${mode === 'semester' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
                        >
                            📚 Semester
                        </button>
                        <button
                            onClick={() => onChange({ mode: 'tahunan' })}
                            className={`px-3 py-1 rounded-md text-xs font-medium transition ${mode === 'tahunan' ? 'bg-white shadow text-primary' : 'text-gray-600'}`}
                        >
                            📈 Tahunan
                        </button>
                    </div>
                </div>

                {/* Bulan (muncul di mode bulanan) */}
                {mode === 'bulanan' && (
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Bulan</label>
                        <select
                            value={bulan}
                            onChange={(e) => onChange({ bulan: parseInt(e.target.value) })}
                            className="input-field min-w-[150px]"
                        >
                            {BULAN.map(b => (<option key={b.value} value={b.value}>{b.label}</option>))}
                        </select>
                    </div>
                )}

                {/* Semester (muncul di mode semester) */}
                {mode === 'semester' && (
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Semester</label>
                        <select
                            value={semester}
                            onChange={(e) => onChange({ semester: e.target.value })}
                            className="input-field min-w-[200px]"
                        >
                            <option value="gasal">📚 Gasal (Juli - Desember)</option>
                            <option value="genap">📚 Genap (Januari - Juni)</option>
                        </select>
                    </div>
                )}

                {/* Tahun */}
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tahun</label>
                    <select
                        value={tahun}
                        onChange={(e) => onChange({ tahun: parseInt(e.target.value) })}
                        className="input-field min-w-[120px]"
                    >
                        {daftarTahun.map(t => (<option key={t} value={t}>{t}</option>))}
                    </select>
                </div>
            </div>

            {/* Info mode */}
            <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                    {mode === 'harian' && '📅 Menampilkan poin hari ini saja'}
                    {mode === 'mingguan' && '📆 Menampilkan akumulasi poin 7 hari terakhir'}
                    {mode === 'bulanan' && '🗓️ Menampilkan akumulasi poin bulan ini'}
                    {mode === 'semester' && '📚 Menampilkan akumulasi poin semester (Gasal: Juli-Des, Genap: Jan-Jun)'}
                    {mode === 'tahunan' && '📈 Menampilkan akumulasi poin 1 tahun'}
                </p>
            </div>
        </div>
    );
}

// ============================================
// KOMPONEN: Range Filter
// ============================================
function RangeFilter({ activeFrom, onSelect }) {
    const ranges = [
        { from: 1, to: 50, label: '1 - 50' },
        { from: 51, to: 100, label: '51 - 100' },
        { from: 101, to: 150, label: '101 - 150' },
        { from: 151, to: 200, label: '151 - 200' },
        { from: 201, to: 300, label: '201 - 300' },
        { from: 301, to: 500, label: '301 - 500' },
        { from: 501, to: 700, label: '501 - 700' }
    ];

    return (
        <div className="flex flex-wrap gap-2 mb-6">
            {ranges.map((r) => (
                <button
                    key={r.from}
                    onClick={() => onSelect(r.from, r.to)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${activeFrom === r.from ? 'bg-primary text-white shadow-lg' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                >
                    {r.label}
                </button>
            ))}
        </div>
    );
}

// ============================================
// KOMPONEN: Kartu Siswa
// ============================================
function SiswaCard({ siswa }) {
    const getRankBadge = (rank) => {
        if (rank === 1) return { emoji: '🥇', bg: 'bg-yellow-100', text: 'text-yellow-800' };
        if (rank === 2) return { emoji: '🥈', bg: 'bg-gray-100', text: 'text-gray-700' };
        if (rank === 3) return { emoji: '🥉', bg: 'bg-orange-100', text: 'text-orange-800' };
        return { emoji: `#${rank}`, bg: 'bg-blue-50', text: 'text-blue-700' };
    };

    const badge = getRankBadge(siswa.rank);
    const maxPoin = 200;
    const persentase = Math.min((siswa.poin_total / maxPoin) * 100, 100);

    return (
        <div className="card hover:shadow-lg transition-all duration-200 flex items-center gap-4">
            <div className={`${badge.bg} ${badge.text} w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0`}>
                {badge.emoji}
            </div>

            <Avatar nama={siswa.nama_lengkap} foto={siswa.foto_profil} size="md" rank={siswa.rank} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-800 truncate">{siswa.nama_lengkap}</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{siswa.nama_kelas}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>🌟 {siswa.total_positif || 0} positif</span>
                    <span>⚠️ {siswa.total_negatif || 0} negatif</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${persentase}%` }}
                    />
                </div>
            </div>

            <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-primary">{siswa.poin_total}</p>
                <p className="text-xs text-gray-500">poin</p>
            </div>
        </div>
    );
}

// ============================================
// KOMPONEN UTAMA
// ============================================
export default function Leaderboard() {
    const now = new Date();
    const [top3, setTop3] = useState([]);
    const [list, setList] = useState([]);
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [rangeFrom, setRangeFrom] = useState(4);
    const [rangeTo, setRangeTo] = useState(50);

    // Filter periode
    const [mode, setMode] = useState('bulanan');
    const [bulan, setBulan] = useState(now.getMonth() + 1);
    const [tahun, setTahun] = useState(now.getFullYear());
    const [semester, setSemester] = useState('gasal');

    useEffect(() => {
        loadTop3();
        loadList(rangeFrom, rangeTo);
    }, [mode, bulan, tahun, semester]);

    const loadTop3 = async () => {
        try {
            let url = `/leaderboard/top3?mode=${mode}&tahun=${tahun}`;
            if (mode === 'bulanan') url += `&bulan=${bulan}`;
            if (mode === 'semester') url += `&semester=${semester}`;

            const res = await api.get(url);
            setTop3(res.data.data || []);
            setInfo(res.data.info || null);
        } catch (err) {
            console.error('Error top3:', err);
        }
    };

    const loadList = async (from, to) => {
        setLoading(true);
        try {
            let url = `/leaderboard?from=${from}&to=${to}&mode=${mode}&tahun=${tahun}`;
            if (mode === 'bulanan') url += `&bulan=${bulan}`;
            if (mode === 'semester') url += `&semester=${semester}`;

            const res = await api.get(url);
            setList(res.data.data || []);
            setInfo(res.data.info || null);
        } catch (err) {
            console.error('Error list:', err);
        }
        setLoading(false);
    };

    const handleRangeSelect = (from, to) => {
        setRangeFrom(from);
        setRangeTo(to);
        loadList(from, to);
        setTimeout(() => {
            document.getElementById('list-siswa')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handlePeriodeChange = (changes) => {
        if (changes.mode !== undefined) setMode(changes.mode);
        if (changes.bulan !== undefined) setBulan(changes.bulan);
        if (changes.tahun !== undefined) setTahun(changes.tahun);
        if (changes.semester !== undefined) setSemester(changes.semester);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">🏆 Leaderboard</h1>
                    <p className="text-gray-500 mt-1">
                        Peringkat siswa berdasarkan poin perilaku
                        {info?.label && <span className="font-semibold text-primary"> — {info.label}</span>}
                    </p>
                </div>

                {/* Filter Periode */}
                <PeriodeFilter
                    mode={mode}
                    bulan={bulan}
                    tahun={tahun}
                    semester={semester}
                    onChange={handlePeriodeChange}
                />

                {/* Podium Top 3 */}
                <Podium top3={top3} />

                {/* Range Filter */}
                <div id="list-siswa">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">
                            📋 Daftar Peringkat
                            {info && (
                                <span className="text-sm font-normal text-gray-500 ml-2">
                                    (Peringkat {info.from} - {info.to})
                                </span>
                            )}
                        </h2>
                    </div>

                    <RangeFilter activeFrom={rangeFrom} onSelect={handleRangeSelect} />

                    {/* List Siswa */}
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                            <p className="text-gray-500 mt-4">Memuat data...</p>
                        </div>
                    ) : list.length === 0 ? (
                        <div className="card text-center py-12">
                            <p className="text-5xl mb-4">📭</p>
                            <p className="text-gray-500 text-lg">Belum ada data untuk periode ini</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {list.map((siswa) => (
                                <SiswaCard key={siswa.id} siswa={siswa} />
                            ))}
                        </div>
                    )}

                    {/* Info Footer */}
                    {info && (
                        <div className="mt-6 text-center text-sm text-gray-400">
                            <p>
                                Menampilkan peringkat {info.from} - {info.to} dari total {info.total} siswa
                                {info.mode && ` • Mode: ${info.mode}`}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}