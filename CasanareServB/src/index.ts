import dotenv from "dotenv"; // Importa dotenv para cargar variables de entorno desde un archivo .env

// Configura dotenv para cargar las variables de entorno desde el archivo .env
// Es importante cargar las variables de entorno ANTES de importar el servidor
dotenv.config();

import Server from "./server"; // Importa la clase Server desde el archivo server.ts

// Crea una instancia de la clase Server
new Server();