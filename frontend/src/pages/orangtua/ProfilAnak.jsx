import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const BASE_URL = 'http://localhost:5000';

export default function ProfilAnak() {
    const navigate = useNavigate();
    const { murid_id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, [murid_id]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/orangtua/profil/${murid_id}`);
            setData(res.data.data);
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    if (loading) return <div className="p-6 text-center">⏳ Memuat...</div>;
    if (!data) return <div className="p-6 text-center">Data tidak ditemukan</div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-3xl mx-auto">
                <button onClick={() => navigate('/orangtua')} className="text-primary hover:underline mb-4 text-sm">
                    ← Kembali
                </button>

                <h1 className="text-3xl font-bold text-gray-800 mb-6">👤 Profil Anak</h1>

                {/* HEADER PROFIL */}
                <div className="card mb-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <div className="flex items-center gap-6 flex-wrap">
                        {data.foto_profil ? (
                            <img src={`${BASE_URL}${data.foto_profil}`} alt={data.nama_lengkap} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
                        ) : (
                            <div className="w-32 h-32 bg-white bg-opacity-20 backdrop-blur rounded-full flex items-center justify-center text-white font-bold text-5xl border-4 border-white">
                                {data.nama_lengkap?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                            </div>
                        )}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold">{data.nama_lengkap}</h2>
                            <p className="text-blue-100">NIS: {data.nis}</p>
                            <p className="text-blue-100">Kelas: {data.nama_kelas}</p>
                            <div className="mt-3 flex gap-4">
                                <div>
                                    <p className="text-xs opacity-90">Poin Bulan</p>
                                    <p className="text-2xl font-bold">{data.poin_bulan_ini}</p>
                                </div>
                                <div>
                                    <p className="text-xs opacity-90">Poin Tahun</p>
                                    <p className="text-2xl font-bold">{data.poin_tahun_ini}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* INFO DETAIL */}
                <div className="card mb-6">
                    <h3 className="font-bold text-lg mb-4">📋 Informasi Detail</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Nama Lengkap</p>
                            <p className="font-bold">{data.nama_lengkap}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">NIS</p>
                            <p className="font-bold font-mono">{data.nis}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Kelas</p>
                            <p className="font-bold">{data.nama_kelas}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Tingkat</p>
                            <p className="font-bold">{data.tingkat}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">Email</p>
                            <p className="font-bold">{data.email || '-'}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-500">QR Code</p>
                            <p className="font-bold font-mono text-sm">{data.qr_code}</p>
                        </div>
                    </div>
                </div>

                {/* WALI KELAS */}
                {data.wali_kelas_nama && (
                    <div className="card mb-6">
                        <h3 className="font-bold text-lg mb-4">👨‍🏫 Wali Kelas</h3>
                        <div className="flex items-center gap-4">
                            {data.wali_kelas_foto ? (
                                <img src={`${BASE_URL}${data.wali_kelas_foto}`} alt={data.wali_kelas_nama} className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                                    {data.wali_kelas_nama.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="font-bold text-lg">{data.wali_kelas_nama}</p>
                                <p className="text-sm text-gray-600">📧 {data.wali_kelas_email || '-'}</p>
                                <p className="text-sm text-gray-600">📞 {data.wali_kelas_telepon || '-'}</p>
                            </div>
                            {data.wali_kelas_telepon && (
                                <a
                                    href={`https://wa.me/${data.wali_kelas_telepon.replace(/^0/, '62')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-success"
                                >
                                    💬 WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}