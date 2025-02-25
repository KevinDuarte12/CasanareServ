// Importa los decoradores y servicios necesarios desde Angular
import { Inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

// Marca la clase como un servicio inyectable
@Injectable()
export class ProductosService { 
    // Inyecta el servicio HttpClient en la clase
    private http = Inject(HttpClient);

    // Define un getter para obtener los productos desde una API
    get Productos() {
        // Realiza una solicitud HTTP GET a la URL especificada y devuelve la respuesta
        return this.http.get('https://fakestoreapi.com/products');
    }
}