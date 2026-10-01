import { useNavigate } from 'react-router-dom';

export default function BackupData() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => navigate('/admin')} className="text-primary mb-4">
                    ← Kembali ke Dashboard
                </button>
                <div className="card text-center py-12">
                    <div className="text-6xl mb-4">💾</div>
                    <h1 className="text-2xl font-bold text-gray-800">Backup Data</h1>
                    <p className="text-gray-600 mt-2">Backup dan restore data aplikasi.</p>
                    <p className="text-sm text-gray-400 mt-4">🚧 Coming Soon</p>
                </div>
            </div>
        </div>
    );
}