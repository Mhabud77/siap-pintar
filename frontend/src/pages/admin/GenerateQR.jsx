import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const API_BASE = 'http://localhost:5000';

export default function GenerateQR() {
    const navigate = useNavigate();
    const [statistik, setStatistik] = useState(null);
    const [kelasList, setKelasList] = useState([]);
    const [selectedKelas, setSelectedKelas] = useState('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [message, setMessage] = useState(null);

    // Progress
    const [progress, setProgress] = useState({
        current: 0,
        total: 0,
        berhasil: 0,
        dilewati: 0,
        gagal: 0,
        percent: 0,
        nama: '',
        kelas: '',
        status: 'idle' // idle | running | done | error
    });

    const eventSourceRef = useRef(null);

    useEffect(() => { loadData(); }, []);

    // Cleanup saat unmount
    useEffect(() => {
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statRes, kelasRes] = await Promise.all([
                api.get('/qr-code/statistik'),
                api.get('/kelas')
            ]);
            setStatistik(statRes.data.data);
            setKelasList(kelasRes.data.data || []);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    // ============================================
    // START SSE UNTUK GENERATE
    // ============================================
    const startSSE = (url) => {
        // Tutup koneksi lama kalau ada
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setGenerating(true);
        setMessage(null);

        // Reset progress
        setProgress({
            current: 0,
            total: 0,
            berhasil: 0,
            dilewati: 0,
            gagal: 0,
            percent: 0,
            nama: '',
            kelas: '',
            status: 'running'
        });

        // Buat koneksi SSE
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'start') {
                    setProgress(prev => ({
                        ...prev,
                        total: data.total,
                        status: 'running'
                    }));
                } else if (data.type === 'progress') {
                    setProgress({
                        current: data.current,
                        total: data.total,
                        berhasil: data.berhasil,
                        dilewati: data.dilewati,
                        gagal: data.gagal,
                        percent: data.percent,
                        nama: data.nama || '',
                        kelas: data.kelas || '',
                        status: 'running'
                    });
                } else if (data.type === 'done') {
                    setProgress(prev => ({
                        ...prev,
                        percent: 100,
                        status: 'done'
                    }));

                    setMessage({
                        type: 'success',
                        text: `✅ ${data.message}`
                    });

                    setGenerating(false);
                    eventSource.close();
                    loadData();
                } else if (data.type === 'error') {
                    console.error('SSE error:', data.message);
                }
            } catch (err) {
                console.error('Parse error:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('EventSource error:', err);
            eventSource.close();
            setGenerating(false);
            setProgress(prev => ({ ...prev, status: 'error' }));
            setMessage({ type: 'error', text: '❌ Koneksi terputus. Coba lagi.' });
        };
    };

    // ============================================
    // HANDLE GENERATE ALL (SSE)
    // ============================================
    const handleGenerateAll = () => {
        if (!confirm(`Generate QR untuk SEMUA murid? Proses 1-2 menit.`)) return;

        const token = localStorage.getItem('token');
        const url = `${API_BASE}/api/qr-code/generate-all-stream?token=${token}`;
        startSSE(url);
    };

    // ============================================
    // HANDLE GENERATE PER KELAS (SSE)
    // ============================================
    const handleGenerateKelas = () => {
        if (!selectedKelas) {
            alert('Pilih kelas dulu!');
            return;
        }

        const token = localStorage.getItem('token');
        const url = `${API_BASE}/api/qr-code/generate-kelas-stream/${selectedKelas}?token=${token}`;
        startSSE(url);
    };

    // ============================================
    // CANCEL GENERATE
    // ============================================
    const handleCancel = () => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        setGenerating(false);
        setProgress(prev => ({ ...prev, status: 'idle' }));
        setMessage({ type: 'error', text: '⏹️ Generate dibatalkan' });
    };

    const handleHapusSemua = async () => {
        if (!confirm('Yakin hapus SEMUA file QR Code?')) return;
        try {
            const res = await api.delete('/qr-code/hapus-semua');
            setMessage({ type: 'success', text: `✅ ${res.data.message}` });
            loadData();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal hapus' });
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <button onClick={() => navigate('/admin')} className="text-primary hover:underline mb-2 text-sm">
                        ← Kembali ke Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">🔲 Generate QR Code Absensi</h1>
                    <p className="text-gray-600 mt-1">Generate QR Code dengan progress bar real-time</p>
                </div>

                {message && (
                    <div className={`card mb-4 border-l-4 ${
                        message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                    }`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
                    </div>
                )}

                {/* STATISTIK */}
                {statistik && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="card border-l-4 border-blue-500">
                            <p className="text-xs text-gray-500 font-semibold uppercase">Total Murid</p>
                            <p className="text-3xl font-bold text-blue-700">{statistik.total_murid}</p>
                        </div>
                        <div className="card border-l-4 border-green-500">
                            <p className="text-xs text-gray-500 font-semibold uppercase">QR Ter-generate</p>
                            <p className="text-3xl font-bold text-green-700">{statistik.file_qr_tergenerate}</p>
                        </div>
                        <div className="card border-l-4 border-purple-500">
                            <p className="text-xs text-gray-500 font-semibold uppercase">Punya Kode QR</p>
                            <p className="text-3xl font-bold text-purple-700">{statistik.murid_punya_qr_code}</p>
                        </div>
                        <div className="card border-l-4 border-red-500">
                            <p className="text-xs text-gray-500 font-semibold uppercase">Belum Generate</p>
                            <p className="text-3xl font-bold text-red-700">{statistik.belum_tergenerate}</p>
                        </div>
                    </div>
                )}

                {/* ============================================
                    PROGRESS BAR REAL-TIME
                ============================================ */}
                {progress.status !== 'idle' && (
                    <div className="card mb-6 border-2 border-blue-400 bg-gradient-to-br from-blue-50 to-purple-50">
                        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                            <h3 className="font-bold text-lg text-gray-800">
                                {progress.status === 'running' && '⏳ Sedang Generate...'}
                                {progress.status === 'done' && '✅ Selesai!'}
                                {progress.status === 'error' && '❌ Error'}
                            </h3>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-primary">
                                    {progress.percent}%
                                </p>
                                <p className="text-xs text-gray-500">
                                    {progress.current} / {progress.total}
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-300 rounded-full h-6 overflow-hidden shadow-inner mb-3">
                            <div
                                className={`h-6 rounded-full transition-all duration-300 flex items-center justify-end pr-2 ${
                                    progress.status === 'done'
                                        ? 'bg-gradient-to-r from-green-400 to-green-600'
                                        : 'bg-gradient-to-r from-blue-500 to-purple-600'
                                }`}
                                style={{ width: `${progress.percent}%`, minWidth: progress.percent > 0 ? '30px' : '0' }}
                            >
                                {progress.percent >= 10 && (
                                    <span className="text-white text-xs font-bold">
                                        {progress.percent}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Info Progress */}
                        {progress.status === 'running' && progress.nama && (
                            <div className="bg-white bg-opacity-60 rounded p-2 mb-3">
                                <p className="text-sm text-gray-700">
                                    🔄 Sedang proses: <strong>{progress.nama}</strong>
                                    {progress.kelas && ` (${progress.kelas})`}
                                </p>
                            </div>
                        )}

                        {/* Statistik Progress */}
                        <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="bg-green-100 rounded p-2 text-center">
                                <p className="text-xs text-green-700 font-semibold">Berhasil</p>
                                <p className="text-2xl font-bold text-green-700">{progress.berhasil}</p>
                            </div>
                            <div className="bg-yellow-100 rounded p-2 text-center">
                                <p className="text-xs text-yellow-700 font-semibold">Dilewati</p>
                                <p className="text-2xl font-bold text-yellow-700">{progress.dilewati}</p>
                            </div>
                            <div className="bg-red-100 rounded p-2 text-center">
                                <p className="text-xs text-red-700 font-semibold">Gagal</p>
                                <p className="text-2xl font-bold text-red-700">{progress.gagal}</p>
                            </div>
                        </div>

                        {/* Tombol Cancel */}
                        {progress.status === 'running' && (
                            <button
                                onClick={handleCancel}
                                className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium"
                            >
                                ⏹️ Batalkan
                            </button>
                        )}

                        {progress.status === 'done' && (
                            <button
                                onClick={() => setProgress(prev => ({ ...prev, status: 'idle' }))}
                                className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
                            >
                                ✕ Tutup
                            </button>
                        )}
                    </div>
                )}

                {/* AKSI */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="card border-2 border-blue-200">
                        <div className="text-4xl mb-3">🔲</div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Generate Semua Murid</h3>
                        <p className="text-sm text-gray-600 mb-4">Generate QR untuk 662 murid sekaligus.</p>
                        <button
                            onClick={handleGenerateAll}
                            disabled={generating}
                            className="btn-primary w-full disabled:opacity-50"
                        >
                            {generating ? '⏳ Memproses...' : '🔲 Generate Semua'}
                        </button>
                    </div>

                    <div className="card border-2 border-green-200">
                        <div className="text-4xl mb-3">🏫</div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Generate Per Kelas</h3>
                        <p className="text-sm text-gray-600 mb-4">Pilih kelas, generate QR untuk murid di kelas itu.</p>
                        <select
                            value={selectedKelas}
                            onChange={(e) => setSelectedKelas(e.target.value)}
                            className="input-field mb-3"
                            disabled={generating}
                        >
                            <option value="">-- Pilih Kelas --</option>
                            {kelasList.map(k => (<option key={k.id} value={k.id}>{k.nama_kelas}</option>))}
                        </select>
                        <button
                            onClick={handleGenerateKelas}
                            disabled={generating || !selectedKelas}
                            className="btn-success w-full disabled:opacity-50"
                        >
                            {generating ? '⏳ Memproses...' : '🏫 Generate Kelas'}
                        </button>
                    </div>
                </div>

                {/* LINK KARTU */}
                <div className="card bg-gradient-to-r from-purple-500 to-pink-500 text-white mb-6">
                    <div className="flex justify-between items-center flex-wrap gap-3">
                        <div>
                            <h3 className="text-xl font-bold mb-1">🎴 Lihat Kartu Siswa (B2)</h3>
                            <p className="text-purple-100 text-sm">Kartu besar dengan QR Code jelas</p>
                        </div>
                        <button
                            onClick={() => navigate('/admin/kartu-siswa')}
                            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-50 transition"
                        >
                            Lihat Kartu →
                        </button>
                    </div>
                </div>

                {/* ZONA BAHAYA */}
                <div className="card border-2 border-red-200 bg-red-50">
                    <h3 className="font-bold text-red-800 mb-2">⚠️ Zona Bahaya</h3>
                    <p className="text-sm text-red-700 mb-3">Hapus semua file QR Code.</p>
                    <button
                        onClick={handleHapusSemua}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                        🗑️ Hapus Semua QR Code
                    </button>
                </div>
            </div>
        </div>
    );
}