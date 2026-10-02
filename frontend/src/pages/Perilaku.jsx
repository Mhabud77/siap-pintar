import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useSearchParams } from 'react-router-dom';

export default function Perilaku() {
    const [kategori, setKategori] = useState({ positif: [], negatif: [] });
    const [muridList, setMuridList] = useState([]);
    const [kelasList, setKelasList] = useState([]);
    const [searchMurid, setSearchMurid] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [loadingMurid, setLoadingMurid] = useState(false);
    
    // State Multi-Select
    const [selectedMuridIds, setSelectedMuridIds] = useState([]);
    const [selectedKategoris, setSelectedKategoris] = useState([]);

    // State Dropdown Kategori
    const [showKatDropdown, setShowKatDropdown] = useState(false);
    const katDropdownRef = useRef(null);

    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    const [searchParams] = useSearchParams();
    const muridIdFromUrl = searchParams.get('murid_id');

    // Helper Tanggal & Waktu
    const getToday = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getNow = () => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const [form, setForm] = useState({
        deskripsi: '',
        tanggal: getToday(),
        waktu: getNow()
    });

    // Update Waktu Otomatis
    useEffect(() => {
        const timer = setInterval(() => {
            setForm(prev => {
                if (prev.tanggal !== getToday()) return prev;
                return { ...prev, waktu: getNow() };
            });
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // Load Data Awal (Kategori & Kelas)
    useEffect(() => {
        loadKategori();
        loadKelas();
    }, []);

    // Tutup Dropdown Kategori Saat Klik di Luar
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (katDropdownRef.current && !katDropdownRef.current.contains(e.target)) {
                setShowKatDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-select Murid dari URL
    useEffect(() => {
        if (muridIdFromUrl) {
            api.get(`/murid/${muridIdFromUrl}`)
                .then(res => {
                    const murid = res.data.data;
                    if (murid) {
                        setSelectedMuridIds([murid.id]);
                        setSearchMurid(murid.nama_lengkap);
                    }
                })
                .catch(err => console.error('Error load murid from URL:', err));
        }
    }, [muridIdFromUrl]);

    // Search Murid dengan Filter Kelas & Debounce
    useEffect(() => {
        const timer = setTimeout(async () => {
            setLoadingMurid(true);
            try {
                let url = `/murid?limit=100`;
                if (searchMurid.trim().length >= 2) {
                    url += `&q=${encodeURIComponent(searchMurid)}`;
                }
                if (filterKelas) {
                    url += `&kelas_id=${filterKelas}`;
                }
                const res = await api.get(url);
                setMuridList(res.data.data || []);
            } catch (err) {
                console.error('Error search murid:', err);
            }
            setLoadingMurid(false);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchMurid, filterKelas]);

    const loadKategori = async () => {
        try {
            const res = await api.get('/perilaku/kategori');
            setKategori(res.data.data);
        } catch (err) {
            console.error('Error load kategori:', err);
        }
    };

    const loadKelas = async () => {
        try {
            const res = await api.get('/kelas');
            setKelasList(res.data.data || []);
        } catch (err) {
            console.error('Error load kelas:', err);
        }
    };

    const toggleMurid = (id) => {
        setSelectedMuridIds(prev =>
            prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
        );
    };

    const toggleSelectAllMurid = () => {
        if (selectedMuridIds.length === muridList.length && muridList.length > 0) {
            setSelectedMuridIds([]);
        } else {
            setSelectedMuridIds(muridList.map(m => m.id));
        }
    };

    const toggleKategori = (katKey) => {
        setSelectedKategoris(prev =>
            prev.includes(katKey) ? prev.filter(k => k !== katKey) : [...prev, katKey]
        );
    };

    const resetDateTime = () => {
        setForm({ ...form, tanggal: getToday(), waktu: getNow() });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (selectedMuridIds.length === 0) {
            setMessage({ type: 'error', text: '❌ Pilih minimal 1 murid!' });
            return;
        }

        if (selectedKategoris.length === 0) {
            setMessage({ type: 'error', text: '❌ Pilih minimal 1 kategori perilaku!' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const payload = {
                murid_ids: selectedMuridIds,
                kategoris: selectedKategoris,
                deskripsi: form.deskripsi,
                tanggal: form.tanggal,
                waktu: form.waktu
            };

            const res = await api.post('/perilaku', payload);
            setMessage({
                type: 'success',
                text: `✅ ${res.data.message}`
            });

            // Reset Form & Pilihan
            setForm({
                deskripsi: '',
                tanggal: getToday(),
                waktu: getNow()
            });
            setSelectedMuridIds([]);
            setSelectedKategoris([]);
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan catatan perilaku')
            });
        }

        setLoading(false);
    };

    const isDateChanged = form.tanggal !== getToday();
    const isTimeChanged = form.waktu !== getNow();

    // Menggabungkan list positif dan negatif untuk mempermudah pencarian label badge
    const allKategoriList = [...(kategori.positif || []), ...(kategori.negatif || [])];

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    📝 Catat Perilaku Murid
                </h1>

                {message && (
                    <div className={`p-4 rounded-xl mb-4 font-medium border text-sm ${
                        message.type === 'success' 
                            ? 'bg-green-50 border-green-400 text-green-800' 
                            : 'bg-red-50 border-red-400 text-red-800'
                    }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
                    
                    {/* ============================================
                        1. PILIH MURID (MULTI-SELECT)
                    ============================================ */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-gray-800 font-bold text-sm">
                                1️⃣ Pilih Murid ({selectedMuridIds.length} dipilih)
                            </label>
                            {muridList.length > 0 && (
                                <button
                                    type="button"
                                    onClick={toggleSelectAllMurid}
                                    className="text-xs font-semibold text-blue-600 hover:underline"
                                >
                                    {selectedMuridIds.length === muridList.length ? '☐ Batalkan Semua' : '☑️ Pilih Semua'}
                                </button>
                            )}
                        </div>

                        {/* Search & Filter Kelas */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <input
                                type="text"
                                value={searchMurid}
                                onChange={(e) => setSearchMurid(e.target.value)}
                                className="input-field md:col-span-2"
                                placeholder="🔍 Ketik nama atau NIS murid..."
                            />
                            <select
                                value={filterKelas}
                                onChange={(e) => setFilterKelas(e.target.value)}
                                className="input-field"
                            >
                                <option value="">Semua Kelas</option>
                                {kelasList.map(k => (
                                    <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                ))}
                            </select>
                        </div>

                        {/* Daftar Checkbox Murid */}
                        <div className="border rounded-xl max-h-48 overflow-y-auto bg-gray-50/50 divide-y divide-gray-100">
                            {loadingMurid ? (
                                <p className="p-4 text-center text-gray-500 text-sm">⏳ Memuat daftar murid...</p>
                            ) : muridList.length === 0 ? (
                                <p className="p-4 text-center text-gray-500 text-sm">Tidak ada data murid ditemukan</p>
                            ) : (
                                muridList.map(m => {
                                    const isSelected = selectedMuridIds.includes(m.id);
                                    return (
                                        <div
                                            key={m.id}
                                            onClick={() => toggleMurid(m.id)}
                                            className={`p-3 flex items-center justify-between cursor-pointer transition ${
                                                isSelected ? 'bg-blue-50/80' : 'hover:bg-gray-100'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <div>
                                                    <p className="font-semibold text-gray-800 text-sm">{m.nama_lengkap}</p>
                                                    <p className="text-xs text-gray-500">{m.nama_kelas} • NIS: {m.nis || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ============================================
                        2. TANGGAL & WAKTU KEJADIAN
                    ============================================ */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-gray-700 font-bold text-sm">
                                📅 Tanggal & Waktu Kejadian
                            </label>
                            <button
                                type="button"
                                onClick={resetDateTime}
                                className="text-xs text-blue-600 hover:underline font-medium"
                            >
                                🔄 Reset ke Sekarang
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">
                                    Tanggal
                                    {isDateChanged && <span className="ml-1 text-orange-500 text-[10px]">(diubah)</span>}
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
                                <label className="block text-xs text-gray-500 mb-1">
                                    Waktu
                                    {isTimeChanged && <span className="ml-1 text-orange-500 text-[10px]">(diubah)</span>}
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
                    </div>

                    {/* ============================================
                        3. KATEGORI PERILAKU (DROPDOWN MULTI-SELECT RAMPING)
                    ============================================ */}
                    <div>
                        <label className="block text-gray-800 font-bold text-sm mb-2">
                            2️⃣ Pilih Kategori Perilaku ({selectedKategoris.length} dipilih)
                        </label>

                        <div className="relative" ref={katDropdownRef}>
                            {/* Tombol Trigger Dropdown */}
                            <div
                                onClick={() => setShowKatDropdown(!showKatDropdown)}
                                className="input-field cursor-pointer flex justify-between items-center bg-white border border-gray-300 rounded-xl p-3 shadow-sm hover:border-blue-500 transition"
                            >
                                <span className={selectedKategoris.length === 0 ? 'text-gray-400 text-sm' : 'text-gray-800 text-sm font-medium'}>
                                    {selectedKategoris.length === 0
                                        ? '-- Klik untuk Pilih Kategori Perilaku --'
                                        : `${selectedKategoris.length} Kategori Dipilih`
                                    }
                                </span>
                                <span className="text-gray-400 text-xs">
                                    {showKatDropdown ? '▲' : '▼'}
                                </span>
                            </div>

                            {/* Badge Kategori Terpilih */}
                            {selectedKategoris.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {selectedKategoris.map(id => {
                                        const item = allKategoriList.find(k => k.id === id);
                                        if (!item) return null;
                                        const isPositif = item.jenis === 'positif';
                                        return (
                                            <span
                                                key={id}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold ${
                                                    isPositif 
                                                        ? 'bg-green-100 text-green-800 border border-green-300' 
                                                        : 'bg-red-100 text-red-800 border border-red-300'
                                                }`}
                                            >
                                                {item.label} ({isPositif ? `+${item.poin}` : item.poin})
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleKategori(id);
                                                    }}
                                                    className="hover:text-black font-bold text-sm leading-none ml-1"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Menu Popup Dropdown */}
                            {showKatDropdown && (
                                <div className="absolute z-20 w-full bg-white border border-gray-300 rounded-xl mt-1 max-h-64 overflow-y-auto shadow-2xl p-2 space-y-3">
                                    {/* Perilaku Positif */}
                                    {kategori.positif && kategori.positif.length > 0 && (
                                        <div>
                                            <p className="px-2 py-1 text-[11px] font-bold text-green-700 uppercase tracking-wider bg-green-50 rounded-md">
                                                🌟 Perilaku Positif (Penambahan Poin)
                                            </p>
                                            <div className="mt-1 space-y-0.5">
                                                {kategori.positif.map(k => {
                                                    const isSelected = selectedKategoris.includes(k.id);
                                                    return (
                                                        <div
                                                            key={k.id}
                                                            onClick={() => toggleKategori(k.id)}
                                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                                                                isSelected ? 'bg-green-100 font-bold text-green-900' : 'hover:bg-gray-100 text-gray-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => {}}
                                                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                                                                />
                                                                <span>{k.label}</span>
                                                            </div>
                                                            <span className="font-bold text-green-600">+{k.poin} Poin</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Perilaku Negatif */}
                                    {kategori.negatif && kategori.negatif.length > 0 && (
                                        <div>
                                            <p className="px-2 py-1 text-[11px] font-bold text-red-700 uppercase tracking-wider bg-red-50 rounded-md">
                                                ⚠️ Perilaku Negatif (Pengurangan Poin)
                                            </p>
                                            <div className="mt-1 space-y-0.5">
                                                {kategori.negatif.map(k => {
                                                    const isSelected = selectedKategoris.includes(k.id);
                                                    return (
                                                        <div
                                                            key={k.id}
                                                            onClick={() => toggleKategori(k.id)}
                                                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                                                                isSelected ? 'bg-red-100 font-bold text-red-900' : 'hover:bg-gray-100 text-gray-700'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => {}}
                                                                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                                                                />
                                                                <span>{k.label}</span>
                                                            </div>
                                                            <span className="font-bold text-red-600">{k.poin} Poin</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ============================================
                        4. DESKRIPSI (OPSIONAL)
                    ============================================ */}
                    <div>
                        <label className="block text-gray-800 font-bold text-sm mb-1">
                            3️⃣ Deskripsi (opsional)
                        </label>
                        <textarea
                            value={form.deskripsi}
                            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                            className="input-field"
                            rows="3"
                            placeholder="Keterangan tambahan..."
                        />
                    </div>

                    {/* BUTTON SUBMIT */}
                    <button
                        type="submit"
                        disabled={loading || selectedMuridIds.length === 0 || selectedKategoris.length === 0}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading 
                            ? '⏳ Menyimpan...' 
                            : `SIMPAN PERILAKU (${selectedMuridIds.length} Murid, ${selectedKategoris.length} Kategori)`
                        }
                    </button>
                </form>
            </div>
        </div>
    );
}