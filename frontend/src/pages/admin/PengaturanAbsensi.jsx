import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function PengaturanAbsensi() {
    const navigate = useNavigate();
    const [pengaturan, setPengaturan] = useState({
        jam_buka_absen_datang: '05:00',
        jam_tutup_absen_datang: '08:00',
        jam_buka_absen_pulang: '12:00',
        jam_tutup_absen_pulang: '17:00',
        jam_reset_harian: '00:00'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadPengaturan();
    }, []);

    const loadPengaturan = async () => {
        setLoading(true);
        try {
            const res = await api.get('/pengaturan/absensi');
            setPengaturan(res.data.data);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Gagal memuat pengaturan' });
        }
        setLoading(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            await api.put('/pengaturan/absensi', { pengaturan });
            setMessage({ type: 'success', text: '✅ Pengaturan berhasil disimpan!' });
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan')
            });
        }
        setSaving(false);
    };

    const handleChange = (e) => {
        setPengaturan({ ...pengaturan, [e.target.name]: e.target.value });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-3xl mx-auto">
                    <div className="card text-center py-12">⏳ Memuat...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-primary hover:underline mb-2 text-sm"
                    >
                        ← Kembali ke Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">⚙️ Pengaturan Absensi</h1>
                    <p className="text-gray-600 mt-1">Atur jam buka/tutup absensi dan reset harian</p>
                </div>

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

                <form onSubmit={handleSubmit} className="card space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Absen Datang */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <h3 className="font-bold text-blue-800 mb-3">📥 Absen Datang</h3>
                            <div className="mb-3">
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Jam Buka
                                </label>
                                <input
                                    type="time"
                                    name="jam_buka_absen_datang"
                                    value={pengaturan.jam_buka_absen_datang || '05:00'}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Jam Tutup
                                </label>
                                <input
                                    type="time"
                                    name="jam_tutup_absen_datang"
                                    value={pengaturan.jam_tutup_absen_datang || '08:00'}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>

                        {/* Absen Pulang */}
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <h3 className="font-bold text-green-800 mb-3">📤 Absen Pulang</h3>
                            <div className="mb-3">
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Jam Buka
                                </label>
                                <input
                                    type="time"
                                    name="jam_buka_absen_pulang"
                                    value={pengaturan.jam_buka_absen_pulang || '12:00'}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    Jam Tutup
                                </label>
                                <input
                                    type="time"
                                    name="jam_tutup_absen_pulang"
                                    value={pengaturan.jam_tutup_absen_pulang || '17:00'}
                                    onChange={handleChange}
                                    className="input-field"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            🕛 Jam Reset Harian
                        </label>
                        <input
                            type="time"
                            name="jam_reset_harian"
                            value={pengaturan.jam_reset_harian || '00:00'}
                            onChange={handleChange}
                            className="input-field"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Waktu di mana data absensi direset (biasanya tengah malam).
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="btn-primary w-full py-3 disabled:opacity-50"
                    >
                        {saving ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan'}
                    </button>
                </form>
            </div>
        </div>
    );
}