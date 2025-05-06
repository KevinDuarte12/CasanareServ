import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { user } from '../interfaces/user';
import { Image } from '../interfaces/image'; // Importa la interfaz Image
import { Observable, throwError,of } from 'rxjs';
import { map, tap, catchError,switchMap } from 'rxjs/operators';
import { TokenService } from './token.service';
import { CartService } from './cart.service';

interface LoginResponse {
  token: string;
  user: user;
  expiresIn: number;
  msg: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Usar apiUrl como base que ya incluye el prefijo /api
  private baseApiUrl: string;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private cartService: CartService
  ) {
    // Normalizar la URL base para evitar barras duplicadas
    this.baseApiUrl = environment.apiUrl.endsWith('/') 
      ? environment.apiUrl.slice(0, -1) 
      : environment.apiUrl;
    
    console.log('🌐 URL base de API configurada:', this.baseApiUrl);
  }

  // Método helper para construir URLs correctamente
  private buildUrl(path: string): string {
    // Asegurarse de que el path no tenga 'api/' al inicio para evitar duplicación
    const cleanPath = path.replace(/^api\//, '');
    
    // Asegurarse de que el path comience con barra
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    
    const url = `${this.baseApiUrl}${normalizedPath}`;
    console.log(`🔗 URL construida: ${url}`);
    return url;
  }

  /**
   * Asegura que las solicitudes al backend incluyan el token de autenticación
   * @param options Opciones adicionales para la solicitud HTTP
   */
  private getAuthOptions(options: any = {}): any {
    // Verificar si hay token disponible
    const token = this.tokenService.getToken();
    
    if (!token) {
      console.warn('Solicitud sin token de autenticación');
      return options;
    }
    
    // Agregar el token a las cabeceras
    return {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    };
  }

  signIn(user: user): Observable<any> {
    return this.http.post<any>(this.buildUrl('users'), user);
  }

  login(user: any): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.buildUrl('users/login'), user)
      .pipe(
        map((response: LoginResponse) => {
          this.tokenService.setToken(response.token);
          this.tokenService.setUser(response.user);
          return response;
        }),
        // Después de login exitoso, verificar si hay items pendientes
        switchMap(response => {
          // Verificar si hay items pendientes en el carrito
          const pendingItems = this.cartService.getPendingItems();
          if (pendingItems && pendingItems.length > 0) {
            console.log(`Procesando ${pendingItems.length} items pendientes en el carrito`);
            // Procesar items pendientes y luego devolver la respuesta original
            return this.cartService.processPendingCart().pipe(
              tap(cartResponse => {
                console.log('Resultado de procesar carrito pendiente:', cartResponse);
              }),
              // Continuar con la respuesta original del login
              map(() => response)
            );
          }
          // Si no hay items pendientes, simplemente devolver la respuesta original
          return of(response);
        }),
        catchError(error => {
          console.error('Error en login:', error);
          return throwError(() => error);
        })
      );
  }

  getUsers(): Observable<user[]> {
    return this.http.get<user[]>(this.buildUrl('users'));
  }

  // Corrige el método getUser para que devuelva el tipo correcto
  /**
   * Obtiene un usuario por su ID
   * @param id ID del usuario a obtener
   * @returns Observable con datos del usuario
   */
  getUser(id: number): Observable<user> {
    return this.http.get<user>(
      this.buildUrl(`users/${id}`),
      this.getAuthOptions()
    ).pipe(
      // Usar el operador HttpResponse para asegurar que estamos trabajando con la respuesta final
      map((response: any) => {
        // Si la respuesta ya es el objeto usuario, devolverlo directamente
        if (response && (response.id || response.name || response.email)) {
          return response as user;
        }
        // Si es un HttpResponse<user>, extraer el body
        if (response && response.body) {
          return response.body as user;
        }
        // Devolver una respuesta vacía en caso de que no se encuentren datos
        return {} as user;
      }),
      catchError(error => {
        console.error(`Error obteniendo usuario ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtiene un usuario por su ID
   * @param id ID del usuario a obtener
   * @returns Observable con datos del usuario
   */
  getUserById(id: number): Observable<user> {
    // Este método es una forma más clara de invocar getUser
    return this.getUser(id);
  }

  // Y lo mismo para updateUser
  /**
   * Actualiza un usuario existente
   * @param id ID del usuario a actualizar
   * @param userData Datos actualizados del usuario
   * @returns Observable con respuesta de actualización
   */
  updateUser(id: number, userData: Partial<user>): Observable<any> {
    console.log(`Actualizando usuario ${id} con datos:`, userData);
    
    return this.http.put<any>(
      this.buildUrl(`users/${id}`),
      userData,
      this.getAuthOptions()
    ).pipe(
      // El operador tap para logging sin modificar el stream
      tap(response => console.log(`Usuario ${id} actualizado correctamente:`, response)),
      // Asegurar que el tipo de retorno sea correcto
      map(response => response),
      catchError(error => {
        console.error(`Error actualizando usuario ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina un usuario del sistema
   * @param id ID del usuario a eliminar
   * @param hardDelete Si es true, elimina físicamente al usuario y todos sus datos relacionados
   * @returns Observable con la respuesta
   */
  deleteUser(id: number, hardDelete: boolean = false): Observable<any> {
    const url = this.buildUrl(`users/${id}${hardDelete ? '?hard=true' : ''}`);
    
    console.log(`Eliminando usuario ${id}${hardDelete ? ' (eliminación física)' : ' (desactivación)'}`);
    
    return this.http.delete<any>(
      url,
      this.getAuthOptions()
    ).pipe(
      tap(() => console.log(`Usuario ${id} eliminado correctamente`)),
      catchError(error => {
        console.error(`Error eliminando usuario ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  verifyEmail(token: string): Observable<any> {
    console.log('📤 Enviando solicitud de verificación con token:', token);
    
    // Construir la URL correcta hacia el backend
    const verifyUrl = `${this.baseApiUrl}/users/verify?token=${encodeURIComponent(token)}`;
    console.log('🔗 URL de verificación final:', verifyUrl);
    
    // Usar opciones explícitas para esta solicitud
    return this.http.get(verifyUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      responseType: 'json'
    }).pipe(
      tap(response => console.log('✅ Respuesta de verificación:', response)),
      catchError(error => {
        console.error('❌ Error de verificación:', error);
        
        let errorMessage = 'Error al verificar tu cuenta';
        if (error.error && error.error.msg) {
          errorMessage = error.error.msg;
        } else if (error.status === 401) {
          errorMessage = 'Token no válido o expirado';
        } else if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor';
        }
        
        return throwError(() => ({ error: { msg: errorMessage } }));
      })
    );
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(this.buildUrl('users/forgot-password'), { email });
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(this.buildUrl('users/reset-password'), { token, newPassword });
  }

  getUserInfo(): Observable<any> {
    // Usar la URL construida correctamente
    return this.http.get<any>(this.buildUrl('users/profile'))
      .pipe(
        tap((userData) => {
          if (userData) {
            // Procesar las imágenes si existen
            if (userData.userImages && userData.userImages.length > 0) {
              const mainImage = userData.userImages.find((img: Image) => img.is_main);
              userData.profileImage = mainImage ? mainImage.url : userData.userImages[0].url;
            }
            
            this.tokenService.setUserData({
              id: userData.id,
              name: userData.name,
              email: userData.email,
              rol: userData.rol,
              profileImage: userData.profileImage,
              userImages: userData.userImages
            });
            console.log('✅ Datos de usuario guardados:', userData);
          }
        }),
        catchError(error => {
          console.error('❌ Error obteniendo información de usuario:', error);
          
          if (error.status === 401) {
            this.tokenService.clearSession();
          }
          
          return throwError(() => error);
        })
      );
  }
}