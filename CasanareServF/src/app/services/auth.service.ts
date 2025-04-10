// Autenticación y autorización de usuarios en Angular
// Este servicio maneja el registro, inicio de sesión y verificación de roles de los usuarios en la aplicación Angular.
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environment/environment';
import { user } from '../interfaces/user';
import { ToastrService } from 'ngx-toastr'; // Añadir esta importación


interface LoginResponse {
  token: string;
  user: user;
  expiresIn: number;
  msg: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private myAppUrl: string;
  private myApiUrl: string;
  
  // BehaviorSubject para seguir el estado de autenticación
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  private authStatusSource = new BehaviorSubject<boolean>(this.isAuthenticated());
  authStatusChanged = this.authStatusSource.asObservable();
  
  constructor(private http: HttpClient, private router: Router, private toastr: ToastrService) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/users/';
    

    // Inicializar el BehaviorSubject con el usuario actual
    this.currentUserSubject = new BehaviorSubject<any>(this.getUserData());
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Intentar cargar el perfil de usuario al inicio si hay un token
    if (this.isAuthenticated()) {
      this.refreshUserProfile().subscribe();
    }
  }

  // Obtener headers para solicitudes autenticadas
  getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Registro de nuevos usuarios
  register(user: any): Observable<any> {
    return this.http.post<any>(`${this.myAppUrl}${this.myApiUrl}`, user)
      .pipe(
        tap((response) => {
          console.log('✅ Registro exitoso, respuesta:', response);
        }),
        catchError(this.handleError)
      );
  }

  // Inicio de sesión
  login(user: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.myAppUrl}${this.myApiUrl}login`, user)
      .pipe(
        tap((response) => {
          if (response && response.token) {
            // Guardar el token
            localStorage.setItem('token', response.token);
            
            // Guardar datos del usuario
            localStorage.setItem('user', JSON.stringify(response.user));
            
            // Actualizar el subject
            this.currentUserSubject.next(response.user);
            this.authStatusSource.next(true);
            
            console.log('✅ Login exitoso, token guardado');
          }
        }),
        catchError(this.handleError),
        // Cargar el perfil completo después del login
        switchMap(response => {
          if (response && response.token) {
            return this.getUserProfile().pipe(
              map(() => response)
            );
          }
          return of(response);
        })
      );
  }

  // Obtener el perfil del usuario autenticado
  getUserProfile(): Observable<any> {
    console.log('🔍 Obteniendo perfil de usuario...');
    if (!this.isAuthenticated()) {
      console.warn('❌ No hay token disponible');
      return throwError(() => new Error('No hay token disponible'));
    }
    
    return this.http.get<any>(`${this.myAppUrl}${this.myApiUrl}profile`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap((userData) => {
        console.log('✅ Perfil de usuario obtenido:', userData);
        localStorage.setItem('userData', JSON.stringify(userData));
        // Actualizar el subject con los datos completos
        this.currentUserSubject.next(userData);
      }),
      catchError(error => {
        console.error('❌ Error al obtener perfil de usuario:', error);
        
        // Si el error es 401, limpiar autenticación
        if (error.status === 401) {
          console.warn('🔒 Token inválido o expirado, cerrando sesión');
          this.logout();
        }
        
        return throwError(() => new Error('Error al obtener perfil de usuario'));
      })
    );
  }
  
  // Refrescar el perfil del usuario sin generar error si falla
  refreshUserProfile(): Observable<any> {
    return this.getUserProfile().pipe(
      catchError(() => of(null))
    );
  }
  
  // Cerrar sesión
  logout(): void {
    // Obtener el nombre del usuario antes de borrar los datos (si existe)
    let userName = '';
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        userName = user.name || '';
      }
    } catch (error) {
      console.error('Error al leer datos del usuario:', error);
    }
    
    // Eliminar token y datos del usuario
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userData');
    
    // Actualizar los subjects
    this.currentUserSubject.next(null);
    this.authStatusSource.next(false);
    
    // Comportamiento personalizado según la hora del día
    const hour = new Date().getHours();
    let message = 'Sesión cerrada exitosamente';
    let title = '';
    
    if (userName) {
      if (hour < 12) {
        title = `¡Que tengas un buen día, ${userName}!`;
      } else if (hour < 18) {
        title = `¡Buenas tardes, ${userName}!`;
      } else {
        title = `¡Buenas noches, ${userName}!`;
      }
    } else {
      title = 'Sesión cerrada exitosamente';
      message = 'Gracias por visitarnos';
    }
    
    // Mostrar mensaje de éxito personalizado
    this.toastr.success(message, title, { 
      timeOut: 3000, 
      progressBar: true 
    });
    
    // Redirigir al inicio
    this.router.navigate(['/']);
  }
  
  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    // Verificar expiración si se necesita
    try {
      const decoded = this.parseJwt(token);
      if (decoded && decoded.exp) {
        // exp está en segundos desde la época Unix
        return decoded.exp * 1000 > Date.now();
      }
    } catch (e) {
      console.error('Error al verificar expiración del token', e);
      return false;
    }
    
    return true;
  }

  // Obtener el token actual
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Decodificar un token JWT
  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error parsing JWT token', e);
      return null;
    }
  }

  // Obtener datos del usuario
  getUserData(): any {
    // Primero intentar obtener de userData (más completo)
    const userData = localStorage.getItem('userData');
    if (userData) return JSON.parse(userData);
    
    // Si no hay userData, intentar con user
    const user = localStorage.getItem('user');
    if (user) return JSON.parse(user);
    
    // Si ninguno existe, intentar extraer del token
    const token = this.getToken();
    if (token) {
      const decoded = this.parseJwt(token);
      return decoded;
    }
    
    return null;
  }

  // Obtener el ID del usuario actual
  getCurrentUserId(): number | null {
    const userData = this.getUserData();
    return userData ? userData.id : null;
  }

  // Verificar si el usuario tiene un rol específico
  hasRole(role: string): boolean {
    const userData = this.getUserData();
    if (!userData) return false;
    
    // El campo puede ser 'rol' o 'role' dependiendo de la fuente
    const userRole = userData.rol || userData.role;
    return userRole === role;
  }

  // Actualizar estado de autenticación
  updateAuthStatus(isAuthenticated: boolean): void {
    this.authStatusSource.next(isAuthenticated);
  }

  // Manejo de errores
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Error en la solicitud';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error) {
      errorMessage = error.error.msg || error.error.message || errorMessage;
    }
    console.error('❌ Error de autenticación:', error);
    return throwError(() => errorMessage);
  }
}