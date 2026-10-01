import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function LaporanBK() {
    const navigate = useNavigate();
    const [laporan, setLaporan] = useState([]);
    const [statistik, setStatistik] = useState(null);
    const [kelasList, setKelasList] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filter, setFilter] = useState({
        kelas_id: '', status: '', dari: '', sampai: ''
    });

    useEffect(() => { loadKelas(); }, []);
    useEffect(() => { loadLaporan(); }, [filter]);

    const loadKelas = async () => {
        try {
            const res = await api.get('/kelas/untuk-filter');
            setKelasList(res.data.data || []);
        } catch (err) { console.error(err); }
    };

    const loadLaporan = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            Object.entries(filter).forEach(([k, v]) => { if (v) params.append(k, v); });

            const res = await api.get(`/bk/laporan?${params.toString()}`);
            setLaporan(res.data.data || []);
            setStatistik(res.data.statistik);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handlePrint = () => { window.print(); };

    const getStatusBadge = (status) => {
        const badges = {
            menunggu: 'bg-yellow-100 text-yellow-700',
            dibaca: 'bg-blue-100 text-blue-700',
            dibalas: 'bg-green-100 text-green-700',
            selesai: 'bg-gray-100 text-gray-700'
        };
        return badges[status] || 'bg-gray-100';
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-7xl mx-auto">
                <button onClick={() => navigate('/guru-bk')} className="text-primary hover:underline mb-4 text-sm print:hidden">← Kembali</button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">📄 Laporan Bimbingan Konseling</h1>

                {/* FILTER */}
                <div className="card mb-6 print:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-sm font-bold mb-1">Kelas</label>
                            <select value={filter.kelas_id} onChange={(e) => setFilter({ ...filter, kelas_id: e.target.value })} className="input-field">
                                <option value="">Semua Kelas</option>
                                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Status</label>
                            <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="input-field">
                                <option value="">Semua</option>
                                <option value="menunggu">Menunggu</option>
                                <option value="dibalas">Dibalas</option>
                                <option value="selesai">Selesai</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Dari Tanggal</label>
                            <input type="date" value={filter.dari} onChange={(e) => setFilter({ ...filter, dari: e.target.value })} className="input-field" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">Sampai Tanggal</label>
                            <input type="date" value={filter.sampai} onChange={(e) => setFilter({ ...filter, sampai: e.target.value })} className="input-field" />
                        </div>
                    </div>
                    <button onClick={handlePrint} className="btn-primary mt-3">🖨️ Cetak Laporan</button>
                </div>

                {/* STATISTIK */}
                {statistik && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="card text-center py-3"><p className="text-xs text-gray-500">Total Pesan</p><p className="text-3xl font-bold">{statistik.total}</p></div>
                        <div className="card text-center py-3 bg-green-50"><p className="text-xs text-green-700">Dibalas</p><p className="text-3xl font-bold text-green-700">{statistik.dibalas}</p></div>
                        <div className="card text-center py-3 bg-gray-50"><p className="text-xs">Selesai</p><p className="text-3xl font-bold">{statistik.selesai}</p></div>
                    </div>
                )}

                {/* TABEL */}
                <div className="card">
                    <h3 className="font-bold mb-4">Daftar Pesan ({laporan.length})</h3>
                    {loading ? (
                        <div className="text-center py-12">⏳ Memuat...</div>
                    ) : laporan.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Tidak ada data</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="table-header">
                                        <th className="px-3 py-2 text-left">No</th>
                                        <th className="px-3 py-2 text-left">Tanggal</th>
                                        <th className="px-3 py-2 text-left">Murid</th>
                                        <th className="px-3 py-2 text-left">Kelas</th>
                                        <th className="px-3 py-2 text-left">Judul</th>
                                        <th className="px-3 py-2 text-left">Kategori</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {laporan.map((l, i) => (
                                        <tr key={l.id} className="border-b hover:bg-gray-50">
                                            <td className="px-3 py-2">{i + 1}</td>
                                            <td className="px-3 py-2 text-sm">{new Date(l.created_at).toLocaleDateString('id-ID')}</td>
                                            <td className="px-3 py-2 text-sm font-medium">{l.murid_nama}</td>
                                            <td className="px-3 py-2 text-sm">{l.nama_kelas}</td>
                                            <td className="px-3 py-2 text-sm">{l.judul}</td>
                                            <td className="px-3 py-2 text-sm">{l.kategori}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(l.status)}`}>{l.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}