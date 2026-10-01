import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

export default function AbsensiAnak() {
    const navigate = useNavigate();
    const { murid_id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bulan, setBulan] = useState(new Date().getMonth() + 1);
    const [tahun, setTahun] = useState(new Date().getFullYear());

    useEffect(() => { loadData(); }, [murid_id, bulan, tahun]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/orangtua/absensi/${murid_id}?bulan=${bulan}&tahun=${tahun}`);
            setData(res.data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const getStatusColor = (status) => {
        const colors = {
            hadir: 'bg-green-100 text-green-700',
            terlambat: 'bg-red-100 text-red-700',
            izin: 'bg-yellow-100 text-yellow-700',
            sakit: 'bg-blue-100 text-blue-700',
            alpa: 'bg-gray-100 text-gray-700'
        };
        return colors[status] || 'bg-gray-100';
    };

    if (loading) return <div className="p-6 text-center">⏳ Memuat...</div>;
    if (!data) return <div className="p-6 text-center">Data tidak ditemukan</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-5xl mx-auto">
                <button onClick={() => navigate('/orangtua')} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali
                </button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">
                    📅 Absensi {data.murid.nama_lengkap}
                </h1>

                {/* FILTER */}
                <div className="card mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value))} className="input-field">
                            {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'].map((b, i) => (
                                <option key={i} value={i + 1}>{b}</option>
                            ))}
                        </select>
                        <input type="number" value={tahun} onChange={(e) => setTahun(parseInt(e.target.value))} className="input-field" />
                    </div>
                </div>

                {/* STATISTIK */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="card border-l-4 border-green-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Hadir</p>
                        <p className="text-3xl font-bold text-green-700">{data.statistik.hadir}</p>
                    </div>
                    <div className="card border-l-4 border-red-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Terlambat</p>
                        <p className="text-3xl font-bold text-red-700">{data.statistik.terlambat}</p>
                    </div>
                    <div className="card border-l-4 border-yellow-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Izin</p>
                        <p className="text-3xl font-bold text-yellow-700">{data.statistik.izin}</p>
                    </div>
                    <div className="card border-l-4 border-blue-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">Sakit</p>
                        <p className="text-3xl font-bold text-blue-700">{data.statistik.sakit}</p>
                    </div>
                    <div className="card border-l-4 border-purple-500">
                        <p className="text-xs text-gray-500 font-bold uppercase">% Hadir</p>
                        <p className="text-3xl font-bold text-purple-700">{data.statistik.persen_kehadiran}%</p>
                    </div>
                </div>

                {/* DAFTAR */}
                <div className="card">
                    <h2 className="font-bold text-lg mb-4">Detail Absensi ({data.absensi.length})</h2>
                    {data.absensi.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">Belum ada data</p>
                    ) : (
                        <div className="space-y-2">
                            {data.absensi.map((a) => (
                                <div key={a.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                        <p className="font-medium">
                                            {new Date(a.tanggal).toLocaleDateString('id-ID', {
                                                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                                            })}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            📥 Datang: {a.jam_datang || '-'}
                                            {a.jam_pulang && ` • 📤 Pulang: ${a.jam_pulang}`}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(a.status)}`}>
                                        {a.status.toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}