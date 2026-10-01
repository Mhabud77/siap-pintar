import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';

export default function Laporan() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const isOrangTua = user?.role === 'orangtua';
    const muridIdFromUrl = searchParams.get('murid_id');

    const [muridId, setMuridId] = useState(muridIdFromUrl || '');
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [laporan, setLaporan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [anakList, setAnakList] = useState([]);
    const [selectedAnak, setSelectedAnak] = useState(null);

    const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Kalau orang tua, load daftar anak
    useEffect(() => {
        if (isOrangTua) {
            loadAnakList();
        }
    }, [isOrangTua]);

    // Auto-load laporan kalau orang tua & anak sudah dipilih
    useEffect(() => {
        if (isOrangTua && selectedAnak) {
            loadLaporan(selectedAnak.murid_id);
        }
    }, [selectedAnak, bulan, tahun]);

    const loadAnakList = async () => {
        try {
            const res = await api.get('/orangtua/anak');
            setAnakList(res.data.data || []);
            if (res.data.data?.length > 0) {
                setSelectedAnak(res.data.data[0]);
            }
        } catch (err) { console.error(err); }
    };

    const loadLaporan = async (id) => {
        const muridIdFinal = id || muridId;
        if (!muridIdFinal) {
            setError('Pilih murid dulu');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const res = await api.get(`/laporan/bulanan/${muridIdFinal}/${bulan}/${tahun}`);
            setLaporan(res.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat laporan');
            setLaporan(null);
        }
        setLoading(false);
    };

    const handleTampilkan = () => {
        if (isOrangTua && selectedAnak) {
            loadLaporan(selectedAnak.murid_id);
        } else {
            loadLaporan(muridId);
        }
    };

    const downloadPDF = () => {
        const muridIdFinal = isOrangTua ? selectedAnak?.murid_id : muridId;
        const token = localStorage.getItem('token');
        const url = `http://localhost:5000/api/laporan/download/${muridIdFinal}/${bulan}/${tahun}?token=${token}`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(isOrangTua ? '/orangtua' : -1)} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali
                </button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">
                    📄 {isOrangTua ? 'Laporan Anak' : 'Laporan Murid'}
                </h1>

                {/* FORM FILTER */}
                <div className="card mb-6 print:hidden">
                    <h2 className="text-lg font-bold mb-4">
                        {isOrangTua ? 'Pilih Periode Laporan' : 'Pilih Murid & Periode'}
                    </h2>

                    {isOrangTua ? (
                        // ORANG TUA: Pilih anak dari dropdown
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    Pilih Anak
                                </label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {anakList.map((anak) => (
                                        <button
                                            key={anak.murid_id}
                                            onClick={() => setSelectedAnak(anak)}
                                            className={`p-3 rounded-lg border-2 text-left transition ${
                                                selectedAnak?.murid_id === anak.murid_id
                                                    ? 'border-primary bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <p className="font-bold">{anak.nama_lengkap}</p>
                                            <p className="text-xs text-gray-500">
                                                NIS: {anak.nis} • Kelas: {anak.nama_kelas}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Bulan</label>
                                    <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))} className="input-field">
                                        {BULAN.map((b, i) => (
                                            <option key={i} value={i + 1}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Tahun</label>
                                    <input type="number" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value))} className="input-field" />
                                </div>
                            </div>

                            <button
                                onClick={handleTampilkan}
                                disabled={loading || !selectedAnak}
                                className="btn-primary w-full py-3 disabled:opacity-50"
                            >
                                {loading ? '⏳ Memuat...' : '🔍 Tampilkan Laporan'}
                            </button>
                        </div>
                    ) : (
                        // ADMIN/GURU: Input ID murid manual
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">ID Murid</label>
                                <input
                                    type="number"
                                    placeholder="Contoh: 1"
                                    value={muridId}
                                    onChange={(e) => setMuridId(e.target.value)}
                                    className="input-field"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Bulan</label>
                                <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))} className="input-field">
                                    {BULAN.map((b, i) => (
                                        <option key={i} value={i + 1}>{b}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Tahun</label>
                                <input type="number" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value))} className="input-field" />
                            </div>
                            <div className="md:col-span-3">
                                <button onClick={handleTampilkan} disabled={loading} className="btn-primary disabled:opacity-50">
                                    {loading ? '⏳ Memuat...' : '🔍 Tampilkan Laporan'}
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-100 text-red-700 px-4 py-2 rounded-lg mt-4">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* PREVIEW LAPORAN */}
                {laporan && (
                    <>
                        <div className="card mb-4 print:hidden">
                            <div className="flex gap-2 flex-wrap">
                                <button onClick={downloadPDF} className="btn-success">📥 Download PDF</button>
                                <button onClick={() => window.print()} className="btn-primary">🖨️ Cetak</button>
                                <button onClick={() => setLaporan(null)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg">✕ Tutup</button>
                            </div>
                        </div>

                        <div className="bg-white shadow-xl rounded-lg p-8 print:shadow-none print:p-0">
                            {/* KOP SURAT */}
                            <div className="border-b-4 border-double border-gray-800 pb-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <img src="/logo-sekolah.png" alt="Logo" className="w-20 h-20 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                                    <div className="flex-1 text-center">
                                        <p className="text-sm font-semibold">PEMERINTAH KABUPATEN</p>
                                        <p className="text-sm font-semibold">DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
                                        <h1 className="text-2xl font-bold">SMP NEGERI 1 GONDANG</h1>
                                        <p className="text-xs text-gray-600">Jl. Pendidikan No. 1, Gondang, Telp. (0355) 123456</p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold underline">LAPORAN PERKEMBANGAN SISWA</h2>
                                <p className="text-sm text-gray-600 mt-1">
                                    Periode: {laporan.periode.nama_bulan} {laporan.periode.tahun}
                                </p>
                            </div>

                            {/* IDENTITAS */}
                            <table className="w-full text-sm mb-6">
                                <tbody>
                                    <tr><td className="py-1 w-40 font-semibold">Nama Siswa</td><td className="py-1 w-4">:</td><td className="py-1 font-bold">{laporan.murid.nama_lengkap}</td></tr>
                                    <tr><td className="py-1 font-semibold">NIS</td><td className="py-1">:</td><td className="py-1">{laporan.murid.nis}</td></tr>
                                    <tr><td className="py-1 font-semibold">Kelas</td><td className="py-1">:</td><td className="py-1">{laporan.murid.nama_kelas}</td></tr>
                                </tbody>
                            </table>

                            {/* STATISTIK */}
                            <h3 className="font-bold bg-gray-100 px-3 py-1 mb-3">A. STATISTIK KEHADIRAN</h3>
                            <table className="w-full border-collapse border border-gray-400 text-sm mb-6">
                                <tbody>
                                    <tr><td className="border px-4 py-2">Hadir</td><td className="border px-4 py-2 text-center font-bold text-green-700">{laporan.statistik.total_hadir} hari</td></tr>
                                    <tr><td className="border px-4 py-2">Terlambat</td><td className="border px-4 py-2 text-center font-bold text-red-700">{laporan.statistik.total_terlambat} hari</td></tr>
                                    <tr><td className="border px-4 py-2">Izin</td><td className="border px-4 py-2 text-center">{laporan.statistik.total_izin} hari</td></tr>
                                    <tr><td className="border px-4 py-2">Sakit</td><td className="border px-4 py-2 text-center">{laporan.statistik.total_sakit} hari</td></tr>
                                    <tr><td className="border px-4 py-2">Alpa</td><td className="border px-4 py-2 text-center font-bold text-red-700">{laporan.statistik.total_alpa} hari</td></tr>
                                </tbody>
                            </table>

                            <h3 className="font-bold bg-gray-100 px-3 py-1 mb-3">B. STATISTIK PERILAKU</h3>
                            <table className="w-full border-collapse border border-gray-400 text-sm mb-6">
                                <tbody>
                                    <tr><td className="border px-4 py-2">Perilaku Positif</td><td className="border px-4 py-2 text-center font-bold text-green-700">{laporan.statistik.total_perilaku_positif} kali</td></tr>
                                    <tr><td className="border px-4 py-2">Perilaku Negatif</td><td className="border px-4 py-2 text-center font-bold text-red-700">{laporan.statistik.total_perilaku_negatif} kali</td></tr>
                                    <tr><td className="border px-4 py-2">Misi Selesai</td><td className="border px-4 py-2 text-center">{laporan.statistik.total_misi} misi</td></tr>
                                </tbody>
                            </table>

                            <h3 className="font-bold bg-gray-100 px-3 py-1 mb-3">C. TOTAL POIN</h3>
                            <div className="text-center py-4 bg-blue-50 rounded-lg border-2 border-blue-200 mb-6">
                                <p className="text-5xl font-bold text-primary">{laporan.statistik.total_poin}</p>
                            </div>

                            {/* TANDA TANGAN */}
                            <div className="mt-12 grid grid-cols-2 gap-8">
                                <div className="text-center">
                                    <p className="text-sm">Mengetahui,</p>
                                    <p className="text-sm">Orang Tua/Wali</p>
                                    <div className="h-20"></div>
                                    <p className="text-sm font-bold border-t border-gray-400 pt-1 inline-block px-8">............................</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm">Gondang, {new Date().toLocaleDateString('id-ID')}</p>
                                    <p className="text-sm">Wali Kelas</p>
                                    <div className="h-20"></div>
                                    <p className="text-sm font-bold border-t border-gray-400 pt-1 inline-block px-8">............................</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {!laporan && !loading && (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📄</div>
                        <h2 className="text-xl font-bold text-gray-800">Belum Ada Laporan</h2>
                        <p className="text-gray-600 mt-2">
                            {isOrangTua ? 'Pilih anak dan periode, lalu klik "Tampilkan Laporan".' : 'Isi ID Murid, Bulan, Tahun, lalu klik Tampilkan.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}