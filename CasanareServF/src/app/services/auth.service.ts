import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environment/environment';
import { user } from '../interfaces/user';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/api/users`;
  
  // BehaviorSubject para seguir el estado de autenticación
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;
  
  // Usar EventEmitter para notificar cambios en el estado de autenticación
  public authStatusChanged = new EventEmitter<boolean>();
  
  constructor(
    private http: HttpClient, 
    private router: Router, 
    private toastr: ToastrService, 
    private tokenService: TokenService
  ) {
    // NUEVO: Actualizar el estado de autenticación aquí, después de inyectar TokenService
    try {
      const isAuth = this.tokenService.hasToken();
      this.authStatusChanged.emit(isAuth);
    } catch (error) {
      console.error('Error al inicializar estado de autenticación:', error);
      this.authStatusChanged.emit(false);
    }
    
    // Inicializar el currentUserSubject aquí, después de TokenService
    this.currentUserSubject = new BehaviorSubject<any>(this.getUserData());
    this.currentUser = this.currentUserSubject.asObservable();
    
    // Intentar cargar el perfil de usuario al inicio si hay un token
    if (this.isAuthenticated()) {
      this.refreshUserProfile().subscribe();
    }
    console.log('AuthService inicializado');
  }

  // Registro de nuevos usuarios
  register(userData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}`, userData);
  }

  // Método de login para guardar la imagen de perfil
  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, credentials).pipe(
      tap(response => {
        if (response && response.token) {
          // Guardar token
          this.tokenService.setToken(response.token);
          
          // Guardar datos del usuario incluyendo la imagen de perfil
          if (response.user) {
            // Buscar imagen de perfil si existe en el objeto user
            let profileImage = null;
            
            // Si el usuario tiene un array de imágenes
            if (response.user.images && response.user.images.length > 0) {
              // Buscar la imagen principal
              const mainImage = response.user.images.find((img: any) => img.is_main);
              profileImage = mainImage ? mainImage.url : response.user.images[0].url;
            }
            // Si ya viene un campo profileImage, usarlo
            else if (response.user.profileImage) {
              profileImage = response.user.profileImage;
            }
            
            const userData = {
              id: response.user.id,
              name: response.user.name,
              email: response.user.email,
              rol: response.user.rol,
              profileImage: profileImage
            };
            
            // Guardar en localStorage y actualizar el BehaviorSubject
            localStorage.setItem('userData', JSON.stringify(userData));
            this.currentUserSubject.next(userData);
            
            // Emitir evento de cambio de autenticación
            this.authStatusChanged.emit(true);
          }
        }
      })
    );
  }

  // Obtener el perfil del usuario autenticado
  getUserProfile(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/profile`).pipe(
      tap(userProfile => {
        // Actualizar el perfil con la imagen si existe
        if (userProfile) {
          // Buscar imagen de perfil
          let profileImage = null;
          
          // Si el usuario tiene un array de imágenes
          if (userProfile.images && userProfile.images.length > 0) {
            // Buscar la imagen principal
            const mainImage = userProfile.images.find((img: any) => img.is_main);
            profileImage = mainImage ? mainImage.url : userProfile.images[0].url;
          }
          
          const updatedUserData = {
            ...this.getUserData(),
            profileImage: profileImage || userProfile.profileImage
          };
          
          // Actualizar datos en localStorage
          localStorage.setItem('userData', JSON.stringify(updatedUserData));
          this.currentUserSubject.next(updatedUserData);
        }
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
    this.tokenService.clearSession();
    localStorage.removeItem('userData'); // Asegurarnos de limpiar los datos del usuario
    this.currentUserSubject.next(null);
    this.authStatusChanged.emit(false);
    this.router.navigate(['/login']);
  }
  
  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    try {
      return this.tokenService.hasToken();
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      return false;
    }
  }

  // Método para obtener los datos del usuario
  getUserData(): any {
    const userData = localStorage.getItem('userData');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  }

  // Método para actualizar los datos del usuario en localStorage
  updateUserData(userData: any): void {
    // Obtener los datos actuales
    const currentData = this.getUserData();
    
    // Combinar con los nuevos datos
    const updatedData = { ...currentData, ...userData };
    
    // Guardar en localStorage
    localStorage.setItem('user', JSON.stringify(updatedData));
  }

  // Obtener el ID del usuario actual
  getCurrentUserId(): number | null {
    try {
      const userData = this.getUserData();
      return userData?.id || null;
    } catch (error) {
      console.error('Error al obtener ID de usuario:', error);
      return null;
    }
  }

  // Verificar si el usuario tiene un rol específico
  hasRole(role: string): boolean {
    const userData = this.getUserData();
    if (!userData) return false;
    
    // El campo puede ser 'rol' o 'role' dependiendo de la fuente
    const userRole = userData.rol || userData.role;
    return userRole === role;
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