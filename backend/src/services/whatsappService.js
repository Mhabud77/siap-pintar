const axios = require('axios');
require('dotenv').config();

const kirimNotifikasiWA = async (no_telepon, pesan) => {
    try {
        let formattedPhone = no_telepon.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
        }

        const response = await axios.post(
            process.env.WHATSAPP_API_URL,
            {
                target: formattedPhone,
                message: pesan,
            },
            {
                headers: {
                    'Authorization': process.env.WHATSAPP_API_TOKEN,
                },
            }
        );

        console.log('WhatsApp sent:', response.data);
        return response.data;

    } catch (error) {
        console.error('Error WhatsApp:', error.message);
        return null;
    }
};

module.exports = { kirimNotifikasiWA };