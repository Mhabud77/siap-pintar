import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function CatatanWaliKelas() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const muridIdFromUrl = searchParams.get('murid_id');

    const [muridList, setMuridList] = useState([]);
    const [kelas, setKelas] = useState(null);
    const [selectedMurid, setSelectedMurid] = useState(null);
    const [catatanExisting, setCatatanExisting] = useState(null);
    const [justSaved, setJustSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Form
    const [periode, setPeriode] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [jenis, setJenis] = useState('bulanan');
    const [catatan, setCatatan] = useState('');
    const [saran, setSaran] = useState('');

    useEffect(() => {
        loadMurid();
    }, []);

    useEffect(() => {
        if (selectedMurid) {
            setJustSaved(false);
            loadCatatanExisting();
        }
    }, [selectedMurid, periode, jenis]);

    const loadMurid = async () => {
    setLoading(true);
    try {
        const res = await api.get('/wali-kelas/murid');
        setMuridList(res.data.data || []);
        setKelas(res.data.kelas);
        // ...
    } catch (err) {
        if (err.response?.status === 403) {
            setMessage({
                type: 'error',
                text: 'Anda bukan wali kelas. Hanya wali kelas yang dapat mengakses halaman ini.'
            });
        } else {
            setMessage({ type: 'error', text: 'Gagal memuat data murid' });
        }
    }
    setLoading(false);
    };

    const loadCatatanExisting = async () => {
    try {
        const res = await api.get(`/catatan/murid/${selectedMurid.id}?periode=${periode}&jenis=${jenis}`);
        if (res.data.data) {
            setCatatanExisting(res.data.data);
            // Hanya overwrite form kalau BUKAN baru disimpan
            if (!justSaved) {
                setCatatan(res.data.data.catatan || '');
                setSaran(res.data.data.saran || '');
            }
        } else {
            setCatatanExisting(null);
            setCatatan('');
            setSaran('');
        }
    } catch (err) {
        console.error('Error load catatan:', err);
    }
    };

    const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMurid) {
        setMessage({ type: 'error', text: 'Pilih murid dulu!' });
        return;
    }

    setSaving(true);
    try {
        await api.post('/catatan', {
            murid_id: selectedMurid.id,
            periode,
            jenis,
            catatan,
            saran
        });

        // Tandai baru disimpan
        setJustSaved(true);

        setMessage({
            type: 'success',
            text: `✅ Catatan untuk ${selectedMurid.nama_lengkap} berhasil disimpan!`
        });

        // Reload catatan existing (tapi form tidak akan ter-overwrite)
        loadCatatanExisting();

        // Reset flag setelah 2 detik
        setTimeout(() => setJustSaved(false), 2000);

    } catch (err) {
        setMessage({
            type: 'error',
            text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan')
        });
    }
    setSaving(false);
    };

    const handleDelete = async () => {
        if (!catatanExisting) return;
        if (!confirm('Yakin hapus catatan ini?')) return;

        try {
            await api.delete(`/catatan/${catatanExisting.id}`);
            setMessage({ type: 'success', text: '✅ Catatan berhasil dihapus' });
            setCatatanExisting(null);
            setCatatan('');
            setSaran('');
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal menghapus' });
        }
    };

    // Generate periode options
    const periodeOptions = () => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            options.push({ value: val, label });
        }
        return options;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="card text-center py-12">
                        <div className="text-3xl">⏳</div>
                        <p className="text-gray-600 mt-2">Memuat data...</p>
                    </div>
                </div>
            </div>
        );
    }

