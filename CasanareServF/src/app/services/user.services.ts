import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { user } from '../interfaces/user';
import { Image } from '../interfaces/image'; // Importa la interfaz Image
import { Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { TokenService } from './token.service';

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
    private tokenService: TokenService
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
    return this.http.get(this.buildUrl(`users/verify?token=${token}`));
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