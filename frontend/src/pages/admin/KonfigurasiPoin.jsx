import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

// Label human-readable untuk setiap konfigurasi
const LABEL_KONFIGURASI = {
    // ABSENSI
    'poin_datang_sebelum_630': { label: 'Datang Sebelum 06:30', emoji: '🌅' },
    'poin_datang_630_645': { label: 'Datang 06:30 - 06:45', emoji: '☀️' },
    'poin_datang_645_700': { label: 'Datang 06:45 - 07:00', emoji: '⏰' },
    'poin_terlambat': { label: 'Terlambat (setelah 07:00)', emoji: '⏱️' },
    'poin_tidak_masuk': { label: 'Tidak Masuk (Alpa)', emoji: '❌' },

    // PERILAKU POSITIF
    'poin_datang_tepat_waktu': { label: 'Datang Tepat Waktu', emoji: '✅' },
    'poin_membantu_guru': { label: 'Membantu Guru', emoji: '👨‍🏫' },
    'poin_membantu_teman': { label: 'Membantu Teman', emoji: '🤝' },
    'poin_membersihkan_kelas': { label: 'Membersihkan Kelas', emoji: '🧹' },
    'poin_membuang_sampah': { label: 'Membuang Sampah pada Tempatnya', emoji: '🗑️' },
    'poin_sopan_santun': { label: 'Sopan Santun', emoji: '🙏' },
    'poin_berprestasi': { label: 'Berprestasi', emoji: '🏆' },
    'poin_aktif_diskusi': { label: 'Aktif dalam Diskusi', emoji: '💬' },

    // PERILAKU NEGATIF
    'poin_terlambat_masuk_kelas': { label: 'Terlambat Masuk Kelas', emoji: '⏰' },
    'poin_seragam_tidak_lengkap': { label: 'Seragam Tidak Lengkap', emoji: '👕' },
    'poin_buang_sampah_sembarangan': { label: 'Buang Sampah Sembarangan', emoji: '🚮' },
    'poin_tidak_sopan': { label: 'Tidak Sopan', emoji: '😠' },
    'poin_meninggalkan_kelas': { label: 'Meninggalkan Kelas', emoji: '🚪' },
    'poin_berkelahi': { label: 'Berkelahi', emoji: '🥊' },
    'poin_merokok': { label: 'Merokok', emoji: '🚭' },
    'poin_menyontek': { label: 'Menyontek', emoji: '📝' },
    'poin_bullying': { label: 'Bullying', emoji: '😢' },

    // MISI
    'poin_misi_default': { label: 'Poin Reward Misi Default', emoji: '🎯' },
    'poin_misi_minimal': { label: 'Poin Reward Misi Minimal', emoji: '⬇️' },
    'poin_misi_maksimal': { label: 'Poin Reward Misi Maksimal', emoji: '⬆️' }
};

