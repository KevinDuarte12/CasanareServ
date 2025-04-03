import { Injectable } from '@angular/core'; // Importa el decorador Injectable para definir un servicio
import { HttpClient } from '@angular/common/http'; // Importa HttpClient para hacer solicitudes HTTP
import { environment } from '../../environment/environment'; // Importa el archivo de configuración del entorno
import { user } from '../interfaces/user'; // Importa la interfaz user para tipar los datos
import { Observable } from 'rxjs'; // Importa Observable para manejar flujos de datos asíncronos

@Injectable({
  providedIn: 'root' // Indica que el servicio está disponible en toda la aplicación (singleton)
})
export class UserService {
  private myAppUrl: string; // Variable para almacenar la URL base de la aplicación
  private myApiUrl: string; // Variable para almacenar la ruta de la API para usuarios

  constructor(private http: HttpClient) { // Inyecta el servicio HttpClient para hacer solicitudes HTTP
    this.myAppUrl = environment.endpoint; // Asigna la URL base desde el archivo de entorno
    this.myApiUrl = 'api/users/'; // Asigna la ruta de la API para usuarios
  }

  signIn(user: user): Observable<any> {
    // Método para registrar un nuevo usuario
    return this.http.post<any>(`${this.myAppUrl}${this.myApiUrl}`, user); // Realiza una solicitud POST a la API
  }

  login(user: user): Observable<string> {
    // Método para iniciar sesión
    return this.http.post<string>(`${this.myAppUrl}${this.myApiUrl}/login`, user); // Realiza una solicitud POST a la API
  }
  getUsers(): Observable<user[]> {
    // Método para obtener todos los usuarios
    return this.http.get<user[]>(`${this.myAppUrl}${this.myApiUrl}`);
  }
  updateUser(id: number, user: user): Observable<void> {
    return this.http.put<void>(`${this.myAppUrl}${this.myApiUrl}${id}`, user);
  }

  getUser(id: number): Observable<user> {
    return this.http.get<user>(`${this.myAppUrl}${this.myApiUrl}${id}`);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.myAppUrl}${this.myApiUrl}${id}`);
  }
}