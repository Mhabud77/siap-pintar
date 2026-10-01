import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function DataKelasMurid() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/murid-dashboard/kelas');
            setData(res.data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    if (loading) return <div className="min-h-screen bg-gray-100 p-6"><div className="max-w-4xl mx-auto"><div className="card text-center py-12">⏳ Memuat...</div></div></div>;
    if (!data) return <div className="min-h-screen bg-gray-100 p-6"><div className="max-w-4xl mx-auto"><div className="card bg-red-50 border-l-4 border-red-500"><p className="text-red-700">❌ Data tidak ditemukan</p></div></div></div>;

    const { kelas, teman_sekelas } = data;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/murid')} className="text-primary hover:underline mb-4 text-sm">← Kembali</button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">🏫 Data Kelas {kelas?.nama_kelas}</h1>

                {/* INFO KELAS */}
                <div className="card mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Nama Kelas</p>
                            <p className="text-2xl font-bold text-primary">{kelas?.nama_kelas}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Tingkat</p>
                            <p className="text-2xl font-bold">{kelas?.tingkat}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm text-gray-500">Jumlah Murid</p>
                            <p className="text-2xl font-bold text-blue-600">{kelas?.jumlah_murid}</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t text-center">
                        <p className="text-sm text-gray-500">Rata-rata Poin Kelas</p>
                        <p className="text-3xl font-bold text-green-600">{kelas?.rata_poin}</p>
                    </div>
                </div>

                {/* WALI KELAS */}
                <div className="card mb-6 bg-blue-50 border-l-4 border-blue-500">
                    <h2 className="font-bold text-blue-800 mb-3">👨‍🏫 Wali Kelas</h2>
                    {kelas?.wali_kelas_nama ? (
                        <div className="flex items-center gap-4">
                            {kelas.wali_kelas_foto ? (
                                <img src={`${BASE_URL}${kelas.wali_kelas_foto}`} alt={kelas.wali_kelas_nama} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow" />
                            ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                    {kelas.wali_kelas_nama.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="font-bold text-lg text-blue-800">{kelas.wali_kelas_nama}</p>
                                <p className="text-sm text-blue-600">📧 {kelas.wali_kelas_email || '-'}</p>
                                <p className="text-sm text-blue-600">📞 {kelas.wali_kelas_telepon || '-'}</p>
                            </div>
                            {kelas.wali_kelas_telepon && (
                                <a href={`https://wa.me/${kelas.wali_kelas_telepon.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="btn-success text-sm">
                                    💬 WhatsApp
                                </a>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">Belum ada wali kelas</p>
                    )}
                </div>

                {/* TEMAN SEKELAS */}
                <div className="card">
                    <h2 className="font-bold text-gray-800 mb-4">👥 Teman Sekelas (Top 10 Poin)</h2>
                    <div className="space-y-2">
                        {teman_sekelas?.map((t, i) => (
                            <div key={t.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-500 w-6">#{i + 1}</span>
                                    {t.foto_profil ? (
                                        <img src={`${BASE_URL}${t.foto_profil}`} alt={t.nama_lengkap} className="w-8 h-8 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                            {t.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                        </div>
                                    )}
                                    <span className="font-medium">{t.nama_lengkap}</span>
                                </div>
                                <span className="font-bold text-primary">{t.poin_bulan_ini}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}