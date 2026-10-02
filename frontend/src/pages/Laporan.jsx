import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';

export default function Laporan() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const isOrangTua = user?.role === 'orangtua';
    // Cek mode aktif user (Wali Kelas vs Guru Mapel / Admin)
    const isWaliKelasMode = user?.activeMode === 'wali_kelas' || user?.role === 'wali_kelas';
    const muridIdFromUrl = searchParams.get('murid_id');

    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());
    const [laporan, setLaporan] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // State khusus Orang Tua
    const [anakList, setAnakList] = useState([]);
    const [selectedAnak, setSelectedAnak] = useState(null);

    // State Filter Kelas & Autocomplete Murid
    const [kelasList, setKelasList] = useState([]);
    const [selectedKelas, setSelectedKelas] = useState('');
    const [searchMurid, setSearchMurid] = useState('');
    const [muridList, setMuridList] = useState([]);
    const [selectedMurid, setSelectedMurid] = useState(null);
    const [showMuridDropdown, setShowMuridDropdown] = useState(false);
    const [loadingMurid, setLoadingMurid] = useState(false);
    const dropdownRef = useRef(null);

    const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Load data awal berdasarkan Role & Mode
    useEffect(() => {
        if (isOrangTua) {
            loadAnakList();
        } else {
            loadKelasList();
        }
    }, [isOrangTua, isWaliKelasMode, user]);

    // Load murid dari parameter URL jika ada
    useEffect(() => {
        if (!isOrangTua && muridIdFromUrl) {
            api.get(`/murid/${muridIdFromUrl}`)
                .then(res => {
                    const murid = res.data.data;
                    if (murid) {
                        setSelectedMurid(murid);
                        setSearchMurid(murid.nama_lengkap);
                    }
                })
                .catch(err => console.error('Error load murid from URL:', err));
        }
    }, [isOrangTua, muridIdFromUrl]);

    // Auto-load laporan untuk Orang Tua saat anak terpilih
    useEffect(() => {
        if (isOrangTua && selectedAnak) {
            loadLaporan(selectedAnak.murid_id);
        }
    }, [selectedAnak, bulan, tahun]);

    // Search Murid dengan Filter Kelas & Debounce
    useEffect(() => {
        if (isOrangTua) return;

        const timer = setTimeout(async () => {
            setLoadingMurid(true);
            try {
                let url = `/murid?limit=100`;
                // Jika mode Wali Kelas, paksa filter kelas ke kelas wali
                const targetKelas = isWaliKelasMode ? (user?.kelas_id || selectedKelas) : selectedKelas;
                if (targetKelas) url += `&kelas_id=${targetKelas}`;
                if (searchMurid.trim().length >= 2) url += `&q=${encodeURIComponent(searchMurid)}`;

                const res = await api.get(url);
                setMuridList(res.data.data || []);
            } catch (err) {
                console.error('Error search murid:', err);
            }
            setLoadingMurid(false);
        }, 300);

        return () => clearTimeout(timer);
    }, [selectedKelas, searchMurid, isOrangTua, isWaliKelasMode, user]);

    // Close Dropdown saat klik di luar
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowMuridDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadAnakList = async () => {
        try {
            const res = await api.get('/orangtua/anak');
            setAnakList(res.data.data || []);
            if (res.data.data?.length > 0) {
                setSelectedAnak(res.data.data[0]);
            }
        } catch (err) { console.error(err); }
    };

    const loadKelasList = async () => {
        try {
            const currentMode = user?.activeMode || (isWaliKelasMode ? 'wali' : 'guru');
            
            // Coba ambil dari endpoint filter yang spesifik sesuai mode
            const res = await api.get(`/kelas/filter?mode=${currentMode}`);
            const dataKelas = res.data.data || [];
            
            setKelasList(dataKelas);

            // Jika mode Wali Kelas dan hanya punya 1 kelas binaan, kunci otomatis
            if (currentMode === 'wali' && dataKelas.length === 1) {
                setSelectedKelas(dataKelas[0].id.toString());
            }
        } catch (err) { 
            console.error('Gagal memuat kelas dari filter, mencoba endpoint umum:', err);
            // Fallback cadangan jika endpoint /filter gagal: ambil dari endpoint /kelas biasa
            try {
                const resFallback = await api.get('/kelas');
                const allKelas = resFallback.data.data || [];
                if (isWaliKelasMode && user?.kelas_id) {
                    const filtered = allKelas.filter(k => k.id === user.kelas_id);
                    setKelasList(filtered.length > 0 ? filtered : allKelas);
                    setSelectedKelas(user.kelas_id.toString());
                } else {
                    setKelasList(allKelas);
                }
            } catch (fallbackErr) {
                console.error('Gagal total memuat kelas:', fallbackErr);
            }
        }
    };

    const handlePilihMurid = (m) => {
        setSelectedMurid(m);
        setSearchMurid(m.nama_lengkap);
        setShowMuridDropdown(false);
    };

    const loadLaporan = async (id) => {
        const muridIdFinal = id || selectedMurid?.id;
        if (!muridIdFinal) {
            setError('Pilih nama murid terlebih dahulu');
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
        } else if (selectedMurid) {
            loadLaporan(selectedMurid.id);
        } else {
            setError('Pilih nama murid terlebih dahulu');
        }
    };

    const downloadPDF = () => {
        const muridIdFinal = isOrangTua ? selectedAnak?.murid_id : selectedMurid?.id;
        if (!muridIdFinal) return;
        const token = localStorage.getItem('token');
        const url = `http://localhost:5000/api/laporan/download/${muridIdFinal}/${bulan}/${tahun}?token=${token}`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate(isOrangTua ? '/orangtua' : -1)} className="text-primary hover:underline mb-4 text-sm flex items-center gap-1">
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
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* FILTER KELAS */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Kelas
                                    </label>
                                    <select
                                        value={selectedKelas}
                                        disabled={isWaliKelasMode} // Dikunci jika mode Wali Kelas
                                        onChange={(e) => {
                                            setSelectedKelas(e.target.value);
                                            setSelectedMurid(null);
                                            setSearchMurid('');
                                        }}
                                        className="input-field bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        {!isWaliKelasMode && <option value="">Semua Kelas</option>}
                                        {kelasList.map((k) => (
                                            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* AUTOKOMPLET NAMA MURID */}
                                <div className="relative" ref={dropdownRef}>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">
                                        Nama Murid / NIS
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ketik nama atau NIS murid..."
                                        value={searchMurid}
                                        onChange={(e) => {
                                            setSearchMurid(e.target.value);
                                            setSelectedMurid(null);
                                            setShowMuridDropdown(true);
                                        }}
                                        onFocus={() => setShowMuridDropdown(true)}
                                        className="input-field"
                                        autoComplete="off"
                                    />

                                    {showMuridDropdown && (
                                        <div className="absolute z-20 w-full bg-white border border-gray-300 rounded-xl mt-1 max-h-60 overflow-y-auto shadow-xl">
                                            {loadingMurid ? (
                                                <div className="p-3 text-center text-sm text-gray-500">
                                                    ⏳ Mencari murid...
                                                </div>
                                            ) : muridList.length === 0 ? (
                                                <div className="p-3 text-center text-sm text-gray-500">
                                                    Tidak ada murid ditemukan
                                                </div>
                                            ) : (
                                                muridList.map((m) => (
                                                    <div
                                                        key={m.id}
                                                        onClick={() => handlePilihMurid(m)}
                                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition"
                                                    >
                                                        <p className="font-bold text-gray-800 text-sm">{m.nama_lengkap}</p>
                                                        <p className="text-xs text-gray-500">{m.nama_kelas} • NIS: {m.nis || '-'}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedMurid && (
                                <div className="p-3 bg-blue-50 border-l-4 border-primary rounded-lg text-sm text-blue-800 font-medium">
                                    ✅ Terpilih: <strong>{selectedMurid.nama_lengkap}</strong> ({selectedMurid.nama_kelas}) - NIS: {selectedMurid.nis || '-'}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                disabled={loading || !selectedMurid}
                                className="btn-primary w-full py-3 disabled:opacity-50 font-bold"
                            >
                                {loading ? '⏳ Memuat...' : '🔍 Tampilkan Laporan'}
                            </button>
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
                                <button onClick={downloadPDF} className="btn-success font-bold">📥 Download PDF</button>
                                <button onClick={() => window.print()} className="btn-primary font-bold">🖨️ Cetak</button>
                                <button onClick={() => setLaporan(null)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-bold">✕ Tutup</button>
                            </div>
                        </div>

                        <div className="bg-white shadow-xl rounded-lg p-8 print:shadow-none print:p-0">
                            {/* KOP SURAT */}
                            <div className="border-b-4 border-double border-gray-800 pb-4 mb-6">
                                <div className="flex items-center gap-4">
                                    <img src="/logo-sekolah.png" alt="Logo" className="w-20 h-20 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                                    <div className="flex-1 text-center">
                                        <p className="text-sm font-semibold">PEMERINTAH KABUPATEN SRAGEN</p>
                                        <p className="text-sm font-semibold">DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
                                        <h1 className="text-2xl font-bold">SMP NEGERI 1 GONDANG</h1>
                                        <p className="text-xs text-gray-600">Jl. Gondang-Winong Km.02, Glonggong, Gondang, Sragen 57254</p>
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

                            {/* STATISTIK KEHADIRAN */}
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

                            {/* STATISTIK PERILAKU */}
                            <h3 className="font-bold bg-gray-100 px-3 py-1 mb-3">B. STATISTIK PERILAKU</h3>
                            <table className="w-full border-collapse border border-gray-400 text-sm mb-6">
                                <tbody>
                                    <tr><td className="border px-4 py-2">Perilaku Positif</td><td className="border px-4 py-2 text-center font-bold text-green-700">{laporan.statistik.total_perilaku_positif} kali</td></tr>
                                    <tr><td className="border px-4 py-2">Perilaku Negatif</td><td className="border px-4 py-2 text-center font-bold text-red-700">{laporan.statistik.total_perilaku_negatif} kali</td></tr>
                                    <tr><td className="border px-4 py-2">Misi Selesai</td><td className="border px-4 py-2 text-center">{laporan.statistik.total_misi} misi</td></tr>
                                </tbody>
                            </table>

                            {/* TOTAL POIN */}
                            <h3 className="font-bold bg-gray-100 px-3 py-1 mb-3">C. TOTAL POIN</h3>
                            <div className="text-center py-4 bg-blue-50 rounded-lg border-2 border-blue-200 mb-6">
                                <p className="text-5xl font-bold text-primary">{laporan.statistik.total_poin}</p>
                            </div>

                            {/* CATATAN WALI KELAS */}
                            <h3 className="font-bold bg-gray-100 px-3 py-1 mb-3">D. CATATAN WALI KELAS</h3>
                            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg mb-6 min-h-[70px]">
                                <p className="text-sm text-gray-800 whitespace-pre-line italic">
                                    {laporan.catatan_wali_kelas 
                                        ? typeof laporan.catatan_wali_kelas === 'object'
                                            ? `"${laporan.catatan_wali_kelas.catatan || 'Belum ada catatan dari wali kelas.'}"`
                                            : `"${laporan.catatan_wali_kelas}"`
                                        : 'Belum ada catatan dari wali kelas.'
                                    }
                                </p>
                                {laporan.catatan_wali_kelas?.wali_kelas_nama && (
                                    <p className="text-xs text-gray-500 mt-2 text-right font-semibold">
                                        — Wali Kelas: {laporan.catatan_wali_kelas.wali_kelas_nama}
                                    </p>
                                )}
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
                            {isOrangTua ? 'Pilih anak dan periode, lalu klik "Tampilkan Laporan".' : 'Pilih Kelas, Nama Murid, Bulan, Tahun, lalu klik Tampilkan.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}