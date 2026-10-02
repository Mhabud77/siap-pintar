import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import QRScanner from '../components/QRScanner';

const BASE_URL = 'http://localhost:5000';

export default function Scanner() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('scan'); // scan | manual | massal
    const [mode, setMode] = useState('datang'); // datang | pulang
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState('');
    const [absensiHariIni, setAbsensiHariIni] = useState([]);
    const [statistik, setStatistik] = useState(null);
    const [statusJam, setStatusJam] = useState(null);
    const [waktu, setWaktu] = useState(new Date());
    const [processing, setProcessing] = useState(false);

    // Manual
    const [muridList, setMuridList] = useState([]);
    const [selectedMurid, setSelectedMurid] = useState(null);
    const [searchMurid, setSearchMurid] = useState('');
    const [filterKelas, setFilterKelas] = useState('');
    const [kelasList, setKelasList] = useState([]);
    const [manualStatus, setManualStatus] = useState('hadir');
    const [keterangan, setKeterangan] = useState('');
    const [manualMessage, setManualMessage] = useState(null);
    const [saving, setSaving] = useState(false);

    // Massal
    const [massalList, setMassalList] = useState([]);
    const [massalSelected, setMassalSelected] = useState([]); // array of murid_id
    const [massalStatus, setMassalStatus] = useState('hadir');
    const [massalKeterangan, setMassalKeterangan] = useState('');
    const [massalKelas, setMassalKelas] = useState('');
    const [massalSearch, setMassalSearch] = useState('');
    const [massalMessage, setMassalMessage] = useState(null);
    const [massalSaving, setMassalSaving] = useState(false);
    const [massalResult, setMassalResult] = useState(null);

    // Modal Detail Statistik
    const [showModal, setShowModal] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalData, setModalData] = useState([]);
    const [modalKategori, setModalKategori] = useState('');
    const [loadingModal, setLoadingModal] = useState(false);
    const [modalKelasFilter, setModalKelasFilter] = useState('');

    useEffect(() => {
        const timer = setInterval(() => setWaktu(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        loadStatistik();
        loadAbsensiHariIni();
        loadKelasList();
        loadStatusJam();
    }, []);

    // Auto-refresh status jam setiap menit
    useEffect(() => {
        const timer = setInterval(() => loadStatusJam(), 60000);
        return () => clearInterval(timer);
    }, []);

    // Re-fetch manual apabila tab, kelas, atau mod berubah
    useEffect(() => {
        if (activeTab === 'manual') {
            loadMuridBelumAbsen();
        }
    }, [activeTab, filterKelas, mode]);

    // Re-fetch massal apabila tab, kelas, atau mod berubah
    useEffect(() => {
        if (activeTab === 'massal') {
            loadMuridMassal();
        }
    }, [activeTab, massalKelas, mode]);

    // Debounce untuk Absensi Manual
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'manual') {
                loadMuridBelumAbsen();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchMurid]);

    // Debounce untuk Absensi Massal
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'massal') {
                loadMuridMassal();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [massalSearch]);

    const loadStatistik = async () => {
        try {
            const res = await api.get('/absensi/statistik-hari-ini');
            setStatistik(res.data.data);
        } catch (err) { console.error(err); }
    };

    const loadStatusJam = async () => {
        try {
            const res = await api.get('/absensi/status-jam');
            setStatusJam(res.data.data);
        } catch (err) { console.error(err); }
    };

    const loadAbsensiHariIni = async () => {
        try {
            const res = await api.get('/absensi/hari-ini');
            setAbsensiHariIni(res.data.data || []);
        } catch (err) { console.error(err); }
    };

    const loadKelasList = async () => {
        try {
            const res = await api.get('/kelas');
            setKelasList(res.data.data || []);
        } catch (err) { console.error(err); }
    };

    // ============================================
    // MANUAL — Load murid berdasarkan tipe (datang / pulang)
    // ============================================
    const loadMuridBelumAbsen = async () => {
        try {
            let url = '/absensi/belum-absen';
            const params = [`tipe=${mode}`]; // Hantar parameter tipe
            if (filterKelas) params.push(`kelas_id=${filterKelas}`);
            if (searchMurid && searchMurid.length >= 2) {
                params.push(`search=${encodeURIComponent(searchMurid)}`);
            }
            if (params.length > 0) url += '?' + params.join('&');

            const res = await api.get(url);
            setMuridList(res.data.data || []);
            setSelectedMurid(null);
        } catch (err) { console.error(err); }
    };

    // ============================================
    // MASSAL — Load murid berdasarkan tipe (datang / pulang)
    // ============================================
    const loadMuridMassal = async () => {
        try {
            let url = '/absensi/belum-absen';
            const params = [`tipe=${mode}`]; // Hantar parameter tipe
            if (massalKelas) params.push(`kelas_id=${massalKelas}`);
            if (massalSearch && massalSearch.length >= 2) {
                params.push(`search=${encodeURIComponent(massalSearch)}`);
            }
            if (params.length > 0) url += '?' + params.join('&');

            const res = await api.get(url);
            setMassalList(res.data.data || []);
            setMassalSelected([]);
        } catch (err) { console.error(err); }
    };

    const handleCardClick = async (kategori, title) => {
        setShowModal(true);
        setModalTitle(title);
        setModalKategori(kategori);
        setModalData([]);
        setModalKelasFilter('');
        setLoadingModal(true);

        try {
            const res = await api.get(`/absensi/statistik-detail/${kategori}`);
            setModalData(res.data.data || []);
        } catch (err) {
            console.error('Error load detail:', err);
            setModalData([]);
        }
        setLoadingModal(false);
    };

    const loadModalWithKelas = async (kategori, kelas_id) => {
        setLoadingModal(true);
        setModalKelasFilter(kelas_id);
        try {
            let url = `/absensi/statistik-detail/${kategori}`;
            if (kelas_id) url += `?kelas_id=${kelas_id}`;
            const res = await api.get(url);
            setModalData(res.data.data || []);
        } catch (err) {
            console.error(err);
        }
        setLoadingModal(false);
    };

    const toggleMassalSelect = (murid_id) => {
        setMassalSelected(prev => 
            prev.includes(murid_id) 
                ? prev.filter(id => id !== murid_id)
                : [...prev, murid_id]
        );
    };

    const selectAllMassal = () => {
        if (massalSelected.length === massalList.length) {
            setMassalSelected([]);
        } else {
            setMassalSelected(massalList.map(m => m.id));
        }
    };

    const handleMassal = async () => {
        if (massalSelected.length === 0) {
            setMassalMessage({ type: 'error', text: 'Pilih minimal 1 murid!' });
            return;
        }

        if (!confirm(`Yakin absen (${mode}) ${massalSelected.length} murid sekaligus?`)) {
            return;
        }

        setMassalSaving(true);
        setMassalMessage(null);
        setMassalResult(null);

        try {
            const res = await api.post('/absensi/massal', {
                murid_ids: massalSelected,
                status: massalStatus,
                keterangan: massalKeterangan || `Absensi massal ${mode} (${massalStatus})`,
                tipe: mode  // 'datang' atau 'pulang'
            });

            setMassalResult(res.data.data);
            setMassalMessage({
                type: 'success',
                text: `✅ ${res.data.message}`
            });

            // Reset
            setMassalSelected([]);
            setMassalKeterangan('');
            setMassalStatus('hadir');

            // Reload
            loadMuridMassal();
            loadAbsensiHariIni();
            loadStatistik();

        } catch (err) {
            setMassalMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal')
            });
        }
        setMassalSaving(false);
    };

    const handleScanSuccess = async (decodedText) => {
        if (processing) return;
        setProcessing(true);

        let endpoint = '/absensi/scan';
        if (mode === 'pulang') {
            endpoint = '/absensi/scan-pulang';
        }

        try {
            const response = await api.post(endpoint, { qr_code: decodedText });
            if (response.data.success) {
                setScanResult({ ...response.data.data, mode });
                setError('');
                loadAbsensiHariIni();
                loadStatistik();
                setTimeout(() => setScanResult(null), 3000);
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Gagal memproses absensi');
            setScanResult(null);
        }
        setProcessing(false);
    };

    const handlePilihMurid = (murid) => {
        setSelectedMurid(murid);
        setManualMessage(null);
    };

    const handleAbsensiManual = async () => {
        if (!selectedMurid) {
            setManualMessage({ type: 'error', text: 'Pilih murid dulu!' });
            return;
        }
        setSaving(true);
        setManualMessage(null);
        try {
            const res = await api.post('/absensi/manual', {
                murid_id: selectedMurid.id,
                status: manualStatus,
                keterangan: keterangan || `Absensi manual ${mode} (${manualStatus})`,
                tipe: mode // Send 'datang' or 'pulang'
            });
            setManualMessage({ type: 'success', text: `✅ ${res.data.message}` });
            setSelectedMurid(null);
            setKeterangan('');
            setManualStatus('hadir');
            loadMuridBelumAbsen();
            loadAbsensiHariIni();
            loadStatistik();
        } catch (err) {
            setManualMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal')
            });
        }
        setSaving(false);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'hadir': return 'text-green-600 bg-green-50';
            case 'terlambat': return 'text-red-600 bg-red-50';
            case 'izin': return 'text-yellow-600 bg-yellow-50';
            case 'sakit': return 'text-blue-600 bg-blue-50';
            case 'alpa': return 'text-gray-600 bg-gray-100';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getStatusEmoji = (status) => {
        switch (status) {
            case 'hadir': return '✅';
            case 'terlambat': return '⏰';
            case 'izin': return '📝';
            case 'sakit': return '🤒';
            case 'alpa': return '❌';
            default: return '❓';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <button onClick={() => navigate(-1)} className="text-primary hover:underline mb-2 text-sm">
                        ← Kembali
                    </button>
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                📷 Scanner Absensi
                            </h1>
                            <p className="text-gray-600 mt-1">Scan QR Code, manual, atau massal</p>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg px-6 py-3 border-l-4 border-primary">
                            <p className="text-xs text-gray-500 font-semibold uppercase">Waktu Sekarang</p>
                            <p className="text-3xl font-bold text-primary">
                                {waktu.toLocaleTimeString('id-ID')}
                            </p>
                            <p className="text-xs text-gray-500">
                                {waktu.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* INFO JAM BUKA/TUTUP ABSENSI */}
                {statusJam && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className={`rounded-2xl shadow-lg p-5 border-l-4 ${
                            statusJam.datang.aktif 
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500' 
                                : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-400'
                        }`}>
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
                                        statusJam.datang.aktif ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-300 text-gray-600'
                                    }`}>
                                        📥
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-lg">Absensi Datang</p>
                                        <p className="text-sm text-gray-600">
                                            Jam Buka: <strong>{statusJam.datang.buka}</strong> • 
                                            Jam Tutup: <strong>{statusJam.datang.tutup}</strong>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                                        statusJam.datang.aktif 
                                            ? 'bg-green-500 text-white' 
                                            : 'bg-gray-400 text-white'
                                    }`}>
                                        {statusJam.datang.aktif ? '● DIBUKA' : '● DITUTUP'}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">{statusJam.datang.keterangan}</p>
                                </div>
                            </div>
                        </div>

                        <div className={`rounded-2xl shadow-lg p-5 border-l-4 ${
                            statusJam.pulang.aktif 
                                ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-500' 
                                : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-400'
                        }`}>
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${
                                        statusJam.pulang.aktif ? 'bg-orange-500 text-white animate-pulse' : 'bg-gray-300 text-gray-600'
                                    }`}>
                                        📤
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-lg">Absensi Pulang</p>
                                        <p className="text-sm text-gray-600">
                                            Jam Buka: <strong>{statusJam.pulang.buka}</strong> • 
                                            Jam Tutup: <strong>{statusJam.pulang.tutup}</strong>
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                                        statusJam.pulang.aktif 
                                            ? 'bg-orange-500 text-white' 
                                            : 'bg-gray-400 text-white'
                                    }`}>
                                        {statusJam.pulang.aktif ? '● DIBUKA' : '● DITUTUP'}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1">{statusJam.pulang.keterangan}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* STATISTIK */}
                {statistik && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                        <button onClick={() => handleCardClick('total', 'Total Murid')} className="bg-white rounded-xl shadow-md p-3 border-l-4 border-gray-500 text-left hover:shadow-lg hover:scale-105 transition">
                            <p className="text-[10px] text-gray-500 font-bold uppercase">Total Murid</p>
                            <p className="text-2xl font-bold text-gray-700">{statistik.total_murid}</p>
                            <p className="text-[9px] text-gray-400 mt-1">Klik detail →</p>
                        </button>

                        <button onClick={() => handleCardClick('sudah_absen', 'Sudah Absen')} className="bg-white rounded-xl shadow-md p-3 border-l-4 border-blue-500 text-left hover:shadow-lg hover:scale-105 transition">
                            <p className="text-[10px] text-blue-500 font-bold uppercase">Sudah Absen</p>
                            <p className="text-2xl font-bold text-blue-700">{statistik.total_absen}</p>
                            <p className="text-[9px] text-gray-400 mt-1">Klik detail →</p>
                        </button>

                        <button onClick={() => handleCardClick('belum_absen', 'Belum Absen')} className="bg-white rounded-xl shadow-md p-3 border-l-4 border-orange-500 text-left hover:shadow-lg hover:scale-105 transition">
                            <p className="text-[10px] text-orange-500 font-bold uppercase">Belum Absen</p>
                            <p className="text-2xl font-bold text-orange-700">{statistik.belum_absen}</p>
                            <p className="text-[9px] text-gray-400 mt-1">Klik detail →</p>
                        </button>

                        <button onClick={() => handleCardClick('hadir', 'Hadir')} className="bg-white rounded-xl shadow-md p-3 border-l-4 border-green-500 text-left hover:shadow-lg hover:scale-105 transition">
                            <p className="text-[10px] text-green-500 font-bold uppercase">✅ Hadir</p>
                            <p className="text-2xl font-bold text-green-700">{statistik.hadir}</p>
                            <p className="text-[9px] text-gray-400 mt-1">Klik detail →</p>
                        </button>

                        <button onClick={() => handleCardClick('terlambat', 'Terlambat')} className="bg-white rounded-xl shadow-md p-3 border-l-4 border-red-500 text-left hover:shadow-lg hover:scale-105 transition">
                            <p className="text-[10px] text-red-500 font-bold uppercase">⏰ Terlambat</p>
                            <p className="text-2xl font-bold text-red-700">{statistik.terlambat}</p>
                            <p className="text-[9px] text-gray-400 mt-1">Klik detail →</p>
                        </button>

                        <button onClick={() => handleCardClick('izin_sakit', 'Izin / Sakit')} className="bg-white rounded-xl shadow-md p-3 border-l-4 border-yellow-500 text-left hover:shadow-lg hover:scale-105 transition">
                            <p className="text-[10px] text-yellow-600 font-bold uppercase">📝 Izin/Sakit</p>
                            <p className="text-2xl font-bold text-yellow-700">{(statistik.izin || 0) + (statistik.sakit || 0)}</p>
                            <p className="text-[9px] text-gray-400 mt-1">Klik detail →</p>
                        </button>

                        <button onClick={() => handleCardClick('persen_hadir', 'Persentase Kehadiran per Kelas')} className="bg-white rounded-xl shadow-md p-3 border-l-4 border-purple-500 text-left hover:shadow-lg hover:scale-105 transition">
                            <p className="text-[10px] text-purple-500 font-bold uppercase">% Hadir</p>
                            <p className="text-2xl font-bold text-purple-700">{statistik.persen_hadir || 0}%</p>
                            <p className="text-[9px] text-gray-400 mt-1">Klik detail →</p>
                        </button>
                    </div>
                )}

                {/* TAB SWITCH */}
                <div className="bg-white rounded-2xl shadow-lg p-2 mb-6 inline-flex gap-2 flex-wrap">
                    <button
                        onClick={() => setActiveTab('scan')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition ${
                            activeTab === 'scan' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        📷 Scan QR Code
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition ${
                            activeTab === 'manual' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        ✍️ Absensi Manual
                    </button>
                    <button
                        onClick={() => setActiveTab('massal')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition ${
                            activeTab === 'massal' ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                    >
                        📋 Absensi Massal
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        {/* ============================================ */}
                        {/* TAB SCAN */}
                        {/* ============================================ */}
                        {activeTab === 'scan' && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className={`px-6 py-4 transition ${
                                    mode === 'datang'
                                        ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                                        : 'bg-gradient-to-r from-orange-500 to-red-600'
                                }`}>
                                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                                        <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                                        {mode === 'datang' ? '📥 Absensi Datang' : '📤 Absensi Pulang'}
                                    </h2>

                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => setMode('datang')}
                                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${
                                                mode === 'datang' ? 'bg-white text-blue-600 shadow-lg' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                            }`}
                                        >
                                            📥 Datang
                                        </button>
                                        <button
                                            onClick={() => setMode('pulang')}
                                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${
                                                mode === 'pulang' ? 'bg-white text-red-600 shadow-lg' : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                                            }`}
                                        >
                                            📤 Pulang
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    {statusJam && (
                                        <div className={`mb-4 p-3 rounded-lg text-sm ${
                                            (mode === 'datang' && statusJam.datang.aktif) || (mode === 'pulang' && statusJam.pulang.aktif)
                                                ? mode === 'datang' ? 'bg-blue-50 border-l-4 border-blue-500 text-blue-700' : 'bg-orange-50 border-l-4 border-orange-500 text-orange-700'
                                                : 'bg-red-50 border-l-4 border-red-500 text-red-700'
                                        }`}>
                                            {mode === 'datang' ? (
                                                statusJam.datang.aktif ? `📥 Absensi Datang DIBUKA (${statusJam.datang.buka} - ${statusJam.datang.tutup})` : `⚠️ Absensi Datang DITUTUP (${statusJam.datang.buka} - ${statusJam.datang.tutup})`
                                            ) : (
                                                statusJam.pulang.aktif ? `📤 Absensi Pulang DIBUKA (${statusJam.pulang.buka} - ${statusJam.pulang.tutup})` : `⚠️ Absensi Pulang DITUTUP (${statusJam.pulang.buka} - ${statusJam.pulang.tutup})`
                                            )}
                                        </div>
                                    )}

                                    <QRScanner onScanSuccess={handleScanSuccess} />

                                    {scanResult && (
                                        <div className={`mt-6 border-2 rounded-2xl p-5 ${
                                            scanResult.mode === 'pulang' ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-500' : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-500'
                                        }`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl ${
                                                    scanResult.mode === 'pulang' ? 'bg-orange-500' : 'bg-green-500'
                                                }`}>
                                                    {scanResult.mode === 'pulang' ? '📤' : '✅'}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-lg font-bold ${scanResult.mode === 'pulang' ? 'text-orange-800' : 'text-green-800'}`}>
                                                        {scanResult.mode === 'pulang' ? 'ABSENSI PULANG BERHASIL' : 'ABSENSI DATANG BERHASIL'}
                                                    </p>
                                                    <p className="text-2xl font-bold text-gray-800">{scanResult.nama}</p>
                                                    <p className="text-sm text-gray-600">{scanResult.kelas} • {scanResult.waktu}</p>
                                                </div>
                                                {scanResult.mode !== 'pulang' && scanResult.poin !== undefined && (
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500">Poin</p>
                                                        <p className={`text-4xl font-bold ${scanResult.poin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {scanResult.poin > 0 ? '+' : ''}{scanResult.poin}
                                                        </p>
                                                    </div>
                                                )}
                                                {scanResult.mode === 'pulang' && (
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500">Status</p>
                                                        <p className="text-lg font-bold text-orange-600">
                                                            {scanResult.status === 'tepat_waktu' ? '✅ Tepat Waktu' : '⏰ Terlambat'}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="mt-6 bg-red-50 border-2 border-red-500 rounded-2xl p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white text-2xl">❌</div>
                                                <p className="text-red-700 font-bold">{error}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ============================================ */}
                        {/* TAB MANUAL */}
                        {/* ============================================ */}
                        {activeTab === 'manual' && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                                    <h2 className="text-white font-bold text-lg">✍️️ Absensi Manual</h2>
                                    <p className="text-green-100 text-sm">Input satu murid</p>
                                </div>
                                <div className="p-6">
                                    {manualMessage && (
                                        <div className={`mb-4 p-4 rounded-xl border-l-4 ${
                                            manualMessage.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                                        }`}>
                                            <p className={manualMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                                                {manualMessage.text}
                                            </p>
                                        </div>
                                    )}

                                    {/* MODE SWITCHER DATANG/PULANG (DITAMBAHKAN) */}
                                    <div className="mb-4 flex gap-2">
                                        <button
                                            onClick={() => setMode('datang')}
                                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${
                                                mode === 'datang' ? 'bg-green-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            📥 Absen Datang
                                        </button>
                                        <button
                                            onClick={() => setMode('pulang')}
                                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${
                                                mode === 'pulang' ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            📤 Absen Pulang
                                        </button>
                                    </div>

                                    <div className="mb-4">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">1️⃣ Cari Murid</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <input
                                                type="text"
                                                placeholder="🔍 Ketik nama atau NIS..."
                                                value={searchMurid}
                                                onChange={(e) => setSearchMurid(e.target.value)}
                                                className="input-field md:col-span-2"
                                            />
                                            <select
                                                value={filterKelas}
                                                onChange={(e) => setFilterKelas(e.target.value)}
                                                className="input-field"
                                            >
                                                <option value="">Semua Kelas</option>
                                                {kelasList.map(k => (
                                                    <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 mb-2">
                                            {muridList.length} murid {mode === 'pulang' ? 'siap absen pulang' : 'belum absen datang'}
                                        </p>
                                        <div className="border rounded-xl max-h-60 overflow-y-auto bg-gray-50">
                                            {muridList.length === 0 ? (
                                                <p className="text-center py-8 text-gray-500 text-sm">
                                                    {searchMurid ? 'Tidak ada yang cocok' : mode === 'pulang' ? 'Tidak ada murid yang siap absen pulang 🎉' : 'Semua murid sudah absen datang! 🎉'}
                                                </p>
                                            ) : (
                                                muridList.map(m => (
                                                    <button
                                                        key={m.id}
                                                        onClick={() => handlePilihMurid(m)}
                                                        className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition border-b last:border-b-0 flex items-center gap-3 ${
                                                            selectedMurid?.id === m.id ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                                                        }`}
                                                    >
                                                        {m.foto_profil ? (
                                                            <img src={`${BASE_URL}${m.foto_profil}`} alt={m.nama_lengkap} className="w-8 h-8 rounded-full object-cover" />
                                                        ) : (
                                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                                {m.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="font-medium text-sm">{m.nama_lengkap}</p>
                                                            <p className="text-xs text-gray-500">{m.nama_kelas} • NIS: {m.nis}</p>
                                                        </div>
                                                        {selectedMurid?.id === m.id && <span className="text-blue-500 text-xl">✓</span>}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {selectedMurid && (
                                        <>
                                            <div className="mb-4 p-4 bg-blue-50 rounded-xl border-l-4 border-blue-500">
                                                <p className="text-xs text-blue-600 font-bold">MURID TERPILIH</p>
                                                <p className="text-lg font-bold text-blue-800">{selectedMurid.nama_lengkap}</p>
                                                <p className="text-sm text-blue-600">{selectedMurid.nama_kelas} • NIS: {selectedMurid.nis}</p>
                                            </div>

                                            {mode === 'datang' && (
                                                <div className="mb-4">
                                                    <label className="block text-sm font-bold text-gray-700 mb-2">2️⃣ Status Kehadiran</label>
                                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                                        {[
                                                            { value: 'hadir', label: '✅ Hadir' },
                                                            { value: 'terlambat', label: '⏰ Terlambat' },
                                                            { value: 'izin', label: '📝 Izin' },
                                                            { value: 'sakit', label: '🤒 Sakit' },
                                                            { value: 'alpa', label: '❌ Alpa' }
                                                        ].map(s => (
                                                            <button
                                                                key={s.value}
                                                                type="button"
                                                                onClick={() => setManualStatus(s.value)}
                                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition border-2 ${
                                                                    manualStatus === s.value ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                {s.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mb-4">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                                    {mode === 'datang' ? '3️⃣ Keterangan (opsional)' : '2️⃣ Keterangan Pulang (opsional)'}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={keterangan}
                                                    onChange={(e) => setKeterangan(e.target.value)}
                                                    placeholder="Contoh: Pulang awal / ekstra..."
                                                    className="input-field"
                                                />
                                            </div>

                                            <button
                                                onClick={handleAbsensiManual}
                                                disabled={saving}
                                                className={`w-full text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition disabled:opacity-50 ${
                                                    mode === 'pulang' ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'
                                                }`}
                                            >
                                                {saving ? '⏳ Menyimpan...' : mode === 'pulang' ? '💾 Simpan Absen Pulang' : '💾 Simpan Absensi Datang'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ============================================ */}
                        {/* TAB MASSAL */}
                        {/* ============================================ */}
                        {activeTab === 'massal' && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                                    <h2 className="text-white font-bold text-lg">📋 Absensi Massal</h2>
                                    <p className="text-purple-100 text-sm">Pilih banyak murid sekaligus, input status yang sama</p>
                                </div>
                                <div className="p-6">
                                    {massalMessage && (
                                        <div className={`mb-4 p-4 rounded-xl border-l-4 ${
                                            massalMessage.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
                                        }`}>
                                            <p className={massalMessage.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                                                {massalMessage.text}
                                            </p>
                                        </div>
                                    )}

                                    {massalResult && (
                                        <div className="mb-4 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-xl">
                                            <p className="font-bold text-blue-800 mb-2">Hasil Absensi Massal:</p>
                                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                                <div className="bg-green-100 rounded p-2">
                                                    <p className="text-green-700 font-bold">{massalResult.berhasil}</p>
                                                    <p className="text-xs text-green-600">Berhasil</p>
                                                </div>
                                                <div className="bg-yellow-100 rounded p-2">
                                                    <p className="text-yellow-700 font-bold">{massalResult.dilewati}</p>
                                                    <p className="text-xs text-yellow-600">Dilewati</p>
                                                </div>
                                                <div className="bg-red-100 rounded p-2">
                                                    <p className="text-red-700 font-bold">{massalResult.gagal}</p>
                                                    <p className="text-xs text-red-600">Gagal</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* MODE SWITCH DATANG/PULANG */}
                                    <div className="mb-4 flex gap-2">
                                        <button
                                            onClick={() => setMode('datang')}
                                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${
                                                mode === 'datang' ? 'bg-blue-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            📥 Absen Datang
                                        </button>
                                        <button
                                            onClick={() => setMode('pulang')}
                                            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition ${
                                                mode === 'pulang' ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            📤 Absen Pulang
                                        </button>
                                    </div>

                                    {/* FILTER */}
                                    <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <input
                                            type="text"
                                            placeholder="🔍 Cari nama atau NIS..."
                                            value={massalSearch}
                                            onChange={(e) => setMassalSearch(e.target.value)}
                                            className="input-field md:col-span-2"
                                        />
                                        <select
                                            value={massalKelas}
                                            onChange={(e) => setMassalKelas(e.target.value)}
                                            className="input-field"
                                        >
                                            <option value="">Semua Kelas</option>
                                            {kelasList.map(k => (
                                                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* SELECT ALL */}
                                    <div className="mb-3 flex justify-between items-center flex-wrap gap-2">
                                        <p className="text-sm text-gray-600">
                                            <strong>{massalSelected.length}</strong> dari <strong>{massalList.length}</strong> murid dipilih
                                        </p>
                                        <button onClick={selectAllMassal} className="text-sm text-primary hover:underline font-medium">
                                            {massalSelected.length === massalList.length && massalList.length > 0 ? '☐ Batalkan Semua' : '☑️ Pilih Semua'}
                                        </button>
                                    </div>

                                    {/* DAFTAR MURID */}
                                    <div className="mb-4 border rounded-xl max-h-80 overflow-y-auto bg-gray-50">
                                        {massalList.length === 0 ? (
                                            <p className="text-center py-8 text-gray-500 text-sm">
                                                {massalSearch ? 'Tidak ada yang cocok' : mode === 'pulang' ? 'Tidak ada murid yang siap absen pulang 🎉' : 'Semua murid sudah absen datang! 🎉'}
                                            </p>
                                        ) : (
                                            massalList.map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => toggleMassalSelect(m.id)}
                                                    className={`w-full text-left px-4 py-2 hover:bg-purple-50 transition border-b last:border-b-0 flex items-center gap-3 ${
                                                        massalSelected.includes(m.id) ? 'bg-purple-100 border-l-4 border-purple-500' : ''
                                                    }`}
                                                >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                        massalSelected.includes(m.id) ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-400'
                                                    }`}>
                                                        {massalSelected.includes(m.id) && '✓'}
                                                    </div>
                                                    {m.foto_profil ? (
                                                        <img src={`${BASE_URL}${m.foto_profil}`} alt={m.nama_lengkap} className="w-8 h-8 rounded-full object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                            {m.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="flex-1">
                                                        <p className="font-medium text-sm">{m.nama_lengkap}</p>
                                                        <p className="text-xs text-gray-500">{m.nama_kelas} • NIS: {m.nis}</p>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>

                                    {/* STATUS (Hanya muncul jika mode === 'datang') */}
                                    {mode === 'datang' && (
                                        <div className="mb-4">
                                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                                1️⃣ Status untuk Semua Murid Terpilih
                                            </label>
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                                {[
                                                    { value: 'hadir', label: '✅ Hadir' },
                                                    { value: 'terlambat', label: '⏰ Terlambat' },
                                                    { value: 'izin', label: '📝 Izin' },
                                                    { value: 'sakit', label: '🤒 Sakit' },
                                                    { value: 'alpa', label: '❌ Alpa' }
                                                ].map(s => (
                                                    <button
                                                        key={s.value}
                                                        type="button"
                                                        onClick={() => setMassalStatus(s.value)}
                                                        className={`px-3 py-2 rounded-lg text-sm font-medium transition border-2 ${
                                                            massalStatus === s.value ? 'bg-purple-500 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-4">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">
                                            {mode === 'datang' ? '2️⃣ Keterangan (opsional)' : '1️⃣ Keterangan Pulang (opsional)'}
                                        </label>
                                        <input
                                            type="text"
                                            value={massalKeterangan}
                                            onChange={(e) => setMassalKeterangan(e.target.value)}
                                            placeholder="Contoh: Semua hadir, kegiatan ekstrakurikuler"
                                            className="input-field"
                                        />
                                    </div>

                                    <button
                                        onClick={handleMassal}
                                        disabled={massalSaving || massalSelected.length === 0}
                                        className={`w-full text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition disabled:opacity-50 ${
                                            mode === 'pulang' ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-purple-500 to-pink-600'
                                        }`}
                                    >
                                        {massalSaving ? '⏳ Menyimpan...' : `💾 Simpan Absen ${mode === 'pulang' ? 'Pulang' : 'Datang'} (${massalSelected.length} murid)`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* KOLOM KANAN: ABSENSI HARI INI */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden sticky top-6">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3">
                                <h3 className="text-white font-bold">📋 Absensi Hari Ini</h3>
                                <p className="text-indigo-100 text-xs">{absensiHariIni.length} murid sudah absen</p>
                            </div>
                            <div className="p-4 max-h-[600px] overflow-y-auto">
                                {absensiHariIni.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-5xl mb-2">📭</div>
                                        <p className="text-gray-500 text-sm">Belum ada absensi</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {absensiHariIni.map((a) => (
                                            <div key={a.id} className={`p-3 rounded-lg border-l-4 ${getStatusColor(a.status)}`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm truncate">{a.nama}</p>
                                                        <p className="text-xs opacity-75">
                                                            {a.kelas} • 📥 {a.jam_datang?.slice(0, 5)}
                                                            {a.jam_pulang && ` • 📤 ${a.jam_pulang.slice(0, 5)}`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right ml-2">
                                                        <span className="text-2xl">{getStatusEmoji(a.status)}</span>
                                                        <p className={`text-xs font-bold ${a.poin_didapat > 0 ? 'text-green-600' : a.poin_didapat < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                                            {a.poin_didapat > 0 ? '+' : ''}{a.poin_didapat}
                                                        </p>
                                                    </div>
                                                </div>
                                                {a.jam_pulang && (
                                                    <div className={`mt-1 text-xs font-bold ${
                                                        a.status_pulang === 'tepat_waktu' ? 'text-green-600' : 'text-orange-600'
                                                    }`}>
                                                        {a.status_pulang === 'tepat_waktu' ? '✅ Pulang Tepat Waktu' : '⏰ Pulang Terlambat'}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL DETAIL STATISTIK */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold">📋 {modalTitle}</h3>
                                <p className="text-blue-100 text-xs">{modalData.length} data ditemukan</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full w-8 h-8 flex items-center justify-center text-2xl">
                                ×
                            </button>
                        </div>

                        {modalKategori !== 'persen_hadir' && (
                            <div className="px-6 py-3 border-b bg-gray-50 flex gap-2 flex-wrap items-center">
                                <label className="text-xs font-bold text-gray-600">Filter Kelas:</label>
                                <button
                                    onClick={() => loadModalWithKelas(modalKategori, '')}
                                    className={`px-3 py-1 rounded text-xs font-medium ${modalKelasFilter === '' ? 'bg-primary text-white' : 'bg-white border'}`}
                                >
                                    Semua
                                </button>
                                {kelasList.map(k => (
                                    <button
                                        key={k.id}
                                        onClick={() => loadModalWithKelas(modalKategori, k.id)}
                                        className={`px-3 py-1 rounded text-xs font-medium ${modalKelasFilter === k.id ? 'bg-primary text-white' : 'bg-white border'}`}
                                    >
                                        {k.nama_kelas}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="p-4 overflow-y-auto flex-1">
                            {loadingModal ? (
                                <div className="text-center py-12">
                                    <div className="text-3xl">⏳</div>
                                    <p className="text-gray-600 mt-2">Memuat data...</p>
                                </div>
                            ) : modalData.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="text-6xl mb-4">📭</div>
                                    <p className="text-gray-600">Tidak ada data</p>
                                </div>
                            ) : modalKategori === 'persen_hadir' ? (
                                <div className="space-y-3">
                                    {modalData.map((k, index) => (
                                        <div key={k.kelas_id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border-l-4 border-purple-500">
                                            <span className="text-2xl font-bold text-gray-500 w-10 text-center">
                                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                            </span>
                                            <div className="flex-1">
                                                <p className="font-bold text-lg">{k.nama_kelas}</p>
                                                <p className="text-xs text-gray-500">{k.total_hadir} dari {k.total_murid} murid hadir</p>
                                                <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
                                                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full" style={{ width: `${k.persen_hadir}%` }} />
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-3xl font-bold text-purple-700">{k.persen_hadir}%</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {modalData.map((m, index) => (
                                        <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                                            <span className="font-bold text-gray-500 w-8 text-center">{index + 1}</span>
                                            {m.foto_profil ? (
                                                <img src={`${BASE_URL}${m.foto_profil}`} alt={m.nama_lengkap} className="w-10 h-10 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                    {m.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{m.nama_lengkap}</p>
                                                <p className="text-xs text-gray-500">{m.nama_kelas} • NIS: {m.nis}</p>
                                            </div>
                                            {m.status && (
                                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                                                    m.status === 'hadir' ? 'bg-green-100 text-green-700' :
                                                    m.status === 'terlambat' ? 'bg-red-100 text-red-700' :
                                                    m.status === 'izin' ? 'bg-yellow-100 text-yellow-700' :
                                                    m.status === 'sakit' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {m.status.toUpperCase()}
                                                </span>
                                            )}
                                            {m.jam_datang && (
                                                <span className="text-xs text-gray-500 font-mono">
                                                    📥 {m.jam_datang.slice(0, 5)}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3 border-t flex justify-end">
                            <button onClick={() => setShowModal(false)} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-medium">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}