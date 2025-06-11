"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const products_1 = __importDefault(require("./routes/products"));
const user_1 = __importDefault(require("./routes/user"));
const category_1 = __importDefault(require("./routes/category"));
const barter_1 = __importDefault(require("./routes/barter"));
const cart_1 = __importDefault(require("./routes/cart"));
const conection_1 = __importDefault(require("./db/conection"));
const cors_1 = __importDefault(require("cors"));
const image_1 = __importDefault(require("./routes/image"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const rating_1 = __importDefault(require("./routes/rating"));
const deliveryAddress_1 = __importDefault(require("./routes/deliveryAddress"));
const chatMessage_1 = __importDefault(require("./routes/chatMessage"));
const transaction_1 = __importDefault(require("./routes/transaction"));
const shipment_tracking_1 = __importDefault(require("./routes/shipment-tracking"));
const WebSocket_1 = __importDefault(require("./routes/WebSocket"));
const test_route_1 = __importDefault(require("./routes/test-route"));
const socket_1 = require("./sockets/socket");
require("./db/models/user");
require("./db/models/category");
require("./db/models/product");
require("./db/models/cart");
require("./db/models/itemcart");
require("./db/models/image");
require("./db/associations");
require("./db/models/barter");
require("./db/models/notifications");
/**
 * 🚀 SERVIDOR PRINCIPAL DE CASANARESERV
 * Clase que gestiona la configuración completa del servidor backend
 * Incluye Express, Socket.IO, base de datos y todas las rutas de la API
 */
class Server {
    /**
     * 🏗️ CONSTRUCTOR DEL SERVIDOR
     * Inicializa todas las configuraciones y componentes del servidor
     * Orden: Middlewares → Rutas → Base de datos → Arranque → WebSockets
     */
    constructor() {
        // ⚙️ CONFIGURACIÓN INICIAL
        this.port = process.env.PORT || '3006'; // Puerto desde ENV o por defecto
        this.app = (0, express_1.default)(); // Inicializar Express
        this.server = http_1.default.createServer(this.app); // Servidor HTTP para Socket.IO
        // 🔧 CONFIGURAR COMPONENTES
        this.middlewares(); // Configurar middlewares de Express
        this.routes(); // Configurar todas las rutas de la API
        // 🗄️ CONECTAR BASE DE DATOS Y ARRANCAR
        this.dbConnection().then(() => {
            this.listen(); // Iniciar servidor HTTP
            // 🔌 INICIALIZAR WEBSOCKETS
            const io = (0, socket_1.initializeSocketServer)(this.server);
            (0, socket_1.setSocketServer)(io);
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
        this.app.use('/api/products', products_1.default); // Gestión de productos
        this.app.use('/api/categories', category_1.default); // Categorías de productos
        this.app.use('/api/barters', barter_1.default); // Sistema de trueques
        this.app.use('/api/carts', cart_1.default); // Carrito de compras
        this.app.use('/api/ratings', rating_1.default); // Calificaciones y reseñas
        // 👥 RUTAS DE USUARIOS Y AUTENTICACIÓN
        this.app.use('/api/users', user_1.default); // Gestión de usuarios
        // 🖼️ RUTAS DE MULTIMEDIA Y COMUNICACIÓN
        this.app.use('/api/images', image_1.default); // Gestión de imágenes
        this.app.use('/api/chat', chatMessage_1.default); // Sistema de chat
        this.app.use('/api/notifications', notifications_1.default); // Notificaciones push
        // 💳 RUTAS DE TRANSACCIONES Y LOGÍSTICA
        this.app.use('/api/payment', transaction_1.default); // Procesamiento de pagos
        this.app.use('/api/transaction', transaction_1.default); // Transacciones (alias)
        this.app.use('/api/addresses', deliveryAddress_1.default); // Direcciones de entrega
        this.app.use('/api/shipment', shipment_tracking_1.default); // Seguimiento de envíos
        // 🔧 RUTAS DE DIAGNÓSTICO Y PRUEBAS
        this.app.use('/api/socket-diagnostics', WebSocket_1.default); // Diagnóstico WebSocket
        this.app.use('/api/test', test_route_1.default); // Rutas de prueba
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
        this.app.use(express_1.default.json()); // Habilitar parsing de JSON
        // 🌐 CONFIGURACIÓN CORS PARA ANGULAR
        this.app.use((0, cors_1.default)({
            origin: 'http://localhost:4200', // Frontend Angular permitido
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Métodos HTTP permitidos
            allowedHeaders: ['Content-Type', 'Authorization', 'x-token'] // Headers permitidos
        }));
        // 📁 SERVIR ARCHIVOS ESTÁTICOS
        this.app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
    }
    /**
     * 🗄️ CONEXIÓN Y SINCRONIZACIÓN DE BASE DE DATOS
     * Establece conexión con PostgreSQL y sincroniza modelos de Sequelize
     * Maneja errores de conexión y sincronización
     */
    dbConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // 🔌 VERIFICAR CONEXIÓN A LA BASE DE DATOS
                yield conection_1.default.authenticate();
                console.log('🗄️ Database connection established successfully');
                // 🔄 SINCRONIZAR MODELOS CON LA BASE DE DATOS
                yield conection_1.default.sync();
                console.log('📊 Database synchronized');
            }
            catch (error) {
                // 🚨 MANEJO DE ERRORES DE BASE DE DATOS
                console.error('❌ Unable to connect to the database:', error);
                throw error; // Re-lanzar para manejo en constructor
            }
        });
    }
}
exports.default = Server;
