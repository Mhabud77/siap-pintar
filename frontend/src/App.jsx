import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

// Import komponen
import Navbar from './components/Navbar';

// Import halaman
import Login from './pages/Login';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardKepsek from './pages/DashboardKepsek';
import DashboardGuru from './pages/DashboardGuru';
import DashboardMurid from './pages/DashboardMurid';
import DashboardOrangTua from './pages/DashboardOrangTua';
import Scanner from './pages/Scanner';
import Perilaku from './pages/Perilaku';
import MisiMurid from './pages/MisiMurid';
import ValidasiMisi from './pages/ValidasiMisi';
import Leaderboard from './pages/Leaderboard';
import Laporan from './pages/Laporan';
import KelolaUser from './pages/admin/KelolaUser';
import KelolaKelas from './pages/admin/KelolaKelas';
import KonfigurasiPoin from './pages/admin/KonfigurasiPoin';
import DataMisi from './pages/admin/DataMisi';
import CatatanWaliKelas from './pages/CatatanWaliKelas';
import Notifikasi from './pages/admin/Notifikasi';
import Pengaturan from './pages/admin/PengaturanAbsensi';
import BackupData from './pages/admin/BackupData';
import { ModeProvider } from './context/ModeContext';
import DataGuru from './pages/kepsek/DataGuru';
import DataMurid from './pages/kepsek/DataMurid';
import DataKelas from './pages/kepsek/DataKelas';
import DetailKelas from './pages/kepsek/DetailKelas';
import DataGuruAdmin from './pages/admin/DataGuruAdmin';
import DataMuridAdmin from './pages/admin/DataMuridAdmin';
import DataKelasAdmin from './pages/admin/DataKelasAdmin';
import ProfilSaya from './pages/ProfilSaya';
import DataKelasMurid from './pages/murid/DataKelasMurid';
import BimbinganKonseling from './pages/murid/BimbinganKonseling';
import PesanBK from './pages/guru/PesanBK';
import DashboardGuruBK from './pages/guru/DashboardGuruBK';
import LaporanBK from './pages/guru/LaporanBK';
import DataKelasBKList from './pages/guru/DataKelasBKList';
import DataKelasBK from './pages/guru/DataKelasBK';
import MisiMuridBK from './pages/guru/MisiMuridBK';
import DownloadUser from './pages/admin/DownloadUser';
import GenerateQR from './pages/admin/GenerateQR';
import KartuSiswa from './pages/admin/KartuSiswa';
import RekapAbsensi from './pages/RekapAbsensi';
import DataKelasUniversal from './pages/DataKelasUniversal';
import AbsensiAnak from './pages/orangtua/AbsensiAnak';
import PerilakuAnak from './pages/orangtua/PerilakuAnak';
import MisiAnak from './pages/orangtua/MisiAnak';
import LeaderboardAnak from './pages/orangtua/LeaderboardAnak';
import ProfilAnak from './pages/orangtua/ProfilAnak';
import KontakWali from './pages/orangtua/KontakWali';
import PengaturanNotifikasi from './pages/orangtua/PengaturanNotifikasi';
import PengaturanAbsensi from './pages/admin/PengaturanAbsensi';

// ============================================
// KOMPONEN: Layout dengan Navbar
// ============================================
function Layout({ children }) {
    const location = useLocation();
    
    // Sembunyikan Navbar di halaman login
    const hideNavbar = location.pathname === '/login';

    return (
        <>
            {!hideNavbar && <Navbar />}
            {children}
        </>
    );
}

