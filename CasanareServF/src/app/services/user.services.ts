import { Injectable } from '@angular/core'; // Importa el decorador Injectable para definir un servicio
import { HttpClient, HttpHeaders } from '@angular/common/http'; // Importa HttpClient para hacer solicitudes HTTP
import { environment } from '../../environment/environment'; // Importa el archivo de configuración del entorno
import { user } from '../interfaces/user'; // Importa la interfaz user para tipar los datos
import { Observable, throwError } from 'rxjs'; // Importa Observable para manejar flujos de datos asíncronos
import { map, tap, catchError } from 'rxjs/operators'; // Importa operadores de RxJS para transformar los datos
import { AuthService } from './auth.service';

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

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { // Inyecta el servicio HttpClient para hacer solicitudes HTTP
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

  // Obtener todos los usuarios (requiere autenticación)
  getUsers(): Observable<user[]> {
    return this.http.get<user[]>(
      `${this.myAppUrl}${this.myApiUrl}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Obtener un usuario por ID (requiere autenticación)
  getUser(id: number): Observable<user> {
    return this.http.get<user>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Actualizar un usuario (requiere autenticación)
  updateUser(id: number, userData: user): Observable<any> {
    return this.http.put<any>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
      userData,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Eliminar un usuario (requiere autenticación)
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
      { headers: this.authService.getAuthHeaders() }
    );
  }

  // Verificar email (no requiere autenticación)
  verifyEmail(token: string): Observable<any> {
    return this.http.get(`${this.myAppUrl}${this.myApiUrl}verify?token=${token}`);
  }

  // Solicitar recuperación de contraseña (no requiere autenticación)
  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.myAppUrl}${this.myApiUrl}forgot-password`, { email });
  }

  // Restablecer contraseña (no requiere autenticación)
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.myAppUrl}${this.myApiUrl}reset-password`, { token, newPassword });
  }

  // Asegúrate de tener este método en tu servicio de usuario
  getUserInfo(): Observable<any> {
    return this.http.get<any>(`${this.myAppUrl}${this.myApiUrl}profile`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((userData) => {
        // Guarda la información del usuario en localStorage para uso futuro
        localStorage.setItem('userData', JSON.stringify({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          rol: userData.rol
        }));
        console.log('Usuario guardado en localStorage:', userData);
      }),
      catchError(error => {
        console.error('Error obteniendo información de usuario:', error);
        return throwError(() => new Error('Error al obtener información del usuario'));
      })
    );
  }

  // Método auxiliar para obtener los headers con el token
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
}