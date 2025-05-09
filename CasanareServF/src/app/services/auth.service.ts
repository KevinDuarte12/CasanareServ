import { Injectable, EventEmitter } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environment/environment';
import { user } from '../interfaces/user';
import { ToastrService } from 'ngx-toastr';
import { TokenService } from './token.service';
import { CartService } from './cart.service';
import { Cart, CartItem } from '../interfaces/cart';

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
    private tokenService: TokenService,
    private cartService: CartService // Inyectar el servicio del carrito
    
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

  // Modificar el método login para mantener el flujo de navegación
  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/login`, credentials).pipe(
      tap(response => {
        if (response && response.token) {
          // Guardar token y datos de usuario
          this.tokenService.setToken(response.token);
          
          if (response.user) {
            // Guardar datos del usuario
            const userData = {
              id: response.user.id,
              name: response.user.name,
              email: response.user.email,
              rol: response.user.rol,
              profileImage: this.getProfileImage(response.user)
            };
            
            localStorage.setItem('userData', JSON.stringify(userData));
            this.currentUserSubject.next(userData);
            this.authStatusChanged.emit(true);
          }
        }
      }),
      // Después del login exitoso, procesar items pendientes
      switchMap(response => {
        const pendingItems = this.cartService.getPendingItems();
        if (pendingItems && pendingItems.length > 0) {
          // Procesar items pendientes
          return this.cartService.processPendingCart().pipe(
            tap(() => {
              this.toastr.success('Los productos pendientes se han agregado a tu carrito');
            }),
            // Devolver la respuesta original del login
            map(() => response)
          );
        }
        
        // Añadir información de redirección a la respuesta
        // pero mantener la respuesta original para compatibilidad
        const redirectUrl = localStorage.getItem('redirectAfterLogin');
        const pendingAction = localStorage.getItem('pendingAction');
        
        if (redirectUrl) {
          response.redirectInfo = {
            url: redirectUrl,
            action: pendingAction
          };
        }
        
        return of(response);
      }),
      catchError(error => {
        console.error('Error en login:', error);
        return throwError(() => error);
      })
    );
  }

  private getProfileImage(user: any): string | null {
    if (user.images && user.images.length > 0) {
      const mainImage = user.images.find((img: any) => img.is_main);
      return mainImage ? mainImage.url : user.images[0].url;
    }
    return user.profileImage || null;
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
    this.cartService.getCart().subscribe({
      next: (cart) => {
        if (cart && cart.items && cart.items.length > 0) {
          const itemsToPend = cart.items.map((item: CartItem) => ({
            id_product: item.product?.id_product ?? 0,
            quantity: item.quantity
          }));
          
          // Verificar que haya items válidos para guardar
          if (itemsToPend.some(item => item.id_product !== 0)) {
            // Limpiar items pendientes anteriores
            this.cartService.clearPendingItems();
            // Guardar nuevos items pendientes
            localStorage.setItem('pendingCartItems', JSON.stringify(itemsToPend));
          }
        }
        
        // Proceder con el logout normal
        this.tokenService.clearSession();
        localStorage.removeItem('userData');
        this.currentUserSubject.next(null);
        this.authStatusChanged.emit(false);
        this.router.navigate(['/login']);
      },
      error: () => {
        // Si hay error, proceder con el logout normal
        this.tokenService.clearSession();
        localStorage.removeItem('userData');
        this.currentUserSubject.next(null);
        this.authStatusChanged.emit(false);
        this.router.navigate(['/login']);
      }
    });
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

  // Método para guardar la URL de redirección
  // Este método se llamará desde el componente de detalle del producto
  saveRedirectUrl(url: string, action: string = ''): void {
    localStorage.setItem('redirectAfterLogin', url);
    if (action) {
      localStorage.setItem('pendingAction', action);
    }
  }

  // Método para obtener y limpiar la información de redirección
  // Este método se llamará desde el componente de login
  getAndClearRedirectInfo(): { url: string | null, action: string | null } {
    const url = localStorage.getItem('redirectAfterLogin');
    const action = localStorage.getItem('pendingAction');
    
    // Limpiar datos guardados
    localStorage.removeItem('redirectAfterLogin');
    localStorage.removeItem('pendingAction');
    
    return { url, action };
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