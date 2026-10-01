import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScanSuccess }) {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState('');
    const [lastScan, setLastScan] = useState('');
    const scannerRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (scannerRef.current) {
                const scanner = scannerRef.current;
                scannerRef.current = null;
                try {
                    const state = scanner.getState ? scanner.getState() : null;
                    if (state === 2 || state === 3) {
                        scanner.stop().then(() => scanner.clear()).catch(() => {});
                    }
                } catch (err) {
                    console.error('Cleanup error:', err);
                }
            }
        };
    }, []);

    const startScanner = async () => {
        if (isScanning || scannerRef.current) return;

        try {
            setError('');
            setIsScanning(true);

            await new Promise(resolve => setTimeout(resolve, 100));

            const scanner = new Html5Qrcode('qr-reader-container', {
                verbose: false,
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            });
            scannerRef.current = scanner;

            await scanner.start(
                {
                    facingMode: 'environment',
                },
                {
                    fps: 15,
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const size = Math.floor(minEdge * 0.7);
                        return { width: size, height: size };
                    },
                    aspectRatio: 1.0,
                    disableFlip: false
                },
                (decodedText) => {
                    console.log('✅ QR detected:', decodedText);
                    setLastScan(decodedText);
                    if (isMountedRef.current && onScanSuccess) {
                        onScanSuccess(decodedText);
                    }
                },
                () => {}
            );
        } catch (err) {
            console.error('Start scanner error:', err);
            if (isMountedRef.current) {
                setError('Gagal membuka kamera: ' + (err.message || err));
                setIsScanning(false);
                scannerRef.current = null;
            }
        }
    };

    const stopScanner = async () => {
        if (!scannerRef.current) {
            setIsScanning(false);
            return;
        }

        const scanner = scannerRef.current;
        scannerRef.current = null;

        try {
            const state = scanner.getState ? scanner.getState() : null;
            if (state === 2 || state === 3) {
                await scanner.stop();
                await scanner.clear();
            }
        } catch (err) {
            console.error('Stop scanner error:', err);
        }

        if (isMountedRef.current) {
            setIsScanning(false);
        }
    };

    return (
        <div className="w-full">
            {error && (
                <div className="mb-3 bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm">
                    ⚠️ {error}
                </div>
            )}

            {lastScan && (
                <div className="mb-3 bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded-lg text-sm">
                    ✅ QR terakhir: <strong>{lastScan}</strong>
                </div>
            )}

            <div
                className="relative bg-black rounded-2xl overflow-hidden"
                style={{
                    minHeight: '350px',
                    display: isScanning ? 'block' : 'none'
                }}
            >
                <div id="qr-reader-container" className="w-full" />

                {isScanning && (
                    <>
                        <div className="absolute inset-0 pointer-events-none">
                            <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                            <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                        </div>

                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            LIVE
                        </div>
                    </>
                )}
            </div>

            {!isScanning && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-12 text-center border-2 border-dashed border-blue-300">
                    <div className="text-6xl mb-4">📷</div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                        Kamera Belum Aktif
                    </h3>
                    <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
                        Klik tombol <strong>"Mulai Scan"</strong> di bawah untuk mengaktifkan kamera.
                    </p>

                    <button
                        onClick={startScanner}
                        className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-xl transition flex items-center gap-2 mx-auto"
                    >
                        <span className="text-2xl">▶️</span>
                        Mulai Scan Kamera
                    </button>

                    <p className="text-xs text-gray-500 mt-4">
                        💡 Tips: Dekatkan QR Code ke kamera (10-20 cm), pastikan pencahayaan cukup
                    </p>
                </div>
            )}

            {isScanning && (
                <div className="mt-4 flex justify-between items-center flex-wrap gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Kamera aktif — arahkan QR Code ke kamera
                    </div>

                    <button
                        onClick={stopScanner}
                        className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2"
                    >
                        <span>⏸️</span>
                        Hentikan Kamera
                    </button>
                </div>
            )}
        </div>
    );
}