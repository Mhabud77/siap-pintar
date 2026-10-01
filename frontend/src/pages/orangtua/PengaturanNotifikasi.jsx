import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function PengaturanNotifikasi() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/orangtua/pengaturan');
            setData(res.data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleToggle = (key) => {
        setData(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await api.put('/orangtua/pengaturan', data);
            setMessage({ type: 'success', text: '✅ Pengaturan berhasil disimpan' });
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal menyimpan' });
        }
        setSaving(false);
    };

    if (loading) return <div className="p-6 text-center">⏳ Memuat...</div>;
    if (!data) return <div className="p-6 text-center">Data tidak ditemukan</div>;

    const items = [
        { key: 'notif_wa_aktif', icon: '📱', label: 'Notifikasi WhatsApp Aktif', desc: 'Terima notifikasi via WhatsApp' },
        { key: 'notif_absensi', icon: '📥', label: 'Notifikasi Absensi', desc: 'Terima notif saat anak absen datang/pulang' },
        { key: 'notif_perilaku', icon: '📝', label: 'Notifikasi Perilaku', desc: 'Terima notif saat ada catatan perilaku' },
        { key: 'notif_misi', icon: '🎯', label: 'Notifikasi Misi', desc: 'Terima notif saat misi divalidasi' }
    ];

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => navigate('/orangtua')} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali
                </button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">⚙️ Pengaturan Notifikasi</h1>

                {message && (
                    <div className={`card mb-4 border-l-4 ${
                        message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                    }`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
                    </div>
                )}

                <div className="card mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Atur jenis notifikasi yang ingin Anda terima via WhatsApp.
                    </p>

                    <div className="space-y-3">
                        {items.map((item) => (
                            <div key={item.key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{item.icon}</span>
                                    <div>
                                        <p className="font-bold">{item.label}</p>
                                        <p className="text-xs text-gray-500">{item.desc}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggle(item.key)}
                                    className={`w-14 h-8 rounded-full transition relative ${
                                        data[item.key] ? 'bg-green-500' : 'bg-gray-300'
                                    }`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all ${
                                        data[item.key] ? 'left-7' : 'left-1'
                                    }`}></div>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary w-full py-3 disabled:opacity-50"
                >
                    {saving ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan'}
                </button>
            </div>
        </div>
    );
}