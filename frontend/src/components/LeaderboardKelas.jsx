export default function LeaderboardKelas({ data = [] }) {
    if (data.length === 0) {
        return (
            <div className="card text-center py-8">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-500">Belum ada data kelas</p>
            </div>
        );
    }

    const getPodiumEmoji = (rank) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `${rank}.`;
    };

    const getRankColor = (rank) => {
        if (rank === 1) return 'bg-yellow-50 border-yellow-300';
        if (rank === 2) return 'bg-gray-50 border-gray-300';
        if (rank === 3) return 'bg-orange-50 border-orange-300';
        return 'bg-white border-gray-200';
    };

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                    🏆 Leaderboard Kelas
                </h3>
                <span className="text-xs text-gray-500">
                    Rata-rata poin per kelas
                </span>
            </div>

            <div className="space-y-2">
                {data.slice(0, 10).map((kelas) => (
                    <div
                        key={kelas.id}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${getRankColor(kelas.rank)} hover:shadow-md transition`}
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl w-8 text-center">
                                {getPodiumEmoji(kelas.rank)}
                            </span>
                            <div>
                                <p className="font-bold text-gray-800">
                                    Kelas {kelas.nama_kelas}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {kelas.jumlah_murid} murid
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-bold text-primary">
                                {kelas.rata_rata_poin}
                            </p>
                            <p className="text-xs text-gray-500">rata-rata</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}