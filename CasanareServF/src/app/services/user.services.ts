import { Injectable } from '@angular/core'; // Importa el decorador Injectable para definir un servicio
import { HttpClient } from '@angular/common/http'; // Importa HttpClient para hacer solicitudes HTTP
import { environment } from '../../environment/environment'; // Importa el archivo de configuración del entorno
import { user } from '../interfaces/user'; // Importa la interfaz user para tipar los datos
import { Observable } from 'rxjs'; // Importa Observable para manejar flujos de datos asíncronos
import { map } from 'rxjs/operators'; // Importa operadores de RxJS para transformar los datos
interface LoginResponse {
  token: string;
  user: user;
  expiresIn: number;
  msg: string;
}
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

  login(user: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.myAppUrl}${this.myApiUrl}login`, user)
      .pipe(
        map((response: LoginResponse) => {
          // Guardar el token
          localStorage.setItem('token', response.token);
          
          // Guardar el usuario completo como objeto
          localStorage.setItem('user', JSON.stringify(response.user));
          
          console.log('Usuario guardado en localStorage:', response.user);
          
          return response;
        })
      );
  }
  getUsers(): Observable<user[]> {
    // Método para obtener todos los usuarios
    return this.http.get<user[]>(`${this.myAppUrl}${this.myApiUrl}`);
  }
  getUser(id: number): Observable<user> {
    // Método para obtener un usuario por su ID
    return this.http.get<user>(`${this.myAppUrl}${this.myApiUrl}${id}`);
  }
  updateUser(id: number, userData: user): Observable<any> {
    // Método para actualizar un usuario
    return this.http.put<any>(`${this.myAppUrl}${this.myApiUrl}${id}`, userData);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.myAppUrl}${this.myApiUrl}${id}`);
  }
  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.myAppUrl}${this.myApiUrl}verify-email?token=${token}`);
  }
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.myAppUrl}${this.myApiUrl}forgot-password`, { email });
  }
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.myAppUrl}${this.myApiUrl}reset-password`, { token, newPassword });
  }
}