// Importamos express y el tipo Application desde el módulo 'express'
import express, { Application } from 'express';
import path from 'path'; // Importar path
// Importamos los routers para productos, usuarios y categorías
import productRoutes from './routes/products'; // Rutas para productos
import userRoutes from './routes/user';       // Rutas para usuarios
import categoryRoutes from './routes/category'; // Rutas para categorías
import barterRoutes from './routes/barter'; // Rutas para trueques
import cartRoutes from './routes/cart'; // Rutas para el carrito
import sequelize from './db/conection';            // Conexión a la base de datos
import cors from 'cors';
import imageRoutes from './routes/image'; // Rutas para imágenes
// Importar todos los modelos
import './db/models/user';
import './db/models/category';
import './db/models/product';
import './db/models/cart';
import './db/models/itemcart';
import cart_associations from './db/models/car_associations'; // Importar asociaciones de carrito
import './db/models/image'; // Importar el modelo de imagen
import './db/associationsImage'; // Importar asociaciones de imagen

// Definimos una clase llamada server que manejará la configuración del servidor
class Server {
    // Declaramos una propiedad privada app que contendrá la instancia de express
    private app: Application;
    // Declaramos una propiedad privada port para el puerto del servidor
    private port: string;

    // Constructor de la clase - se ejecuta al crear una nueva instancia
    constructor() {
        // Asignamos el puerto desde las variables de entorno o usamos '3001' por defecto
        this.port = process.env.PORT || '3006';
        // Inicializamos la aplicación express
        this.app = express();

        // Primero configurar middlewares y rutas
        this.middlewares();
        this.routes();
        
        // Luego conectar a la base de datos
        this.dbConnection().then(() => {
            // Solo iniciar el servidor después de conectar a la DB
            this.listen();
        });
    }

    // Método para iniciar el servidor HTTP
    listen() {
        // Iniciamos el servidor en el puerto especificado
        this.app.listen(this.port, () => {
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
            cart_associations();
        } catch (error) {
            console.error('Unable to connect to the database:', error);
            throw error; // Re-lanzar el error para manejarlo en el constructor
        }
    }
}

// Exportamos la clase Server para poder usarla en otros archivos
export default Server;