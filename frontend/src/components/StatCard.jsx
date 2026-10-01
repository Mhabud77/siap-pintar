export default function StatCard({ icon, label, value, subtitle, color = 'blue' }) {
    const colorClasses = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        green: 'bg-green-50 border-green-200 text-green-700',
        yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        purple: 'bg-purple-50 border-purple-200 text-purple-700',
        indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    };

    const iconBg = {
        blue: 'bg-blue-100',
        green: 'bg-green-100',
        yellow: 'bg-yellow-100',
        red: 'bg-red-100',
        purple: 'bg-purple-100',
        indigo: 'bg-indigo-100',
    };

    return (
        <div className={`card border-l-4 ${colorClasses[color]} hover:shadow-lg transition`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                        {label}
                    </p>
                    <p className="text-3xl font-bold mt-1">
                        {value}
                    </p>
                    {subtitle && (
                        <p className="text-xs mt-1 opacity-60">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className={`${iconBg[color]} w-14 h-14 rounded-full flex items-center justify-center text-2xl`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}