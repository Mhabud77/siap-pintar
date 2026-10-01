import api from './api';

export const scanQR = async (qr_code) => {
    const response = await api.post('/absensi/scan', { qr_code });
    return response.data;
};

export const getAbsensiHariIni = async () => {
    const response = await api.get('/absensi/hari-ini');
    return response.data;
};

export const getAbsensiByMurid = async (murid_id, bulan, tahun) => {
    const response = await api.get(`/absensi/murid/${murid_id}`, {
        params: { bulan, tahun }
    });
    return response.data;
};