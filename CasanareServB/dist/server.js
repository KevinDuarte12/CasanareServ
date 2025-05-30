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
// Importamos express y el tipo Application desde el módulo 'express'
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path")); // Importar path
const http_1 = __importDefault(require("http")); // Importar http para WebSockets
// Importamos los routers para productos, usuarios y categorías
const products_1 = __importDefault(require("./routes/products")); // Rutas para productos
const user_1 = __importDefault(require("./routes/user")); // Rutas para usuarios
const category_1 = __importDefault(require("./routes/category")); // Rutas para categorías
const barter_1 = __importDefault(require("./routes/barter")); // Rutas para trueques
const cart_1 = __importDefault(require("./routes/cart")); // Rutas para el carrito
const conection_1 = __importDefault(require("./db/conection")); // Conexión a la base de datos
const cors_1 = __importDefault(require("cors"));
const image_1 = __importDefault(require("./routes/image")); // Rutas para imágenes
const notifications_1 = __importDefault(require("./routes/notifications")); // Rutas para notificaciones
const rating_1 = __importDefault(require("./routes/rating")); // Rutas para calificaciones
const deliveryAddress_1 = __importDefault(require("./routes/deliveryAddress")); // Rutas para direcciones de entrega
const chatMessage_1 = __importDefault(require("./routes/chatMessage")); // Rutas para mensajes de chat
const transaction_1 = __importDefault(require("./routes/transaction")); // Rutas para pagos
// Importar rutas de WebSocket y test
const WebSocket_1 = __importDefault(require("./routes/WebSocket")); // Importar rutas de WebSocket
const test_route_1 = __importDefault(require("./routes/test-route")); // Importar rutas de prueba
// Importar funciones de Socket.IO
const socket_1 = require("./sockets/socket");
// Importar todos los modelos
require("./db/models/user");
require("./db/models/category");
require("./db/models/product");
require("./db/models/cart");
require("./db/models/itemcart");
require("./db/models/image"); // Importar el modelo de imagen
require("./db/associationsImage"); // Importar asociaciones de imagen
require("./db/models/barter"); // Importar el modelo de trueque
require("./db/models/notifications"); // Importar el modelo de notificaciones
// Definimos una clase llamada server que manejará la configuración del servidor
class Server {
    // Constructor de la clase - se ejecuta al crear una nueva instancia
    constructor() {
        // Asignamos el puerto desde las variables de entorno o usamos '3001' por defecto
        this.port = process.env.PORT || '3006';
        // Inicializamos la aplicación express
        this.app = (0, express_1.default)();
        // Creamos el servidor HTTP basado en la app Express
        this.server = http_1.default.createServer(this.app);
        // Primero configurar middlewares y rutas
        this.middlewares();
        this.routes();
        // Luego conectar a la base de datos
        this.dbConnection().then(() => {
            // Solo iniciar el servidor después de conectar a la DB
            this.listen();
            // Inicializar Socket.IO después de iniciar el servidor
            const io = (0, socket_1.initializeSocketServer)(this.server);
            (0, socket_1.setSocketServer)(io);
            console.log('Socket.IO inicializado correctamente');
        });
    }
    // Método para iniciar el servidor HTTP
    listen() {
        // Usamos this.server.listen en lugar de this.app.listen para soportar WebSockets
        this.server.listen(this.port, () => {
            console.log(`Server running on port ${this.port}`);
        });
    }
    // Método para configurar las rutas de la API
    routes() {
        // Configuramos las rutas base para productos, usuarios y categorías
        this.app.use('/api/products', products_1.default);
        this.app.use('/api/users', user_1.default);
        this.app.use('/api/categories', category_1.default); // Añadimos la ruta de categorías
        this.app.use('/api/barters', barter_1.default); // Añadimos la ruta de trueques
        this.app.use('/api/carts', cart_1.default);
        this.app.use('/api/images', image_1.default); // Añadimos la ruta de imágenes
        this.app.use('/api/notifications', notifications_1.default); // Añadimos la ruta de notificaciones
        this.app.use('/api/ratings', rating_1.default); // Añadimos la ruta de calificaciones
        this.app.use('/api/addresses', deliveryAddress_1.default); // Añadimos la ruta de direcciones
        this.app.use('/api/chat', chatMessage_1.default); // Añadimos la ruta de chat
        this.app.use('/api/payment', transaction_1.default); // Agrega esta línea
        this.app.use('/api/transaction', transaction_1.default); // Mantén esta si ya existe
        // Añadimos las nuevas rutas para WebSocket y pruebas
        this.app.use('/api/socket-diagnostics', WebSocket_1.default); // Rutas de diagnóstico WebSocket
        this.app.use('/api/test', test_route_1.default); // Rutas de prueba
        // Ruta directa para verificar que Express funciona
        this.app.get('/direct-test', (_req, res) => {
            console.log('🔍 Accediendo a ruta directa de prueba');
            res.json({ message: 'Direct test route works!' });
        });
    }
    // Método para configurar los middlewares
    middlewares() {
        // Habilitamos el parsing de JSON en las peticiones
        this.app.use(express_1.default.json());
        this.app.use((0, cors_1.default)({
            origin: 'http://localhost:4200', // URL de Angular 
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Añade PATCH para el toggle-status
            allowedHeaders: ['Content-Type', 'Authorization', 'x-token']
        }));
        // Servir archivos estáticos (para uploads temporales si es necesario)
        this.app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
    }
    // Método para conectar a la base de datos
    dbConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Primero verificar la conexión
                yield conection_1.default.authenticate();
                console.log('Database connection established successfully');
                // Luego sincronizar los modelos
                yield conection_1.default.sync(); // Sincroniza todos los modelos
                console.log('Database synchronized');
            }
            catch (error) {
                console.error('Unable to connect to the database:', error);
                throw error; // Re-lanzar el error para manejarlo en el constructor
            }
        });
    }
}
// Exportamos la clase Server para poder usarla en otros archivos
exports.default = Server;
