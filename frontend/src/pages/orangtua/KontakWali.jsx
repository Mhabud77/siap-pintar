import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function KontakWali() {
    const navigate = useNavigate();
    const { murid_id } = useParams();
    const [data, setData] = useState(null);
    const [pesanList, setPesanList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState(null);

    const [form, setForm] = useState({
        penerima_id: '',
        jenis_penerima: 'wali_kelas',
        kategori: 'lainnya',
        judul: '',
        pesan: ''
    });

    useEffect(() => { loadData(); }, [murid_id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [kontakRes, pesanRes] = await Promise.all([
                api.get(`/orangtua/kontak/${murid_id}`),
                api.get(`/orangtua/pesan?murid_id=${murid_id}`)
            ]);
            setData(kontakRes.data.data);
            setPesanList(pesanRes.data.data || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const openModal = (penerima, jenis) => {
        setForm({
            penerima_id: penerima.id,
            jenis_penerima: jenis,
            kategori: 'lainnya',
            judul: '',
            pesan: ''
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            await api.post('/orangtua/pesan', { ...form, murid_id });
            setMessage({ type: 'success', text: '✅ Pesan berhasil dikirim' });
            setShowModal(false);
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ ' + (err.response?.data?.message || 'Gagal') });
        }
        setSending(false);
    };

    if (loading) return <div className="p-6 text-center">⏳ Memuat...</div>;
    if (!data) return <div className="p-6 text-center">Data tidak ditemukan</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/orangtua')} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali
                </button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">💬 Kontak Wali Kelas & BK</h1>

                {message && (
                    <div className={`card mb-4 border-l-4 ${
                        message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                    }`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
                    </div>
                )}

                {/* WALI KELAS */}
                {data.wali_kelas && (
                    <div className="card mb-4 bg-blue-50 border-l-4 border-blue-500">
                        <div className="flex justify-between items-center flex-wrap gap-3">
                            <div className="flex items-center gap-4">
                                {data.wali_kelas.foto_profil ? (
                                    <img src={`${BASE_URL}${data.wali_kelas.foto_profil}`} alt={data.wali_kelas.nama_lengkap} className="w-16 h-16 rounded-full object-cover" />
                                ) : (
                                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                        {data.wali_kelas.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-blue-600 font-bold uppercase">WALI KELAS</p>
                                    <p className="font-bold text-lg">{data.wali_kelas.nama_lengkap}</p>
                                    <p className="text-sm text-gray-600">📧 {data.wali_kelas.email || '-'}</p>
                                    <p className="text-sm text-gray-600">📞 {data.wali_kelas.no_telepon || '-'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openModal(data.wali_kelas, 'wali_kelas')} className="btn-primary">
                                    💬 Kirim Pesan
                                </button>
                                {data.wali_kelas.no_telepon && (
                                    <a
                                        href={`https://wa.me/${data.wali_kelas.no_telepon.replace(/^0/, '62')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-success"
                                    >
                                        📱 WA
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* GURU BK */}
                {data.guru_bk && (
                    <div className="card mb-6 bg-purple-50 border-l-4 border-purple-500">
                        <div className="flex justify-between items-center flex-wrap gap-3">
                            <div className="flex items-center gap-4">
                                {data.guru_bk.foto_profil ? (
                                    <img src={`${BASE_URL}${data.guru_bk.foto_profil}`} alt={data.guru_bk.nama_lengkap} className="w-16 h-16 rounded-full object-cover" />
                                ) : (
                                    <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                        {data.guru_bk.nama_lengkap.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-purple-600 font-bold uppercase">GURU BK</p>
                                    <p className="font-bold text-lg">{data.guru_bk.nama_lengkap}</p>
                                    <p className="text-sm text-gray-600">📧 {data.guru_bk.email || '-'}</p>
                                    <p className="text-sm text-gray-600">📞 {data.guru_bk.no_telepon || '-'}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openModal(data.guru_bk, 'guru_bk')} className="btn-primary">
                                    💬 Kirim Pesan
                                </button>
                                {data.guru_bk.no_telepon && (
                                    <a
                                        href={`https://wa.me/${data.guru_bk.no_telepon.replace(/^0/, '62')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-success"
                                    >
                                        📱 WA
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* RIWAYAT PESAN */}
                <div className="card">
                    <h3 className="font-bold text-lg mb-4">📩 Riwayat Pesan</h3>
                    {pesanList.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">Belum ada pesan</p>
                    ) : (
                        <div className="space-y-3">
                            {pesanList.map((p) => (
                                <div key={p.id} className="border rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold">{p.judul}</p>
                                            <p className="text-xs text-gray-500">
                                                Kepada: {p.penerima_nama} • {new Date(p.created_at).toLocaleDateString('id-ID')}
                                            </p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                            p.status === 'dibalas' ? 'bg-green-100 text-green-700' :
                                            p.status === 'selesai' ? 'bg-gray-100' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700">{p.pesan}</p>
                                    {p.balasan && (
                                        <div className="mt-2 bg-green-50 p-2 rounded border-l-4 border-green-500">
                                            <p className="text-xs font-bold text-green-700">✅ Balasan:</p>
                                            <p className="text-sm">{p.balasan}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                            <h2 className="text-xl font-bold mb-4">✉️ Kirim Pesan</h2>
                            <form onSubmit={handleSubmit}>
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Kategori</label>
                                    <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="input-field">
                                        <option value="akademik">📚 Akademik</option>
                                        <option value="pribadi">💭 Pribadi</option>
                                        <option value="sosial">👥 Sosial</option>
                                        <option value="lainnya">📝 Lainnya</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Judul *</label>
                                    <input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="input-field" required />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-1">Pesan *</label>
                                    <textarea value={form.pesan} onChange={(e) => setForm({ ...form, pesan: e.target.value })} className="input-field" rows="4" required />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" disabled={sending} className="btn-primary flex-1 disabled:opacity-50">
                                        {sending ? '⏳ Mengirim...' : '📤 Kirim'}
                                    </button>
                                    <button type="button" onClick={() => setShowModal(false)} className="bg-gray-300 px-4 py-2 rounded-lg">Batal</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}