export default function KonfigurasiPoin() {
    const navigate = useNavigate();
    const [konfigurasi, setKonfigurasi] = useState({
        absensi: [],
        perilaku_positif: [],
        perilaku_negatif: [],
        misi: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [changed, setChanged] = useState({}); // { id: nilaiBaru }
    const [activeTab, setActiveTab] = useState('absensi');

    useEffect(() => {
        loadKonfigurasi();
    }, []);

    const loadKonfigurasi = async () => {
        setLoading(true);
        try {
            const res = await api.get('/konfigurasi');
            setKonfigurasi(res.data.data);
            setChanged({});
        } catch (err) {
            console.error('Error load konfigurasi:', err);
            setMessage({ type: 'error', text: 'Gagal memuat konfigurasi' });
        }
        setLoading(false);
    };

    const handleChange = (id, nilai) => {
        setChanged({ ...changed, [id]: parseInt(nilai) || 0 });
    };

    const handleSave = async () => {
        const items = Object.entries(changed).map(([id, nilai]) => ({
            id: parseInt(id),
            nilai
        }));

        if (items.length === 0) {
            setMessage({ type: 'info', text: 'Tidak ada perubahan untuk disimpan' });
            return;
        }

        setSaving(true);
        try {
            await api.put('/konfigurasi/bulk', { konfigurasi: items });
            setMessage({ type: 'success', text: `✅ ${items.length} konfigurasi berhasil disimpan!` });
            loadKonfigurasi();
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan')
            });
        }
        setSaving(false);
    };

    const handleReset = async () => {
        if (!confirm('Yakin reset semua konfigurasi ke nilai default?')) return;

        try {
            await api.post('/konfigurasi/reset');
            setMessage({ type: 'success', text: '✅ Semua konfigurasi berhasil direset ke default' });
            loadKonfigurasi();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal reset' });
        }
    };

    const getNilaiDisplay = (item) => {
        const nilai = changed[item.id] !== undefined ? changed[item.id] : item.nilai;
        return nilai;
    };

    const isChanged = (id) => changed[id] !== undefined;

    const totalChanged = Object.keys(changed).length;

    // Tab config
    const tabs = [
        { id: 'absensi', label: '📅 Absensi', count: konfigurasi.absensi.length },
        { id: 'perilaku_positif', label: '🌟 Perilaku Positif', count: konfigurasi.perilaku_positif.length },
        { id: 'perilaku_negatif', label: '⚠️ Perilaku Negatif', count: konfigurasi.perilaku_negatif.length },
        { id: 'misi', label: '🎯 Misi', count: konfigurasi.misi.length }
    ];

    const currentData = konfigurasi[activeTab] || [];

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
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
                                ⭐ Konfigurasi Poin
                            </h1>
                            <p className="text-gray-600 mt-1">
                                Atur poin untuk absensi, perilaku, dan misi
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleReset}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium"
                            >
                                🔄 Reset Default
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || totalChanged === 0}
                                className="btn-primary disabled:opacity-50"
                            >
                                {saving ? '⏳ Menyimpan...' : `💾 Simpan${totalChanged > 0 ? ` (${totalChanged})` : ''}`}
                            </button>
                        </div>
                    </div>
                </div>

                {/* INFO */}
                {totalChanged > 0 && (
                    <div className="card mb-4 bg-yellow-50 border-l-4 border-yellow-500">
                        <p className="text-yellow-700">
                            ⚠️ Ada <strong>{totalChanged}</strong> perubahan yang belum disimpan.
                            Klik tombol <strong>Simpan</strong> untuk menerapkan.
                        </p>
                    </div>
                )}

                {/* MESSAGE */}
                {message && (
                    <div className={`card mb-4 border-l-4 ${
                        message.type === 'success' ? 'bg-green-50 border-green-500' :
                        message.type === 'error' ? 'bg-red-50 border-red-500' :
                        'bg-blue-50 border-blue-500'
                    }`}>
                        <p className={
                            message.type === 'success' ? 'text-green-700' :
                            message.type === 'error' ? 'text-red-700' :
                            'text-blue-700'
                        }>
                            {message.text}
                        </p>
                    </div>
                )}

                {/* TABS */}
                <div className="card mb-4">
                    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-lg font-medium transition ${
                                    activeTab === tab.id
                                        ? 'bg-primary text-white shadow'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {tab.label}
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                    activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* KONTEN */}
                {loading ? (
                    <div className="card text-center py-12 text-gray-500">
                        ⏳ Memuat konfigurasi...
                    </div>
                ) : currentData.length === 0 ? (
                    <div className="card text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-gray-600">Belum ada konfigurasi di kategori ini</p>
                    </div>
                ) : (
                    <div className="card">
                        {/* INFO KATEGORI */}
                        <div className="mb-4 pb-3 border-b border-gray-200">
                            <p className="text-sm text-gray-600">
                                {activeTab === 'absensi' && '📅 Poin untuk kehadiran murid (datang tepat waktu atau terlambat)'}
                                {activeTab === 'perilaku_positif' && '🌟 Poin reward untuk perilaku baik murid'}
                                {activeTab === 'perilaku_negatif' && '⚠️ Pengurangan poin untuk pelanggaran murid'}
                                {activeTab === 'misi' && '🎯 Poin reward untuk misi kebaikan'}
                            </p>
                        </div>

                        {/* LIST KONFIGURASI */}
                        <div className="space-y-3">
                            {currentData.map(item => {
                                const info = LABEL_KONFIGURASI[item.nama_konfigurasi] || {
                                    label: item.nama_konfigurasi,
                                    emoji: '⚙️'
                                };
                                const nilaiSekarang = getNilaiDisplay(item);
                                const berubah = isChanged(item.id);

                                return (
                                    <div
                                        key={item.id}
                                        className={`flex items-center gap-4 p-3 rounded-lg border-2 transition ${
                                            berubah
                                                ? 'border-yellow-400 bg-yellow-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                    >
                                        {/* Emoji */}
                                        <div className="text-3xl flex-shrink-0">
                                            {info.emoji}
                                        </div>

                                        {/* Label */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-800">
                                                {info.label}
                                            </p>
                                            {item.keterangan && (
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {item.keterangan}
                                                </p>
                                            )}
                                        </div>

                                        {/* Input Nilai */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleChange(item.id, nilaiSekarang - 1)}
                                                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold"
                                            >
                                                −
                                            </button>
                                            <input
                                                type="number"
                                                value={nilaiSekarang}
                                                onChange={(e) => handleChange(item.id, e.target.value)}
                                                className={`w-20 text-center font-bold text-lg px-2 py-1 border-2 rounded-lg ${
                                                    berubah
                                                        ? 'border-yellow-400 bg-white'
                                                        : 'border-gray-300'
                                                } ${
                                                    nilaiSekarang > 0 ? 'text-green-600' :
                                                    nilaiSekarang < 0 ? 'text-red-600' :
                                                    'text-gray-600'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleChange(item.id, nilaiSekarang + 1)}
                                                className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold"
                                            >
                                                +
                                            </button>
                                        </div>

                                        {/* Nilai Lama */}
                                        {berubah && (
                                            <div className="text-xs text-gray-500 flex-shrink-0">
                                                <p>Dari:</p>
                                                <p className="font-bold">{item.nilai}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* INFO TAMBAHAN */}
                <div className="card mt-6 bg-blue-50 border-l-4 border-blue-500">
                    <h3 className="font-bold text-blue-800 mb-2">
                        💡 Tips Konfigurasi Poin
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                        <li><strong>Poin Positif</strong> (10, 20, dst) → untuk reward perilaku baik</li>
                        <li><strong>Poin Negatif</strong> (-5, -10, dst) → untuk pengurangan pelanggaran</li>
                        <li>Klik tombol <strong>−</strong> / <strong>+</strong> atau ketik langsung untuk mengubah nilai</li>
                        <li>Klik <strong>Simpan</strong> untuk menerapkan perubahan</li>
                        <li>Klik <strong>Reset Default</strong> untuk mengembalikan ke nilai awal</li>
                        <li>Perubahan berlaku <strong>langsung</strong> untuk pencatatan berikutnya</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}