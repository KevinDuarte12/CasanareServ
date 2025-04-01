import dotenv from "dotenv"; // Importa dotenv para cargar variables de entorno desde un archivo .env
import server from "./server"; // Importa la clase Server desde el archivo server.ts

// Crea una instancia de la clase Server
new server();

// Configura dotenv para cargar las variables de entorno desde el archivo .env
dotenv.config();