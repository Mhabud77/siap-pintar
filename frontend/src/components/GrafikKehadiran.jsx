import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

export default function GrafikKehadiran({ data = [] }) {
    if (data.length === 0) {
        return (
            <div className="card">
                <h3 className="text-lg font-bold text-gray-800 mb-4">
                    📊 Grafik Kehadiran Mingguan
                </h3>
                <div className="text-center py-12 text-gray-500">
                    Belum ada data kehadiran
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                    📊 Grafik Kehadiran Mingguan
                </h3>
                <span className="text-xs text-gray-500">
                    7 hari terakhir
                </span>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                        dataKey="hari" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                        domain={[0, 100]}
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip 
                        formatter={(value) => [`${value}%`, 'Kehadiran']}
                        labelFormatter={(label) => `Hari: ${label}`}
                        contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '8px'
                        }}
                    />
                    <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="3 3" label="Target 90%" />
                    <Line 
                        type="monotone" 
                        dataKey="persen" 
                        stroke="#2563eb" 
                        strokeWidth={3}
                        dot={{ fill: '#2563eb', r: 5 }}
                        activeDot={{ r: 8 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}