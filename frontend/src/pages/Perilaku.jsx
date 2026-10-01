import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useSearchParams } from 'react-router-dom';

export default function Perilaku() {
    const [kategori, setKategori] = useState({ positif: [], negatif: [] });
    const [muridList, setMuridList] = useState([]);
    const [searchMurid, setSearchMurid] = useState('');
    const [loadingMurid, setLoadingMurid] = useState(false);
    const [selectedMurid, setSelectedMurid] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    // Di dalam komponen:
    const [searchParams] = useSearchParams();
    const muridIdFromUrl = searchParams.get('murid_id');

    // ============================================
    // HELPER: Tanggal & Waktu Otomatis
    // ============================================
    const getToday = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getNow = () => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    // ============================================
    // STATE FORM (tanggal & waktu otomatis)
    // ============================================
    const [form, setForm] = useState({
        murid_id: '',
        kategori: '',
        deskripsi: '',
        tanggal: getToday(),   // ← Otomatis hari ini
        waktu: getNow()        // ← Otomatis jam sekarang
    });

    // ============================================
    // UPDATE WAKTU SETIAP MENIT (opsional)
    // ============================================
    useEffect(() => {
        const timer = setInterval(() => {
            // Hanya update kalau user belum ubah manual
            // (Cek: apakah tanggal/waktu masih sama dengan default)
            setForm(prev => {
                // Kalau tanggal sudah diubah user, jangan reset
                if (prev.tanggal !== getToday()) return prev;
                return { ...prev, waktu: getNow() };
            });
        }, 60000); // tiap 60 detik

        return () => clearInterval(timer);
    }, []);
    // Auto-select murid dari URL
    useEffect(() => {
        if (muridIdFromUrl && muridList.length === 0) {
            // Fetch data murid
            api.get(`/murid/${muridIdFromUrl}`)
                .then(res => {
                    const murid = res.data.data;
                    if (murid) {
                        setSelectedMurid(murid);
                        setForm(prev => ({ ...prev, murid_id: murid.id }));
                        setSearchMurid(`${murid.nama_lengkap} (${murid.nama_kelas}) - ${murid.nis}`);
                    }
                })
                .catch(err => console.error('Error load murid from URL:', err));
        }
    }, [muridIdFromUrl]);

    // ============================================
    // LOAD KATEGORI
    // ============================================
    useEffect(() => {
        loadKategori();
    }, []);

    // ============================================
    // SEARCH MURID (debounce)
    // ============================================
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchMurid.length < 2) {
                setMuridList([]);
                return;
            }
            setLoadingMurid(true);
            try {
                const res = await api.get(
                    `/murid?q=${encodeURIComponent(searchMurid)}&limit=50`
                );
                setMuridList(res.data.data);
            } catch (err) {
                console.error('Error search murid:', err);
            }
            setLoadingMurid(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchMurid]);

    // ============================================
    // TUTUP DROPDOWN SAAT KLIK DI LUAR
    // ============================================
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadKategori = async () => {
        try {
            const res = await api.get('/perilaku/kategori');
            setKategori(res.data.data);
        } catch (err) {
            console.error('Error load kategori:', err);
        }
    };

    const pilihMurid = (murid) => {
        setSelectedMurid(murid);
        setForm({ ...form, murid_id: murid.id });
        setSearchMurid(`${murid.nama_lengkap} (${murid.nama_kelas}) - ${murid.nis}`);
        setShowDropdown(false);
    };

    // ============================================
    // RESET TANGGAL & WAKTU KE SEKARANG
    // ============================================
    const resetDateTime = () => {
        setForm({ ...form, tanggal: getToday(), waktu: getNow() });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.murid_id) {
            setMessage({ type: 'error', text: '❌ Pilih murid dulu!' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const res = await api.post('/perilaku', form);
            setMessage({
                type: 'success',
                text: `✅ Perilaku ${res.data.data.murid} berhasil dicatat! (${res.data.data.poin > 0 ? '+' : ''}${res.data.data.poin} poin)`
            });
            
            // Reset form
            setForm({
                murid_id: '',
                kategori: '',
                deskripsi: '',
                tanggal: getToday(),
                waktu: getNow()
            });
            setSelectedMurid(null);
            setSearchMurid('');
            setMuridList([]);
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan')
            });
        }

        setLoading(false);
    };

    // Cek apakah tanggal/waktu sudah diubah dari default
    const isDateChanged = form.tanggal !== getToday();
    const isTimeChanged = form.waktu !== getNow();

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">
                    📝 Catat Perilaku Murid
                </h1>

                {message && (
                    <div className={`card mb-4 ${
                        message.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' : 'bg-red-50 border-l-4 border-red-500'
                    }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="card">
                    {/* ============================================
                        CARI MURID
                    ============================================ */}
                    <div className="mb-4 relative" ref={dropdownRef}>
                        <label className="block text-gray-700 font-bold mb-2">
                            Cari Murid
                            <span className="text-sm font-normal text-gray-500 ml-2">
                                (ketik minimal 2 huruf)
                            </span>
                        </label>
                        <input
                            type="text"
                            value={searchMurid}
                            onChange={(e) => {
                                setSearchMurid(e.target.value);
                                setShowDropdown(true);
                                if (selectedMurid) {
                                    setSelectedMurid(null);
                                    setForm({ ...form, murid_id: '' });
                                }
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className="input-field"
                            placeholder="Ketik nama atau NIS murid..."
                            autoComplete="off"
                        />

                        {showDropdown && searchMurid.length >= 2 && (
                            <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg mt-1 max-h-80 overflow-y-auto shadow-lg">
                                {loadingMurid ? (
                                    <div className="p-4 text-center text-gray-500">
                                        ⏳ Mencari...
                                    </div>
                                ) : muridList.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        Tidak ada murid yang cocok
                                    </div>
                                ) : (
                                    <>
                                        <div className="p-2 bg-gray-50 text-xs text-gray-500 border-b">
                                            Ditemukan {muridList.length} murid
                                        </div>
                                        {muridList.map((m) => (
                                            <div
                                                key={m.id}
                                                onClick={() => pilihMurid(m)}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                            >
                                                <div className="font-bold text-gray-800">
                                                    {m.nama_lengkap}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {m.nama_kelas} • NIS: {m.nis} • Poin: {m.poin_bulan_ini}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        )}

                        {selectedMurid && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-700">
                                    ✅ Terpilih: <strong>{selectedMurid.nama_lengkap}</strong> ({selectedMurid.nama_kelas})
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ============================================
                        TANGGAL & WAKTU (OPSI A + C)
                    ============================================ */}
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-gray-700 font-bold">
                                📅 Tanggal & Waktu Kejadian
                            </label>
                            <button
                                type="button"
                                onClick={resetDateTime}
                                className="text-sm text-primary hover:underline"
                            >
                                🔄 Reset ke Sekarang
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Tanggal
                                    {isDateChanged && (
                                        <span className="ml-2 text-orange-500 text-xs">
                                            (diubah manual)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="date"
                                    value={form.tanggal}
                                    onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                                    max={getToday()}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Waktu
                                    {isTimeChanged && (
                                        <span className="ml-2 text-orange-500 text-xs">
                                            (diubah manual)
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="time"
                                    value={form.waktu}
                                    onChange={(e) => setForm({ ...form, waktu: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                            ℹ️ Default: waktu sekarang. Bisa diubah untuk catat perilaku yang sudah lewat (maks 7 hari ke belakang).
                        </p>
                    </div>

                    {/* ============================================
                        KATEGORI PERILAKU
                    ============================================ */}
                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2">
                            Kategori Perilaku
                        </label>
                        <select
                            value={form.kategori}
                            onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                            className="input-field"
                            required
                        >
                            <option value="">-- Pilih Kategori --</option>
                            <optgroup label="🌟 Positif">
                                {kategori.positif.map(k => (
                                    <option key={k.id} value={k.id}>
                                        {k.label} (+{k.poin})
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="⚠️ Negatif">
                                {kategori.negatif.map(k => (
                                    <option key={k.id} value={k.id}>
                                        {k.label} ({k.poin})
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                    </div>

                    {/* ============================================
                        DESKRIPSI
                    ============================================ */}
                    <div className="mb-4">
                        <label className="block text-gray-700 font-bold mb-2">
                            Deskripsi (opsional)
                        </label>
                        <textarea
                            value={form.deskripsi}
                            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                            className="input-field"
                            rows="3"
                            placeholder="Keterangan tambahan..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-3 disabled:opacity-50"
                    >
                        {loading ? 'Menyimpan...' : 'SIMPAN PERILAKU'}
                    </button>
                </form>
            </div>
        </div>
    );
}