import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME!, // Nombre de la base de datos
  process.env.DB_USER!, // Usuario
  process.env.DB_PASSWORD!, // Contraseña
  {
    host: process.env.DB_HOST!, // Host
    port: parseInt(process.env.DB_PORT!), // Puerto (convertir a número)
    dialect: 'mysql', // Dialecto (MySQL, PostgreSQL, etc.)
  }
);

// Exportamos la instancia de conexión para usarla en otros archivos
export default sequelize;