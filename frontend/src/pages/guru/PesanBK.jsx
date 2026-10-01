import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function PesanBK() {
    const navigate = useNavigate();
    const [pesanList, setPesanList] = useState([]);
    const [statistik, setStatistik] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [message, setMessage] = useState(null);

    // Chat thread
    const [chatDetail, setChatDetail] = useState(null);
    const [balasanBaru, setBalasanBaru] = useState('');
    const [sendingBalasan, setSendingBalasan] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => { loadData(); }, [filterStatus]);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatDetail]);

    const loadData = async () => {
        setLoading(true);
        try {
            let url = '/bk/pesan-masuk';
            if (filterStatus) url += `?status=${filterStatus}`;
            const [pesanRes, statRes] = await Promise.all([
                api.get(url), api.get('/bk/statistik')
            ]);
            setPesanList(pesanRes.data.data || []);
            setStatistik(statRes.data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const openChat = async (pesan) => {
        try {
            const res = await api.get(`/bk/pesan/${pesan.id}`);
            setChatDetail(res.data.data);

            // Auto update status jadi 'dibaca'
            if (pesan.status === 'menunggu') {
                await api.put(`/bk/status/${pesan.id}`, { status: 'dibaca' });
                loadData();
            }
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal buka chat' });
        }
    };

    const handleKirimBalasan = async (e) => {
        e.preventDefault();
        if (!balasanBaru.trim()) return;

        setSendingBalasan(true);
        try {
            await api.post(`/bk/pesan/${chatDetail.pesan.id}/balas`, { isi: balasanBaru });
            setBalasanBaru('');
            const res = await api.get(`/bk/pesan/${chatDetail.pesan.id}`);
            setChatDetail(res.data.data);
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal kirim' });
        }
        setSendingBalasan(false);
    };

    const handleHapusPesan = async (id) => {
        if (!confirm('Hapus pesan ini dari daftar Anda?')) return;
        try {
            await api.delete(`/bk/pesan/${id}`);
            setChatDetail(null);
            setMessage({ type: 'success', text: '✅ Pesan dihapus' });
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal hapus' });
        }
    };

    const handleHapusBalasan = async (balasan_id) => {
        if (!confirm('Hapus balasan ini?')) return;
        try {
            await api.delete(`/bk/balasan/${balasan_id}`);
            const res = await api.get(`/bk/pesan/${chatDetail.pesan.id}`);
            setChatDetail(res.data.data);
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal hapus' });
        }
    };

    const handleEditBalasan = async (balasan_id, isiBaru) => {
        try {
            await api.put(`/bk/balasan/${balasan_id}`, { isi: isiBaru });
            const res = await api.get(`/bk/pesan/${chatDetail.pesan.id}`);
            setChatDetail(res.data.data);
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal edit' });
        }
    };

    const handleSelesai = async (id) => {
        try {
            await api.put(`/bk/status/${id}`, { status: 'selesai' });
            setMessage({ type: 'success', text: '✅ Ditandai selesai' });
            setChatDetail(null);
            loadData();
        } catch (err) { console.error(err); }
    };

    const getStatusBadge = (status) => {
        const badges = {
            menunggu: 'bg-yellow-100 text-yellow-700',
            dibaca: 'bg-blue-100 text-blue-700',
            dibalas: 'bg-green-100 text-green-700',
            selesai: 'bg-gray-100 text-gray-700'
        };
        return badges[status] || 'bg-gray-100';
    };

    // ============================================
    // TAMPILAN CHAT DETAIL
    // ============================================
    if (chatDetail) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-3xl mx-auto">
                    <button onClick={() => setChatDetail(null)} className="text-primary hover:underline mb-4 text-sm">← Kembali</button>

                    <div className="card">
                        {/* Header */}
                        <div className="border-b pb-4 mb-4">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                                <div>
                                    <h1 className="text-xl font-bold text-gray-800">{chatDetail.pesan.judul}</h1>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Dari: <strong>{chatDetail.pesan.murid_nama}</strong> ({chatDetail.pesan.nama_kelas} - {chatDetail.pesan.nis})
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {chatDetail.pesan.kategori} • {new Date(chatDetail.pesan.created_at).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={`text-xs px-3 py-1 rounded-full ${getStatusBadge(chatDetail.pesan.status)}`}>
                                        {chatDetail.pesan.status.toUpperCase()}
                                    </span>
                                    <div className="flex gap-1">
                                        {chatDetail.pesan.status !== 'selesai' && (
                                            <button onClick={() => handleSelesai(chatDetail.pesan.id)} className="btn-success text-xs">✓ Selesai</button>
                                        )}
                                        <button onClick={() => handleHapusPesan(chatDetail.pesan.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs" title="Hapus">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="space-y-3 max-h-96 overflow-y-auto mb-4 p-2">
                            {/* Pesan Awal (Murid) */}
                            <div className="flex justify-start">
                                <div className="max-w-[75%] bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-2 shadow">
                                    <p className="text-xs font-bold text-gray-600 mb-1">{chatDetail.pesan.murid_nama} (murid)</p>
                                    <p className="text-sm whitespace-pre-wrap">{chatDetail.pesan.pesan}</p>
                                    <p className="text-xs text-gray-400 mt-1 text-right">
                                        {new Date(chatDetail.pesan.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {/* Balasan */}
                            {chatDetail.balasan.map((b) => {
                                const isMe = b.pengirim_id === chatDetail.pesan.penerima_id;
                                return (
                                    <div key={b.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow ${
                                            isMe
                                                ? 'bg-primary text-white rounded-tr-sm'
                                                : 'bg-white border border-gray-200 rounded-tl-sm'
                                        }`}>
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className={`text-xs font-bold ${isMe ? 'text-blue-100' : 'text-gray-600'}`}>
                                                    {b.pengirim_nama} ({b.pengirim_role})
                                                </p>
                                                {isMe && (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => {
                                                                const baru = prompt('Edit balasan:', b.isi);
                                                                if (baru && baru.trim()) handleEditBalasan(b.id, baru.trim());
                                                            }}
                                                            className="text-xs text-blue-100 hover:text-white"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button onClick={() => handleHapusBalasan(b.id)} className="text-xs text-blue-100 hover:text-white">
                                                            🗑️
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap">{b.isi}</p>
                                            <p className={`text-xs mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {new Date(b.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleKirimBalasan} className="border-t pt-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={balasanBaru}
                                    onChange={(e) => setBalasanBaru(e.target.value)}
                                    placeholder="Ketik balasan..."
                                    className="input-field flex-1"
                                    disabled={sendingBalasan}
                                />
                                <button
                                    type="submit"
                                    disabled={sendingBalasan || !balasanBaru.trim()}
                                    className="btn-primary disabled:opacity-50"
                                >
                                    {sendingBalasan ? '⏳' : '📤 Kirim'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // TAMPILAN DAFTAR PESAN
    // ============================================
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">💬 Pesan Bimbingan Konseling</h1>

                {statistik && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                        <div className="card text-center py-3"><p className="text-xs text-gray-500">Total</p><p className="text-2xl font-bold">{statistik.total || 0}</p></div>
                        <div className="card text-center py-3 bg-yellow-50"><p className="text-xs text-yellow-700">Menunggu</p><p className="text-2xl font-bold text-yellow-700">{statistik.menunggu || 0}</p></div>
                        <div className="card text-center py-3 bg-blue-50"><p className="text-xs text-blue-700">Dibaca</p><p className="text-2xl font-bold text-blue-700">{statistik.dibaca || 0}</p></div>
                        <div className="card text-center py-3 bg-green-50"><p className="text-xs text-green-700">Dibalas</p><p className="text-2xl font-bold text-green-700">{statistik.dibalas || 0}</p></div>
                        <div className="card text-center py-3 bg-gray-50"><p className="text-xs">Selesai</p><p className="text-2xl font-bold">{statistik.selesai || 0}</p></div>
                    </div>
                )}

                {message && (
                    <div className={`card mb-4 border-l-4 ${message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
                    </div>
                )}

                <div className="card mb-4">
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { v: '', l: 'Semua' },
                            { v: 'menunggu', l: 'Menunggu' },
                            { v: 'dibaca', l: 'Dibaca' },
                            { v: 'dibalas', l: 'Dibalas' },
                            { v: 'selesai', l: 'Selesai' }
                        ].map(({ v, l }) => (
                            <button key={v} onClick={() => setFilterStatus(v)} className={`px-4 py-2 rounded-lg text-sm font-medium ${filterStatus === v ? 'bg-primary text-white' : 'bg-gray-100'}`}>{l}</button>
                        ))}
                    </div>
                </div>

                <div className="card">
                    <h3 className="font-bold mb-4">Pesan Masuk ({pesanList.length})</h3>
                    {loading ? (
                        <div className="text-center py-12">⏳ Memuat...</div>
                    ) : pesanList.length === 0 ? (
                        <div className="text-center py-12"><div className="text-6xl mb-4">📭</div><p className="text-gray-600">Tidak ada pesan</p></div>
                    ) : (
                        <div className="space-y-3">
                            {pesanList.map((pesan) => (
                                <div key={pesan.id} className="border rounded-lg p-4 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                                        <div>
                                            <h4 className="font-bold">{pesan.judul}</h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Dari: <strong>{pesan.murid_nama}</strong> ({pesan.nama_kelas})
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                📅 {new Date(pesan.created_at).toLocaleDateString('id-ID')}
                                                {pesan.jumlah_balasan > 0 && ` • 💬 ${pesan.jumlah_balasan} balasan`}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-xs px-3 py-1 rounded-full ${getStatusBadge(pesan.status)}`}>
                                                {pesan.status.toUpperCase()}
                                            </span>
                                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                                {pesan.kategori}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-2">{pesan.pesan}</p>
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => openChat(pesan)} className="btn-primary text-sm">💬 Buka & Balas</button>
                                        <button
                                            onClick={() => handleHapusPesan(pesan.id)}
                                            className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm"
                                        >
                                            🗑️ Hapus
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}