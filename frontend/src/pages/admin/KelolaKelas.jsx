import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function KelolaKelas() {
    const navigate = useNavigate();
    const [kelasList, setKelasList] = useState([]);
    const [guruList, setGuruList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [filterTingkat, setFilterTingkat] = useState('');
    const [search, setSearch] = useState('');
    
    // Modal set wali
    const [showModal, setShowModal] = useState(false);
    const [selectedKelas, setSelectedKelas] = useState(null);
    const [selectedGuruId, setSelectedGuruId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadKelas();
        loadGuru();
    }, []);

    const loadKelas = async () => {
        setLoading(true);
        try {
            const res = await api.get('/kelas');
            setKelasList(res.data.data || []);
        } catch (err) {
            console.error('Error load kelas:', err);
            setMessage({ type: 'error', text: 'Gagal memuat data kelas' });
        }
        setLoading(false);
    };

    const loadGuru = async () => {
        try {
            const res = await api.get('/kelas/guru');
            setGuruList(res.data.data || []);
        } catch (err) {
            console.error('Error load guru:', err);
        }
    };

    const openSetWaliModal = (kelas) => {
        setSelectedKelas(kelas);
        setSelectedGuruId(kelas.wali_kelas_id || '');
        setShowModal(true);
    };

    const handleSetWali = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/kelas/${selectedKelas.id}/wali`, {
                wali_kelas_id: selectedGuruId || null
            });
            
            setMessage({
                type: 'success',
                text: selectedGuruId
                    ? `✅ Wali kelas ${selectedKelas.nama_kelas} berhasil diset!`
                    : `✅ Wali kelas ${selectedKelas.nama_kelas} berhasil dihapus`
            });
            
            setShowModal(false);
            setSelectedKelas(null);
            setSelectedGuruId('');
            loadKelas();
            loadGuru(); // Refresh juga daftar guru
        } catch (err) {
            setMessage({
                type: 'error',
                text: '❌ ' + (err.response?.data?.message || 'Gagal menyimpan')
            });
        }
        setSaving(false);
    };

    // Filter kelas
    const filteredKelas = kelasList.filter(k => {
        const matchTingkat = !filterTingkat || k.tingkat === filterTingkat;
        const matchSearch = 
            k.nama_kelas?.toLowerCase().includes(search.toLowerCase()) ||
            k.wali_kelas_nama?.toLowerCase().includes(search.toLowerCase());
        return matchTingkat && matchSearch;
    });

    // Statistik ringkasan
    const totalKelas = kelasList.length;
    const totalMurid = kelasList.reduce((sum, k) => sum + (k.jumlah_murid || 0), 0);
    const kelasTanpaWali = kelasList.filter(k => !k.wali_kelas_id).length;
    const kelasDenganWali = totalKelas - kelasTanpaWali;

    const getTingkatColor = (tingkat) => {
        const colors = {
            '7': 'bg-blue-100 text-blue-700 border-blue-300',
            '8': 'bg-green-100 text-green-700 border-green-300',
            '9': 'bg-purple-100 text-purple-700 border-purple-300'
        };
        return colors[tingkat] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                {/* HEADER */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/admin')}
                        className="text-primary hover:underline mb-2 text-sm"
                    >
                        ← Kembali ke Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">
                        🏫 Kelola Kelas
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Kelola daftar kelas, wali kelas, dan lihat jumlah murid
                    </p>
                </div>

                {/* STATISTIK */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="card border-l-4 border-blue-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Total Kelas</p>
                        <p className="text-3xl font-bold text-blue-700">{totalKelas}</p>
                        <p className="text-xs text-gray-500 mt-1">7A - 9G</p>
                    </div>
                    <div className="card border-l-4 border-green-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Total Murid</p>
                        <p className="text-3xl font-bold text-green-700">{totalMurid}</p>
                        <p className="text-xs text-gray-500 mt-1">Semua tingkat</p>
                    </div>
                    <div className="card border-l-4 border-yellow-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Kelas Ada Wali</p>
                        <p className="text-3xl font-bold text-yellow-700">{kelasDenganWali}</p>
                        <p className="text-xs text-gray-500 mt-1">Sudah diset</p>
                    </div>
                    <div className="card border-l-4 border-red-500">
                        <p className="text-xs text-gray-600 font-semibold uppercase">Tanpa Wali</p>
                        <p className="text-3xl font-bold text-red-700">{kelasTanpaWali}</p>
                        <p className="text-xs text-gray-500 mt-1">Perlu diset</p>
                    </div>
                </div>

                {/* MESSAGE */}
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

                {/* FILTER */}
                <div className="card mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Filter Tingkat
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFilterTingkat('')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                        filterTingkat === ''
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 hover:bg-gray-200'
                                    }`}
                                >
                                    Semua
                                </button>
                                <button
                                    onClick={() => setFilterTingkat('7')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                        filterTingkat === '7'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                                    }`}
                                >
                                    Kelas 7
                                </button>
                                <button
                                    onClick={() => setFilterTingkat('8')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                        filterTingkat === '8'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-green-50 hover:bg-green-100 text-green-700'
                                    }`}
                                >
                                    Kelas 8
                                </button>
                                <button
                                    onClick={() => setFilterTingkat('9')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                                        filterTingkat === '9'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                                    }`}
                                >
                                    Kelas 9
                                </button>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Cari
                            </label>
                            <input
                                type="text"
                                placeholder="🔍 Cari nama kelas atau wali kelas..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="input-field"
                            />
                        </div>
                    </div>
                </div>

                {/* TABEL KELAS */}
                <div className="card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">
                            Daftar Kelas ({filteredKelas.length})
                        </h2>
                        <button
                            onClick={loadKelas}
                            className="text-primary hover:underline text-sm"
                        >
                            🔄 Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12 text-gray-500">
                            ⏳ Memuat data...
                        </div>
                    ) : filteredKelas.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-4">📭</div>
                            <p className="text-gray-600">Tidak ada kelas yang sesuai filter</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="px-4 py-2 text-left">No</th>
                                        <th className="px-4 py-2 text-left">Kelas</th>
                                        <th className="px-4 py-2 text-left">Wali Kelas</th>
                                        <th className="px-4 py-2 text-center">Jumlah Murid</th>
                                        <th className="px-4 py-2 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredKelas.map((k, i) => (
                                        <tr key={k.id} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getTingkatColor(k.tingkat)}`}>
                                                    {k.nama_kelas}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {k.wali_kelas_id ? (
                                                    <div>
                                                        <p className="font-medium text-gray-800">
                                                            {k.wali_kelas_nama}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            @{k.wali_kelas_username}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <span className="text-red-500 text-sm italic">
                                                        ⚠️ Belum diset
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-block bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-bold text-sm">
                                                    {k.jumlah_murid} murid
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => openSetWaliModal(k)}
                                                    className="text-primary hover:underline text-sm font-medium"
                                                >
                                                    {k.wali_kelas_id ? '✏️ Ganti Wali' : '➕ Set Wali'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL SET WALI KELAS */}
                {showModal && selectedKelas && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-gray-800">
                                    👨‍🏫 Set Wali Kelas {selectedKelas.nama_kelas}
                                </h2>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                                >
                                    ×
                                </button>
                            </div>

                            <form onSubmit={handleSetWali}>
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Pilih Wali Kelas
                                    </label>
                                    <select
                                        value={selectedGuruId}
                                        onChange={(e) => setSelectedGuruId(e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="">-- Tidak Ada Wali Kelas --</option>
                                        {guruList.map((g) => (
                                            <option 
                                                key={g.id} 
                                                value={g.id}
                                                disabled={g.jumlah_kelas_diampu > 0 && g.id !== selectedKelas.wali_kelas_id}
                                            >
                                                {g.nama_lengkap}
                                                {g.jumlah_kelas_diampu > 0 
                                                    ? ` (sudah jadi wali ${g.jumlah_kelas_diampu} kelas)` 
                                                    : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-2">
                                        💡 Satu guru hanya boleh menjadi wali kelas di satu kelas.
                                    </p>
                                </div>

                                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded mb-4">
                                    <p className="text-sm text-blue-700">
                                        <strong>Info Kelas:</strong>
                                    </p>
                                    <p className="text-sm text-blue-600 mt-1">
                                        • Nama: <strong>{selectedKelas.nama_kelas}</strong>
                                    </p>
                                    <p className="text-sm text-blue-600">
                                        • Tingkat: {selectedKelas.tingkat}
                                    </p>
                                    <p className="text-sm text-blue-600">
                                        • Jumlah Murid: {selectedKelas.jumlah_murid} orang
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="btn-primary flex-1 disabled:opacity-50"
                                    >
                                        {saving ? '⏳ Menyimpan...' : '💾 Simpan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}