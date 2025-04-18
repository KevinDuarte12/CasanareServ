"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv")); // Importa dotenv para cargar variables de entorno desde un archivo .env
// Configura dotenv para cargar las variables de entorno desde el archivo .env
// Es importante cargar las variables de entorno ANTES de importar el servidor
dotenv_1.default.config();
const server_1 = __importDefault(require("./server")); // Importa la clase Server desde el archivo server.ts
// Crea una instancia de la clase Server
new server_1.default();
