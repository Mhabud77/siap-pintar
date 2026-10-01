import { useState, useEffect } from 'react';
import api from '../services/api';

export default function MisiMurid() {
    const [misiList, setMisiList] = useState([]);
    const [pengerjaan, setPengerjaan] = useState([]);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadMisi();
        loadPengerjaan();
    }, []);

    const loadMisi = async () => {
        try {
            const res = await api.get('/misi/aktif');
            setMisiList(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const loadPengerjaan = async () => {
        try {
            const res = await api.get('/misi/pengerjaan');
            setPengerjaan(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    const ambilMisi = async (misi_id) => {
        try {
            await api.post('/misi/ambil', { misi_id });
            setMessage({ type: 'success', text: '✅ Misi berhasil diambil!' });
            loadPengerjaan();
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal')
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">
                    🎯 Misi Kebaikan
                </h1>

                {message && (
                    <div className={`card mb-4 ${message.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
                        {message.text}
                    </div>
                )}

                <h2 className="text-xl font-bold mb-4">Misi Tersedia</h2>
                <div className="grid gap-4 mb-8">
                    {misiList.map(misi => (
                        <div key={misi.id} className="card">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-lg font-bold">{misi.judul}</h3>
                                    <p className="text-gray-600">{misi.deskripsi}</p>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Kategori: {misi.kategori}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-600">
                                        +{misi.poin_reward}
                                    </p>
                                    <button
                                        onClick={() => ambilMisi(misi.id)}
                                        className="btn-primary mt-2"
                                    >
                                        Ambil Misi
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <h2 className="text-xl font-bold mb-4">Misi Saya</h2>
                <div className="grid gap-4">
                    {pengerjaan.map(p => (
                        <div key={p.id} className="card">
                            <div className="flex justify-between">
                                <div>
                                    <h3 className="font-bold">{p.judul}</h3>
                                    <p className="text-sm text-gray-500">
                                        Status: {p.status}
                                    </p>
                                </div>
                                <p className="font-bold text-green-600">
                                    +{p.poin_reward}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}