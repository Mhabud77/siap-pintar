import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import api from '../services/api';

const BASE_URL = 'http://localhost:5000';

export default function ProfilSaya() {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [profil, setProfil] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('profil');

    // Foto
    const [fotoPreview, setFotoPreview] = useState(null);
    const [fotoFile, setFotoFile] = useState(null);
    const [uploadingFoto, setUploadingFoto] = useState(false);
    const fileInputRef = useRef(null);

    // Form
    const [formProfil, setFormProfil] = useState({
        nama_lengkap: '', nip: '', email: '', no_telepon: '', jenis_kelamin: 'L'
    });

    const [formPassword, setFormPassword] = useState({
        password_lama: '', password_baru: '', konfirmasi_password: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => { loadProfil(); }, []);

    const loadProfil = async () => {
        setLoading(true);
        try {
            const res = await api.get('/profil');
            const data = res.data.data;
            setProfil(data);
            setFormProfil({
                nama_lengkap: data.nama_lengkap || '',
                nip: data.nip || '',
                email: data.email || '',
                no_telepon: data.no_telepon || '',
                jenis_kelamin: data.murid?.jenis_kelamin || 'L'
            });
            setFotoPreview(data.foto_profil ? `${BASE_URL}${data.foto_profil}` : null);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Gagal memuat profil' });
        }
        setLoading(false);
    };

    const handleFotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: '❌ Ukuran foto maksimal 2MB' });
            return;
        }
        setFotoFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setFotoPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleUploadFoto = async () => {
        if (!fotoFile) return;
        setUploadingFoto(true);
        try {
            const formData = new FormData();
            formData.append('foto_profil', fotoFile);
            const res = await api.put('/profil/foto', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            updateUser({ foto_profil: res.data.data.foto_profil });
            setFotoFile(null);
            setMessage({ type: 'success', text: '✅ Foto profil berhasil diupdate!' });
        } catch (err) {
            setMessage({ type: 'error', text: '❌ ' + (err.response?.data?.message || 'Gagal upload') });
        }
        setUploadingFoto(false);
    };

    const handleHapusFoto = async () => {
        if (!confirm('Yakin hapus foto profil?')) return;
        try {
            await api.delete('/profil/foto');
            updateUser({ foto_profil: null });
            setFotoPreview(null);
            setFotoFile(null);
            setMessage({ type: 'success', text: '✅ Foto profil berhasil dihapus' });
        } catch (err) {
            setMessage({ type: 'error', text: '❌ Gagal menghapus' });
        }
    };

    const handleUpdateProfil = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/profil', formProfil);
            updateUser({ nama_lengkap: formProfil.nama_lengkap });
            setMessage({ type: 'success', text: '✅ Profil berhasil diupdate!' });
            loadProfil();
        } catch (err) {
            setMessage({ type: 'error', text: '❌ ' + (err.response?.data?.message || 'Gagal') });
        }
        setSaving(false);
    };

    const handleGantiPassword = async (e) => {
        e.preventDefault();
        if (formPassword.password_baru !== formPassword.konfirmasi_password) {
            setMessage({ type: 'error', text: '❌ Konfirmasi password tidak cocok' });
            return;
        }
        setSaving(true);
        try {
            await api.put('/profil/password', {
                password_lama: formPassword.password_lama,
                password_baru: formPassword.password_baru
            });
            setMessage({ type: 'success', text: '✅ Password berhasil diubah!' });
            setFormPassword({ password_lama: '', password_baru: '', konfirmasi_password: '' });
        } catch (err) {
            setMessage({ type: 'error', text: '❌ ' + (err.response?.data?.message || 'Gagal') });
        }
        setSaving(false);
    };

    const getInisial = (nama) => nama?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';

    const getRoleBadge = (role) => {
        const colors = {
            admin: 'bg-red-100 text-red-700',
            kepsek: 'bg-purple-100 text-purple-700',
            guru: 'bg-blue-100 text-blue-700',
            guru_bk: 'bg-indigo-100 text-indigo-700',
            murid: 'bg-green-100 text-green-700',
            orangtua: 'bg-yellow-100 text-yellow-700'
        };
        return colors[role] || 'bg-gray-100 text-gray-700';
    };

    if (loading) {
        return <div className="min-h-screen bg-gray-100 p-6"><div className="max-w-4xl mx-auto"><div className="card text-center py-12">⏳ Memuat profil...</div></div></div>;
    }

    const isMurid = profil?.role === 'murid';

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <button onClick={() => navigate(-1)} className="text-primary hover:underline mb-2 text-sm">← Kembali</button>
                    <h1 className="text-3xl font-bold text-gray-800">👤 Profil Saya</h1>
                    <p className="text-gray-600 mt-1">Kelola informasi akun dan foto profil Anda</p>
                </div>

                {message && (
                    <div className={`card mb-4 border-l-4 ${message.type === 'success' ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                        <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>{message.text}</p>
                    </div>
                )}

                {/* KARTU PROFIL */}
                <div className="card mb-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        <div className="flex flex-col items-center gap-2 flex-shrink-0">
                            {fotoPreview ? (
                                <img src={fotoPreview} alt={profil.nama_lengkap} className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow-lg" />
                            ) : (
                                <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                                    {getInisial(profil.nama_lengkap)}
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFotoChange} accept="image/*" className="hidden" />
                            {fotoFile ? (
                                <div className="flex gap-1">
                                    <button onClick={handleUploadFoto} disabled={uploadingFoto} className="btn-primary text-xs disabled:opacity-50">{uploadingFoto ? '⏳' : '💾 Simpan Foto'}</button>
                                    <button onClick={() => { setFotoFile(null); setFotoPreview(profil.foto_profil ? `${BASE_URL}${profil.foto_profil}` : null); }} className="bg-gray-300 text-xs px-2 py-1 rounded">✕</button>
                                </div>
                            ) : (
                                <div className="flex gap-1">
                                    <button onClick={() => fileInputRef.current.click()} className="text-xs text-primary hover:underline">📷 {fotoPreview ? 'Ganti' : 'Upload'} Foto</button>
                                    {profil.foto_profil && (<button onClick={handleHapusFoto} className="text-xs text-red-500 hover:underline">🗑️ Hapus</button>)}
                                </div>
                            )}
                            <p className="text-xs text-gray-500">Maks 2MB</p>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold text-gray-800">{profil.nama_lengkap}</h2>
                            <p className="text-gray-500">@{profil.username}</p>
                            {profil.nip && (<p className="text-gray-600 text-sm font-mono mt-1">NIP: {profil.nip}</p>)}
                            <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start">
                                <span className={`text-xs px-3 py-1 rounded-full font-bold ${getRoleBadge(profil.role)}`}>{profil.role.toUpperCase()}</span>
                                {profil.is_wali_kelas && (
                                    <span className="text-xs px-3 py-1 rounded-full font-bold bg-green-100 text-green-700">WALI KELAS {profil.kelas_diampu?.nama_kelas}</span>
                                )}
                                {isMurid && profil.murid && (
                                    <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-700">KELAS {profil.murid.nama_kelas}</span>
                                )}
                                {isMurid && profil.murid?.jenis_kelamin && (
                                    <span className={`text-xs px-3 py-1 rounded-full font-bold ${profil.murid.jenis_kelamin === 'L' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                        {profil.murid.jenis_kelamin === 'L' ? '👦 LAKI-LAKI' : '👧 PEREMPUAN'}
                                    </span>
                                )}
                            </div>

                            {isMurid && profil.murid && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                    <p className="text-sm text-gray-600">NIS: <strong>{profil.murid.nis}</strong></p>
                                    <p className="text-sm text-gray-600">Poin Bulan Ini: <strong className="text-primary">{profil.murid.poin_bulan_ini}</strong></p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* TAB */}
                <div className="card">
                    <div className="flex gap-2 border-b border-gray-200 mb-4">
                        <button onClick={() => setActiveTab('profil')} className={`px-4 py-2 text-sm font-medium transition border-b-2 ${activeTab === 'profil' ? 'text-primary border-primary' : 'text-gray-600 border-transparent hover:text-primary'}`}>📝 Data Profil</button>
                        <button onClick={() => setActiveTab('password')} className={`px-4 py-2 text-sm font-medium transition border-b-2 ${activeTab === 'password' ? 'text-primary border-primary' : 'text-gray-600 border-transparent hover:text-primary'}`}>🔒 Ganti Password</button>
                    </div>

                    {activeTab === 'profil' && (
                        <form onSubmit={handleUpdateProfil}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nama Lengkap</label>
                                <input type="text" value={formProfil.nama_lengkap} onChange={(e) => setFormProfil({ ...formProfil, nama_lengkap: e.target.value })} className="input-field" required />
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Username</label>
                                <input type="text" value={profil?.username || ''} className="input-field bg-gray-100 text-gray-600" disabled />
                                <p className="text-xs text-gray-500 mt-1">Username tidak dapat diubah</p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">NIP</label>
                                <input type="text" value={formProfil.nip} onChange={(e) => setFormProfil({ ...formProfil, nip: e.target.value })} className="input-field font-mono" placeholder="Contoh: 197001011990011001" maxLength={30} />
                                <p className="text-xs text-gray-500 mt-1">NIP hanya untuk guru/pegawai. Murid & orang tua kosongkan.</p>
                            </div>

                            {/* JENIS KELAMIN — hanya untuk murid */}
                            {isMurid && (
                                <div className="mb-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Jenis Kelamin</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button type="button" onClick={() => setFormProfil({ ...formProfil, jenis_kelamin: 'L' })} className={`px-4 py-3 rounded-lg font-bold transition border-2 ${formProfil.jenis_kelamin === 'L' ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                                            👦 Laki-laki
                                        </button>
                                        <button type="button" onClick={() => setFormProfil({ ...formProfil, jenis_kelamin: 'P' })} className={`px-4 py-3 rounded-lg font-bold transition border-2 ${formProfil.jenis_kelamin === 'P' ? 'bg-pink-500 text-white border-pink-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
                                            👧 Perempuan
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Pilih jenis kelamin Anda</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Email</label>
                                    <input type="email" value={formProfil.email} onChange={(e) => setFormProfil({ ...formProfil, email: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">No. Telepon</label>
                                    <input type="text" value={formProfil.no_telepon} onChange={(e) => setFormProfil({ ...formProfil, no_telepon: e.target.value })} className="input-field" />
                                </div>
                            </div>

                            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                                {saving ? '⏳ Menyimpan...' : '💾 Simpan Perubahan'}
                            </button>
                        </form>
                    )}

                    {activeTab === 'password' && (
                        <form onSubmit={handleGantiPassword}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Password Lama</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={formPassword.password_lama} onChange={(e) => setFormPassword({ ...formPassword, password_lama: e.target.value })} className="input-field pr-12" required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500">
                                        {showPassword ? '👁️' : '👁️‍🗨️'}
                                    </button>
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Password Baru (min. 6 karakter)</label>
                                <input type={showPassword ? 'text' : 'password'} value={formPassword.password_baru} onChange={(e) => setFormPassword({ ...formPassword, password_baru: e.target.value })} className="input-field" required minLength={6} />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Konfirmasi Password Baru</label>
                                <input type={showPassword ? 'text' : 'password'} value={formPassword.konfirmasi_password} onChange={(e) => setFormPassword({ ...formPassword, konfirmasi_password: e.target.value })} className="input-field" required />
                                {formPassword.password_baru && formPassword.konfirmasi_password && formPassword.password_baru !== formPassword.konfirmasi_password && (
                                    <p className="text-xs text-red-500 mt-1">⚠️ Password tidak cocok</p>
                                )}
                            </div>
                            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                                {saving ? '⏳ Menyimpan...' : '🔒 Ganti Password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}