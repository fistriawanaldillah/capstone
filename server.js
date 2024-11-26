const Hapi = require('@hapi/hapi');
const userRoutes = require('./routes/userRoutes'); 

const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT || 3000,  // Gunakan PORT dari lingkungan atau fallback ke 3000 jika tidak ada
        host: '0.0.0.0',  // Cloud Run mengharuskan host 0.0.0.0 untuk menerima request dari luar
    });

    server.route(userRoutes);

    await server.start(); 
    console.log(`Server running on ${server.info.uri}`);
};

// Menangani unhandled rejection
process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

// Inisialisasi server
init();
