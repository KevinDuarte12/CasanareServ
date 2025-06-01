// Importamos express y el tipo Application desde el módulo 'express'
import express, { Application } from 'express';
import path from 'path'; // Importar path
import http from 'http'; // Importar http para WebSockets
// Importamos los routers para productos, usuarios y categorías
import productRoutes from './routes/products'; // Rutas para productos
import userRoutes from './routes/user';       // Rutas para usuarios
import categoryRoutes from './routes/category'; // Rutas para categorías
import barterRoutes from './routes/barter'; // Rutas para trueques
import cartRoutes from './routes/cart'; // Rutas para el carrito
import sequelize from './db/conection';            // Conexión a la base de datos
import cors from 'cors';
import imageRoutes from './routes/image'; // Rutas para imágenes
import notificationRoutes from './routes/notifications'; // Rutas para notificaciones
import ratingRoutes from './routes/rating'; // Rutas para calificaciones
import deliveryAddressRoutes from './routes/deliveryAddress'; // Rutas para direcciones de entrega
import chatMessageRoutes from './routes/chatMessage'; // Rutas para mensajes de chat
import transactionRoutes from './routes/transaction'; // Rutas para pagos
// Importar rutas de WebSocket y test
import webSocketRoutes from './routes/WebSocket'; // Importar rutas de WebSocket
import testRoutes from './routes/test-route'; // Importar rutas de prueba
// Importar funciones de Socket.IO
import { initializeSocketServer, setSocketServer } from './sockets/socket';
// Importar todos los modelos
import './db/models/user';
import './db/models/category';
import './db/models/product';
import './db/models/cart';
import './db/models/itemcart';
import './db/models/image'; // Importar el modelo de imagen
import './db/associationsImage'; // Importar asociaciones de imagen
import './db/models/barter'; // Importar el modelo de trueque
import './db/models/notifications'; // Importar el modelo de notificaciones
// Definimos una clase llamada server que manejará la configuración del servidor
class Server {
    // Declaramos una propiedad privada app que contendrá la instancia de express
    private app: Application;
    // Declaramos una propiedad privada port para el puerto del servidor
    private port: string;
    // Agregamos el servidor HTTP para WebSockets
    private server: http.Server;

    // Constructor de la clase - se ejecuta al crear una nueva instancia
    constructor() {
        // Asignamos el puerto desde las variables de entorno o usamos '3001' por defecto
        this.port = process.env.PORT || '3006';
        // Inicializamos la aplicación express
        this.app = express();
        // Creamos el servidor HTTP basado en la app Express
        this.server = http.createServer(this.app);

        // Primero configurar middlewares y rutas
        this.middlewares();
        this.routes();
        
        // Luego conectar a la base de datos
        this.dbConnection().then(() => {
            // Solo iniciar el servidor después de conectar a la DB
            this.listen();
            // Inicializar Socket.IO después de iniciar el servidor
            const io = initializeSocketServer(this.server);
            setSocketServer(io);
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
        this.app.use('/api/products', productRoutes);
        this.app.use('/api/users', userRoutes);
        this.app.use('/api/categories', categoryRoutes); // Añadimos la ruta de categorías
        this.app.use('/api/barters', barterRoutes); // Añadimos la ruta de trueques
        this.app.use('/api/carts', cartRoutes);
        this.app.use('/api/images', imageRoutes); // Añadimos la ruta de imágenes
        this.app.use('/api/notifications', notificationRoutes); // Añadimos la ruta de notificaciones
        this.app.use('/api/ratings', ratingRoutes); // Añadimos la ruta de calificaciones
        this.app.use('/api/addresses', deliveryAddressRoutes); // Añadimos la ruta de direcciones
        this.app.use('/api/chat', chatMessageRoutes); // Añadimos la ruta de chat
        this.app.use('/api/payment', transactionRoutes); // Agrega esta línea
        this.app.use('/api/transaction', transactionRoutes); // Mantén esta si ya existe
        // Añadimos las nuevas rutas para WebSocket y pruebas
        this.app.use('/api/socket-diagnostics', webSocketRoutes); // Rutas de diagnóstico WebSocket
        this.app.use('/api/test', testRoutes); // Rutas de prueba
        
        // Ruta directa para verificar que Express funciona
        this.app.get('/direct-test', (_req, res) => {
            console.log('🔍 Accediendo a ruta directa de prueba');
            res.json({ message: 'Direct test route works!' });
        });
    }

    // Método para configurar los middlewares
    middlewares() {
        // Habilitamos el parsing de JSON en las peticiones
        this.app.use(express.json());
        this.app.use(cors({
            origin: 'http://localhost:4200', // URL de Angular 
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // Añade PATCH para el toggle-status
            allowedHeaders: ['Content-Type', 'Authorization','x-token']
        }));
        // Servir archivos estáticos (para uploads temporales si es necesario)
        this.app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
    }

    // Método para conectar a la base de datos
    async dbConnection() {
        try {
            // Primero verificar la conexión
            await sequelize.authenticate();
            console.log('Database connection established successfully');
            
            // Luego sincronizar los modelos
            await sequelize.sync(); // Sincroniza todos los modelos
            console.log('Database synchronized');

        } catch (error) {
            console.error('Unable to connect to the database:', error);
            throw error; // Re-lanzar el error para manejarlo en el constructor
        }
    }
}

// Exportamos la clase Server para poder usarla en otros archivos
export default Server;