// ============================================
// CEK: HANYA WALI KELAS YANG BISA AKSES
// ============================================
if (message?.type === 'error' && message.text.includes('bukan wali kelas')) {
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/guru')}
                    className="text-primary hover:underline mb-4 text-sm"
                >
                    ← Kembali ke Dashboard
                </button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">
                    ✍️ Catatan Wali Kelas
                </h1>

                <div className="card bg-yellow-50 border-l-4 border-yellow-500">
                    <div className="flex items-start gap-4">
                        <div className="text-5xl">⚠️</div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-yellow-800">
                                Akses Terbatas
                            </h2>
                            <p className="text-yellow-700 mt-2">
                                Anda bukan wali kelas. Hanya wali kelas yang dapat
                                mengisi catatan untuk murid.
                            </p>
                            <p className="text-yellow-600 text-sm mt-3">
                                💡 Jika Anda seharusnya menjadi wali kelas, hubungi
                                admin untuk set Anda sebagai wali kelas di menu
                                <strong> Kelola Kelas</strong>.
                            </p>
                            <button
                                onClick={() => navigate('/guru')}
                                className="btn-primary mt-4"
                            >
                                ← Kembali ke Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/guru')}
                        className="text-primary hover:underline mb-2 text-sm"
                    >
                        ← Kembali ke Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">
                        ✍️ Catatan Wali Kelas
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Tulis catatan perkembangan murid. Catatan akan otomatis muncul di laporan.
                    </p>
                </div>

                {/* MESSAGE */}
                {message && (
                    <div className={`card mb-4 border-l-4 ${
                        message.type === 'success'
                            ? 'bg-green-50 border-green-500'
                            : 'bg-red-50 border-red-500'
                    }`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                            {message.text}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* ============================================
                        KOLOM KIRI: DAFTAR MURID
                    ============================================ */}
                    <div className="md:col-span-1">
                        <div className="card">
                            <h2 className="font-bold text-gray-800 mb-3">
                                👥 Pilih Murid ({muridList.length})
                            </h2>
                            <div className="space-y-1 max-h-96 overflow-y-auto">
                                {muridList.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedMurid(m)}
                                        className={`w-full text-left px-3 py-2 rounded-lg transition ${
                                            selectedMurid?.id === m.id
                                                ? 'bg-primary text-white'
                                                : 'hover:bg-gray-100 text-gray-700'
                                        }`}
                                    >
                                        <p className="font-medium text-sm">{m.nama_lengkap}</p>
                                        <p className={`text-xs ${
                                            selectedMurid?.id === m.id ? 'text-blue-100' : 'text-gray-500'
                                        }`}>
                                            NIS: {m.nis}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ============================================
                        KOLOM KANAN: FORM CATATAN
                    ============================================ */}
                    <div className="md:col-span-2">
                        {!selectedMurid ? (
                            <div className="card text-center py-12">
                                <div className="text-6xl mb-4">👈</div>
                                <p className="text-gray-600">
                                    Pilih murid di sebelah kiri untuk menulis catatan
                                </p>
                            </div>
                        ) : (
                            <div className="card">
                                {/* HEADER MURID */}
                                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                                        {selectedMurid.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-gray-800">
                                            {selectedMurid.nama_lengkap}
                                        </h2>
                                        <p className="text-sm text-gray-500">
                                            NIS: {selectedMurid.nis} • Kelas: {kelas?.nama_kelas}
                                        </p>
                                    </div>
                                </div>

                                {/* FORM */}
                                <form onSubmit={handleSubmit}>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                Periode
                                            </label>
                                            <select
                                                value={periode}
                                                onChange={(e) => setPeriode(e.target.value)}
                                                className="input-field"
                                            >
                                                {periodeOptions().map(p => (
                                                    <option key={p.value} value={p.value}>{p.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                                Jenis
                                            </label>
                                            <select
                                                value={jenis}
                                                onChange={(e) => setJenis(e.target.value)}
                                                className="input-field"
                                            >
                                                <option value="bulanan">Bulanan</option>
                                                <option value="semester">Semester</option>
                                                <option value="tahunan">Tahunan</option>
                                            </select>
                                        </div>
                                    </div>

                                    {catatanExisting && !justSaved && (
                                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-4">
                                            <p className="text-xs text-yellow-700">
                                                ⚠️ Catatan untuk periode ini sudah ada. Mengedit akan menimpa catatan lama.
                                            </p>
                                        </div>
                                    )}

                                    {justSaved && (
                                        <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded mb-4">
                                            <p className="text-xs text-green-700">
                                                ✅ Catatan berhasil disimpan. Form tetap menampilkan tulisan Anda.
                                            </p>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            Catatan Perkembangan <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={catatan}
                                            onChange={(e) => setCatatan(e.target.value)}
                                            className="input-field"
                                            rows="5"
                                            placeholder="Contoh: Ahmad menunjukkan prestasi yang baik di bidang akademik. Rajin dan aktif dalam kegiatan kelas."
                                            required
                                        />
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                            Saran / Rekomendasi (opsional)
                                        </label>
                                        <textarea
                                            value={saran}
                                            onChange={(e) => setSaran(e.target.value)}
                                            className="input-field"
                                            rows="3"
                                            placeholder="Contoh: Pertahankan prestasi, dan tingkatkan kedisiplinan waktu."
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="submit"
                                            disabled={saving}
                                            className="btn-primary flex-1 disabled:opacity-50"
                                        >
                                            {saving ? '⏳ Menyimpan...' : '💾 Simpan Catatan'}
                                        </button>
                                        {catatanExisting && (
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                className="btn-danger"
                                            >
                                                🗑️ Hapus
                                            </button>
                                        )}
                                    </div>
                                </form>

                                {/* INFO */}
                                <div className="mt-4 pt-4 border-t border-gray-200 bg-blue-50 rounded p-3">
                                    <p className="text-xs text-blue-700">
                                        💡 <strong>Tips:</strong> Catatan ini akan otomatis muncul di halaman Laporan
                                        saat Anda atau orang tua melihat laporan periode <strong>{periode}</strong>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}