// ============================================
// KOMPONEN: Protected Route
// ============================================
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// ============================================
// DAFTAR ROUTE
// ============================================
function AppRoutes() {
    return (
        <Routes>
            {/* PUBLIK */}
            <Route path="/login" element={<Login />} />

            {/* DASHBOARD */}
            <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <DashboardAdmin />
                </ProtectedRoute>
            } />
            <Route path="/kepsek" element={
                <ProtectedRoute allowedRoles={['kepsek']}>
                    <DashboardKepsek />
                </ProtectedRoute>
            } />
            <Route path="/guru" element={
                <ProtectedRoute allowedRoles={['guru']}>
                    <DashboardGuru />
                </ProtectedRoute>
            } />
            <Route path="/murid" element={
                <ProtectedRoute allowedRoles={['murid']}>
                    <DashboardMurid />
                </ProtectedRoute>
            } />
            <Route path="/orangtua" element={
                <ProtectedRoute allowedRoles={['orangtua']}>
                    <DashboardOrangTua />
                </ProtectedRoute>
            } />

            {/* FITUR ABSENSI */}
            <Route path="/scanner" element={
                <ProtectedRoute allowedRoles={['admin', 'guru', 'guru_bk']}>
                    <Scanner />
                </ProtectedRoute>
            } />

            {/* FITUR PERILAKU */}
            <Route path="/perilaku" element={
                <ProtectedRoute allowedRoles={['admin', 'kepsek', 'guru', 'guru_bk']}>
                    <Perilaku />
                </ProtectedRoute>
            } />

            {/* FITUR MISI */}
            <Route path="/misi" element={
                <ProtectedRoute allowedRoles={['murid']}>
                    <MisiMurid />
                </ProtectedRoute>
            } />
            <Route path="/validasi-misi" element={
                <ProtectedRoute allowedRoles={['admin', 'guru']}>
                    <ValidasiMisi />
                </ProtectedRoute>
            } />

            {/* FITUR LEADERBOARD */}
            <Route path="/leaderboard" element={
                <ProtectedRoute allowedRoles={['admin', 'kepsek', 'guru', 'guru_bk', 'murid', 'orangtua']}>
                    <Leaderboard />
                </ProtectedRoute>
            } />

            {/* FITUR LAPORAN */}
            <Route path="/laporan" element={
                <ProtectedRoute allowedRoles={['admin', 'kepsek', 'guru', 'orangtua']}>
                    <Laporan />
                </ProtectedRoute>
            } />
            {/* MENU CEPAT ADMIN */}
            <Route path="/admin/user" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <KelolaUser />
                </ProtectedRoute>
            } />
            <Route path="/admin/kelas" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <KelolaKelas />
                </ProtectedRoute>
            } />
            <Route path="/admin/poin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <KonfigurasiPoin />
                </ProtectedRoute>
            } />
            <Route path="/admin/misi" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <DataMisi />
                </ProtectedRoute>
            } />
            <Route path="/catatan-wali-kelas" element={
                <ProtectedRoute allowedRoles={['guru']}>
                    <CatatanWaliKelas />
                </ProtectedRoute>
            } />
            <Route path="/admin/notifikasi" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Notifikasi />
                </ProtectedRoute>
            } />
            <Route path="/admin/pengaturan" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <Pengaturan />
                </ProtectedRoute>
            } />
            <Route path="/admin/backup" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <BackupData />
                </ProtectedRoute>
            } />
            {/* KEPSEK - DATA SEKOLAH */}
            <Route path="/kepsek/guru" element={
                <ProtectedRoute allowedRoles={['kepsek', 'admin']}>
                    <DataGuru />
                </ProtectedRoute>
            } />
            <Route path="/kepsek/murid" element={
                <ProtectedRoute allowedRoles={['kepsek', 'admin']}>
                    <DataMurid />
                </ProtectedRoute>
            } />
            <Route path="/kepsek/kelas" element={
                <ProtectedRoute allowedRoles={['kepsek', 'admin']}>
                    <DataKelas />
                </ProtectedRoute>
            } />
            <Route path="/kepsek/kelas/:id" element={
                <ProtectedRoute allowedRoles={['kepsek', 'admin']}>
                    <DetailKelas />
                </ProtectedRoute>
            } />
            <Route path="/admin/data-guru" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <DataGuruAdmin />
                </ProtectedRoute>
            } />
            <Route path="/admin/data-murid" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <DataMuridAdmin />
                </ProtectedRoute>
            } />
            <Route path="/admin/data-kelas" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <DataKelasAdmin />
                </ProtectedRoute>
            } />
            <Route path="/profil" element={
                <ProtectedRoute allowedRoles={['admin', 'kepsek', 'guru', 'guru_bk', 'murid', 'orangtua']}>
                    <ProfilSaya />
                </ProtectedRoute>
            } />
            <Route path="/murid/kelas" element={
                <ProtectedRoute allowedRoles={['murid']}>
                    <DataKelasMurid />
                </ProtectedRoute>
            } />
            <Route path="/murid/bk" element={
                <ProtectedRoute allowedRoles={['murid']}>
                    <BimbinganKonseling />
                </ProtectedRoute>
            } />
            <Route path="/guru/pesan-bk" element={
                <ProtectedRoute allowedRoles={['guru', 'guru_bk']}>
                    <PesanBK />
                </ProtectedRoute>
            } />
            <Route path="/guru-bk" element={
                <ProtectedRoute allowedRoles={['guru_bk']}>
                    <DashboardGuruBK />
                </ProtectedRoute>
            } />
            <Route path="/guru-bk/laporan" element={
                <ProtectedRoute allowedRoles={['guru_bk']}>
                    <LaporanBK />
                </ProtectedRoute>
            } />
            {/* GURU BK - Data Kelas */}
            <Route path="/guru-bk/kelas" element={
                <ProtectedRoute allowedRoles={['guru_bk']}>
                    <DataKelasBKList />
                </ProtectedRoute>
            } />
            <Route path="/guru-bk/kelas/:id" element={
                <ProtectedRoute allowedRoles={['guru_bk']}>
                    <DataKelasBK />
                </ProtectedRoute>
            } />
            <Route path="/guru-bk/murid/:id/misi" element={
                <ProtectedRoute allowedRoles={['guru_bk']}>
                    <MisiMuridBK />
                </ProtectedRoute>
            } />
            <Route path="/admin/download-user" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <DownloadUser />
                </ProtectedRoute>
            } />
            <Route path="/admin/qr-code" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <GenerateQR />
                </ProtectedRoute>
            } />
            <Route path="/admin/kartu-siswa" element={
                <ProtectedRoute allowedRoles={['admin', 'kepsek', 'guru', 'guru_bk']}>
                    <KartuSiswa />
                </ProtectedRoute>
            } />
            <Route path="/rekap-absensi" element={
                <ProtectedRoute allowedRoles={['admin', 'kepsek', 'guru', 'guru_bk']}>
                    <RekapAbsensi />
                </ProtectedRoute>
            } />
            {/* DATA KELAS UNIVERSAL — semua role */}
            <Route path="/data-kelas" element={
                <ProtectedRoute allowedRoles={['admin', 'kepsek', 'guru', 'guru_bk', 'murid', 'orangtua']}>
                    <DataKelasUniversal />
                </ProtectedRoute>
            } />
            <Route path="/data-kelas/:id" element={
                <ProtectedRoute allowedRoles={['admin', 'kepsek', 'guru', 'guru_bk', 'murid', 'orangtua']}>
                    <DataKelasUniversal />
                </ProtectedRoute>
            } />
            {/* ORANG TUA */}
            <Route path="/orangtua/absensi/:murid_id" element={
                <ProtectedRoute allowedRoles={['orangtua']}>
                    <AbsensiAnak />
                </ProtectedRoute>
            } />
            <Route path="/orangtua/perilaku/:murid_id" element={
                <ProtectedRoute allowedRoles={['orangtua']}>
                    <PerilakuAnak />
                </ProtectedRoute>
            } />
            <Route path="/orangtua/misi/:murid_id" element={
                <ProtectedRoute allowedRoles={['orangtua']}>
                    <MisiAnak />
                </ProtectedRoute>
            } />
            <Route path="/orangtua/leaderboard/:murid_id" element={
                <ProtectedRoute allowedRoles={['orangtua']}>
                    <LeaderboardAnak />
                </ProtectedRoute>
            } />
            <Route path="/orangtua/profil/:murid_id" element={
                <ProtectedRoute allowedRoles={['orangtua']}>
                    <ProfilAnak />
                </ProtectedRoute>
            } />
            <Route path="/orangtua/kontak/:murid_id" element={
                <ProtectedRoute allowedRoles={['orangtua']}>
                    <KontakWali />
                </ProtectedRoute>
            } />
            <Route path="/orangtua/pengaturan" element={
                <ProtectedRoute allowedRoles={['orangtua']}>
                    <PengaturanNotifikasi />
                </ProtectedRoute>
            } />
            <Route path="/admin/pengaturan-absensi" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <PengaturanAbsensi />
                </ProtectedRoute>
            } />

            {/* DEFAULT */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

// ============================================
// APP UTAMA
// ============================================
export default function App() {
    return (
        <AuthProvider>
            <ModeProvider>
                <Router>
                    <Layout>
                        <AppRoutes />
                    </Layout>
                </Router>
            </ModeProvider>
        </AuthProvider>
    );
}