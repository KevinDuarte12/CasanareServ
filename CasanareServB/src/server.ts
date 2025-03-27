// Importamos express y el tipo Application desde el módulo 'express'
import express, { Application } from 'express';
// Importamos los routers para productos y usuarios

import userRoutes from './routes/user';       // Rutas para usuarios
import sequelize from './db/conection';            // Conexión a la base de datos
import cors from 'cors';

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
        // Configuramos las rutas base para productos y usuarios

        this.app.use('/api/users', userRoutes);
    }

    // Método para configurar los middlewares
    middlewares() {
        // Habilitamos el parsing de JSON en las peticiones
        this.app.use(express.json());
        this.app.use(cors({
            origin: 'http://localhost:4200', // Tu URL de Angular (ajústala si es diferente)
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
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