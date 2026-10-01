import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function BimbinganKonseling() {
    const navigate = useNavigate();
    const [pesanList, setPesanList] = useState([]);
    const [waliKelas, setWaliKelas] = useState(null);
    const [guruBKList, setGuruBKList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    // Modal kirim
    const [showModal, setShowModal] = useState(false);
    const [sending, setSending] = useState(false);
    const [editing, setEditing] = useState(null); // pesan yang sedang diedit

    // Chat thread
    const [activeChat, setActiveChat] = useState(null);
    const [chatDetail, setChatDetail] = useState(null);
    const [balasanBaru, setBalasanBaru] = useState('');
    const [sendingBalasan, setSendingBalasan] = useState(false);
    const chatEndRef = useRef(null);

    // Form pesan
    const [form, setForm] = useState({
        penerima_id: '', jenis_penerima: 'wali_kelas',
        kategori: 'lainnya', judul: '', pesan: ''
    });

    useEffect(() => { loadData(); }, []);

    // Scroll ke bawah saat chat diupdate
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatDetail]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pesanRes, kelasRes, bkRes] = await Promise.all([
                api.get('/bk/pesan-saya'),
                api.get('/murid-dashboard/kelas'),
                api.get('/murid-dashboard/guru-bk')
            ]);
            setPesanList(pesanRes.data.data || []);
            setWaliKelas(kelasRes.data.data.kelas || null);
            setGuruBKList(bkRes.data.data || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const openModal = () => {
        setEditing(null);
        setForm({
            penerima_id: waliKelas?.wali_kelas_id || '',
            jenis_penerima: 'wali_kelas',
            kategori: 'lainnya', judul: '', pesan: ''
        });
        setShowModal(true);
    };

    const openEdit = (pesan) => {
        setEditing(pesan);
        setForm({
            penerima_id: pesan.penerima_id,
            jenis_penerima: pesan.jenis_penerima,
            kategori: pesan.kategori,
            judul: pesan.judul,
            pesan: pesan.pesan
        });
        setShowModal(true);
    };

    const handlePenerimaChange = (value) => {
        const [jenis, id] = value.split('-');
        setForm({ ...form, penerima_id: parseInt(id), jenis_penerima: jenis });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        try {
            if (editing) {
                await api.put(`/bk/pesan/${editing.id}`, form);
                setMessage({ type: 'success', text: '✅ Pesan berhasil diedit!' });
            } else {
                await api.post('/bk/kirim', form);
                setMessage({ type: 'success', text: '✅ Pesan berhasil dikirim!' });
            }
            setShowModal(false);
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ ' + (err.response?.data?.message || 'Gagal') });
        }
        setSending(false);
    };

    const handleHapus = async (id) => {
        if (!confirm('Yakin hapus pesan ini? Pesan akan hilang dari daftar Anda.')) return;

        try {
            await api.delete(`/bk/pesan/${id}`);
            setMessage({ type: 'success', text: '✅ Pesan berhasil dihapus' });
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal hapus' });
        }
    };

    const openChat = async (pesan) => {
        try {
            const res = await api.get(`/bk/pesan/${pesan.id}`);
            setChatDetail(res.data.data);
            setActiveChat(pesan);
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal buka chat' });
        }
    };

    const handleKirimBalasan = async (e) => {
        e.preventDefault();
        if (!balasanBaru.trim()) return;

        setSendingBalasan(true);
        try {
            await api.post(`/bk/pesan/${activeChat.id}/balas`, { isi: balasanBaru });
            setBalasanBaru('');

            // Reload chat
            const res = await api.get(`/bk/pesan/${activeChat.id}`);
            setChatDetail(res.data.data);
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal kirim balasan' });
        }
        setSendingBalasan(false);
    };

    const handleHapusBalasan = async (balasan_id) => {
        if (!confirm('Hapus balasan ini?')) return;
        try {
            await api.delete(`/bk/balasan/${balasan_id}`);
            const res = await api.get(`/bk/pesan/${activeChat.id}`);
            setChatDetail(res.data.data);
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal hapus' });
        }
    };

    const handleEditBalasan = async (balasan_id, isiBaru) => {
        try {
            await api.put(`/bk/balasan/${balasan_id}`, { isi: isiBaru });
            const res = await api.get(`/bk/pesan/${activeChat.id}`);
            setChatDetail(res.data.data);
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal edit' });
        }
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

    if (loading) return <div className="min-h-screen bg-gray-100 p-6"><div className="max-w-4xl mx-auto"><div className="card text-center py-12">⏳ Memuat...</div></div></div>;

    // ============================================
    // TAMPILAN CHAT DETAIL
    // ============================================
    if (chatDetail) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-3xl mx-auto">
                    <button onClick={() => { setChatDetail(null); setActiveChat(null); }} className="text-primary hover:underline mb-4 text-sm">
                        ← Kembali ke Daftar Pesan
                    </button>

                    <div className="card">
                        {/* Header Topik */}
                        <div className="border-b pb-4 mb-4">
                            <div className="flex justify-between items-start flex-wrap gap-2">
                                <div>
                                    <h1 className="text-xl font-bold text-gray-800">
                                        {chatDetail.pesan.judul}
                                    </h1>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Kepada: <strong>{chatDetail.pesan.penerima_nama}</strong> • {chatDetail.pesan.kategori}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Dibuat: {new Date(chatDetail.pesan.created_at).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <span className={`text-xs px-3 py-1 rounded-full ${getStatusBadge(chatDetail.pesan.status)}`}>
                                    {chatDetail.pesan.status.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="space-y-3 max-h-96 overflow-y-auto mb-4 p-2">
                            {/* Pesan Awal (Murid) */}
                            <div className="flex justify-end">
                                <div className="max-w-[75%] bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-2 shadow">
                                    <p className="text-xs opacity-75 mb-1">Anda</p>
                                    <p className="text-sm whitespace-pre-wrap">{chatDetail.pesan.pesan}</p>
                                    <p className="text-xs opacity-75 mt-1 text-right">
                                        {new Date(chatDetail.pesan.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            {/* Balasan */}
                            {chatDetail.balasan.map((b) => {
                                const isMe = b.pengirim_role === 'murid';
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
                                                            title="Edit"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleHapusBalasan(b.id)}
                                                            className="text-xs text-blue-100 hover:text-white"
                                                            title="Hapus"
                                                        >
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

                        {/* Input Balasan */}
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
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/murid')} className="text-primary hover:underline mb-4 text-sm">← Kembali</button>

                <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">💬 Bimbingan Konseling</h1>
                        <p className="text-gray-600 mt-1">Konsultasi ke wali kelas atau guru BK</p>
                    </div>
                    <button onClick={openModal} className="btn-primary">✉️ Kirim Pesan Baru</button>
                </div>

                {message && (
                    <div className={`card mb-4 border-l-4 ${message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
                    </div>
                )}

                {/* KONTAK */}
                <div className="card mb-6">
                    <h3 className="font-bold text-gray-800 mb-3">📞 Kontak Tersedia</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {waliKelas?.wali_kelas_id && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <p className="text-xs text-blue-600 font-bold">WALI KELAS</p>
                                <p className="font-bold">{waliKelas.wali_kelas_nama}</p>
                            </div>
                        )}
                        {guruBKList.map((bk) => (
                            <div key={bk.id} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                                <p className="text-xs text-purple-600 font-bold">GURU BK</p>
                                <p className="font-bold">{bk.nama_lengkap}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* PESAN SAYA */}
                <div className="card">
                    <h3 className="font-bold mb-4">📩 Pesan Saya ({pesanList.length})</h3>
                    {pesanList.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-gray-600">Belum ada pesan</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {pesanList.map((pesan) => (
                                <div key={pesan.id} className="border rounded-lg p-4 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                                        <div className="flex-1">
                                            <h4 className="font-bold">{pesan.judul}</h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Kepada: <strong>{pesan.penerima_nama}</strong>
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
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => openChat(pesan)}
                                                    className="text-primary hover:bg-blue-50 px-2 py-1 rounded text-xs"
                                                    title="Buka Chat"
                                                >
                                                    💬 Buka
                                                </button>
                                                {pesan.jumlah_balasan === 0 && (
                                                    <>
                                                        <button
                                                            onClick={() => openEdit(pesan)}
                                                            className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs"
                                                            title="Edit"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            onClick={() => handleHapus(pesan.id)}
                                                            className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs"
                                                            title="Hapus"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 truncate mt-2">{pesan.pesan}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* MODAL */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                        <div className="bg-white rounded-lg p-6 w-full max-w-lg my-8">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">{editing ? '✏️ Edit Pesan' : '✉️ Kirim Pesan'}</h2>
                                <button onClick={() => setShowModal(false)} className="text-2xl text-gray-400">×</button>
                            </div>
                            <form onSubmit={handleSubmit}>
                                {!editing && (
                                    <div className="mb-3">
                                        <label className="block text-sm font-bold mb-1">Kepada *</label>
                                        <select
                                            value={form.penerima_id && form.jenis_penerima ? `${form.jenis_penerima}-${form.penerima_id}` : ''}
                                            onChange={(e) => handlePenerimaChange(e.target.value)}
                                            className="input-field" required
                                        >
                                            <option value="">-- Pilih Penerima --</option>
                                            {waliKelas?.wali_kelas_id && (
                                                <option value={`wali_kelas-${waliKelas.wali_kelas_id}`}>🏫 {waliKelas.wali_kelas_nama}</option>
                                            )}
                                            {guruBKList.map(bk => (
                                                <option key={bk.id} value={`guru_bk-${bk.id}`}>💼 {bk.nama_lengkap}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Kategori</label>
                                    <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="input-field">
                                        <option value="akademik">📚 Akademik</option>
                                        <option value="pribadi">💭 Pribadi</option>
                                        <option value="sosial">👥 Sosial</option>
                                        <option value="karir">🎯 Karir</option>
                                        <option value="lainnya">📝 Lainnya</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="block text-sm font-bold mb-1">Judul *</label>
                                    <input type="text" value={form.judul} onChange={(e) => setForm({ ...form, judul: e.target.value })} className="input-field" required />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-bold mb-1">Pesan *</label>
                                    <textarea value={form.pesan} onChange={(e) => setForm({ ...form, pesan: e.target.value })} className="input-field" rows="5" required />
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" disabled={sending} className="btn-primary flex-1 disabled:opacity-50">{sending ? '⏳...' : '📤 Kirim'}</button>
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