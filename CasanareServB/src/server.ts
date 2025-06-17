import express, { Application } from 'express';
import path from 'path';
import http from 'http';
import productRoutes from './routes/products';
import userRoutes from './routes/user';
import categoryRoutes from './routes/category';
import barterRoutes from './routes/barter';
import cartRoutes from './routes/cart';
import sequelize from './db/conection';
import cors from 'cors';
import imageRoutes from './routes/image';
import notificationRoutes from './routes/notifications';
import ratingRoutes from './routes/rating';
import deliveryAddressRoutes from './routes/deliveryAddress';
import chatMessageRoutes from './routes/chatMessage';
import transactionRoutes from './routes/transaction';
import shipmentRoutes from './routes/shipment-tracking';
import webSocketRoutes from './routes/WebSocket';
import testRoutes from './routes/test-route';
import { initializeSocketServer, setSocketServer } from './sockets/socket';
import './db/models/user';
import './db/models/category';
import './db/models/product';
import './db/models/cart';
import './db/models/itemcart';
import './db/models/image';
import './db/associations';
import './db/models/barter';
import './db/models/notifications';

/**
 * 🚀 SERVIDOR PRINCIPAL DE CASANARESERV
 * Clase que gestiona la configuración completa del servidor backend
 * Incluye Express, Socket.IO, base de datos y todas las rutas de la API
 */
class Server {
    private app: Application;          // Instancia de Express
    private port: string;              // Puerto del servidor
    private server: http.Server;       // Servidor HTTP para WebSockets

    /**
     * 🏗️ CONSTRUCTOR DEL SERVIDOR
     * Inicializa todas las configuraciones y componentes del servidor
     * Orden: Middlewares → Rutas → Base de datos → Arranque → WebSockets
     */
    constructor() {
        // ⚙️ CONFIGURACIÓN INICIAL
        this.port = process.env.PORT || '3006';           // Puerto desde ENV o por defecto
        this.app = express();                             // Inicializar Express
        this.server = http.createServer(this.app);        // Servidor HTTP para Socket.IO

        // 🔧 CONFIGURAR COMPONENTES
        this.middlewares();    // Configurar middlewares de Express
        this.routes();         // Configurar todas las rutas de la API
        
        // 🗄️ CONECTAR BASE DE DATOS Y ARRANCAR
        this.dbConnection().then(() => {
            this.listen();                                // Iniciar servidor HTTP
            
            // 🔌 INICIALIZAR WEBSOCKETS
            const io = initializeSocketServer(this.server);
            setSocketServer(io);
            console.log('✅ Socket.IO inicializado correctamente');
        });
    }

    /**
     * 🎧 INICIAR SERVIDOR HTTP
     * Pone el servidor a escuchar en el puerto configurado
     * Soporta tanto HTTP como WebSockets
     */
    listen() {
        this.server.listen(this.port, () => {
            console.log(`🚀 Server running on port ${this.port}`);
        });
    }

    /**
     * 🛣️ CONFIGURACIÓN DE RUTAS DE LA API
     * Define todos los endpoints y sus respectivos routers
     * Organizado por módulos funcionales del sistema
     */
    routes() {
        // 📦 RUTAS DE PRODUCTOS Y COMERCIO
        this.app.use('/api/products', productRoutes);         // Gestión de productos
        this.app.use('/api/categories', categoryRoutes);      // Categorías de productos
        this.app.use('/api/barters', barterRoutes);           // Sistema de trueques
        this.app.use('/api/carts', cartRoutes);               // Carrito de compras
        this.app.use('/api/ratings', ratingRoutes);           // Calificaciones y reseñas

        // 👥 RUTAS DE USUARIOS Y AUTENTICACIÓN
        this.app.use('/api/users', userRoutes);               // Gestión de usuarios

        // 🖼️ RUTAS DE MULTIMEDIA Y COMUNICACIÓN
        this.app.use('/api/images', imageRoutes);             // Gestión de imágenes
        this.app.use('/api/chat', chatMessageRoutes);         // Sistema de chat
        this.app.use('/api/notifications', notificationRoutes); // Notificaciones push

        // 💳 RUTAS DE TRANSACCIONES Y LOGÍSTICA
        this.app.use('/api/payment', transactionRoutes);      // Procesamiento de pagos
        this.app.use('/api/transaction', transactionRoutes);  // Transacciones (alias)
        this.app.use('/api/addresses', deliveryAddressRoutes); // Direcciones de entrega
        this.app.use('/api/shipment', shipmentRoutes);        // Seguimiento de envíos

        // 🔧 RUTAS DE DIAGNÓSTICO Y PRUEBAS
        this.app.use('/api/socket-diagnostics', webSocketRoutes); // Diagnóstico WebSocket
        this.app.use('/api/test', testRoutes);                // Rutas de prueba

        // 🩺 RUTA DE VERIFICACIÓN DIRECTA
        this.app.get('/direct-test', (_req, res) => {
            console.log('🔍 Accediendo a ruta directa de prueba');
            res.json({ 
                message: 'Direct test route works!',
                timestamp: new Date().toISOString(),
                port: this.port
            });
        });
    }

    /**
     * 🛡️ CONFIGURACIÓN DE MIDDLEWARES
     * Establece middlewares globales para toda la aplicación
     * Incluye CORS, parsing de JSON y archivos estáticos
     */
    middlewares() {
        // 📄 PARSING DE DATOS
        this.app.use(express.json());                     // Habilitar parsing de JSON

        // 🌐 CONFIGURACIÓN CORS PARA ANGULAR
        this.app.use(cors({
            origin: 'http://localhost:4200',              // Frontend Angular permitido
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Métodos HTTP permitidos
            allowedHeaders: ['Content-Type', 'Authorization', 'x-token'] // Headers permitidos
        }));

        // 📁 SERVIR ARCHIVOS ESTÁTICOS
        this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    }

    /**
     * 🗄️ CONEXIÓN Y SINCRONIZACIÓN DE BASE DE DATOS
     * Establece conexión con PostgreSQL y sincroniza modelos de Sequelize
     * Maneja errores de conexión y sincronización
     */
    async dbConnection() {
        try {
            // 🔌 VERIFICAR CONEXIÓN A LA BASE DE DATOS
            await sequelize.authenticate();
            console.log('🗄️ Database connection established successfully');
            
            // 🔄 SINCRONIZAR MODELOS CON LA BASE DE DATOS
            await sequelize.sync();
            console.log('📊 Database synchronized');

        } catch (error) {
            // 🚨 MANEJO DE ERRORES DE BASE DE DATOS
            console.error('❌ Unable to connect to the database:', error);
            throw error; // Re-lanzar para manejo en constructor
        }
    }
}

export default Server;