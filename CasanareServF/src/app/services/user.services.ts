import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent } from '@angular/common/http';
import { environment } from '../../environment/environment';
import { user } from '../interfaces/user';
import { Image } from '../interfaces/image';
import { Observable, throwError, of } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { TokenService } from './token.service';
import { CartService } from './cart.service';
import { ImageService } from './image.service';
import { ToastrService } from 'ngx-toastr'; // Añadir esta importación
import { Router } from '@angular/router'; // Añadir esta importación
import { AuthService } from './auth.service'; // Añadir esta importación

/**
 * Interfaz que define la estructura de respuesta de un inicio de sesión exitoso
 * Incluye el token JWT, información del usuario, tiempo de expiración y mensaje de confirmación
 */
interface LoginResponse {
  token: string;      // Token JWT para autenticar peticiones posteriores
  user: user;         // Datos del usuario autenticado
  expiresIn: number;  // Tiempo de expiración del token en segundos
  msg: string;        // Mensaje informativo del resultado de la operación
}

// Definir la interfaz para la respuesta de Cloudinary
interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  url?: string;
  asset_id?: string;
  resource_type?: string;
  format?: string;
  // otros campos que pueda tener la respuesta
}

/**
 * Servicio que gestiona todas las operaciones relacionadas con usuarios:
 * - Registro e inicio de sesión
 * - Consulta y modificación de datos de usuario
 * - Autenticación y autorización
 * - Verificación de correo y recuperación de contraseña
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {
  // URL base para todas las peticiones a la API, se configura desde variables de entorno
  private baseApiUrl: string;

  /**
   * Constructor que inicializa las dependencias y normaliza la URL base
   * @param http Cliente HTTP para realizar peticiones al backend
   * @param tokenService Servicio para gestionar tokens JWT y datos de sesión
   * @param cartService Servicio para gestionar el carrito de compras del usuario
   */
  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private cartService: CartService,
    private imageService: ImageService, // Añadir esta línea
    private toastr: ToastrService, // Añadir esta línea
    private router: Router, // Añadir esta línea
    private authService: AuthService // Añadir esta línea
  ) {
    // Normaliza la URL base para evitar problemas con barras duplicadas al concatenar paths
    this.baseApiUrl = environment.apiUrl.endsWith('/')
      ? environment.apiUrl.slice(0, -1)
      : environment.apiUrl;

    // Registro informativo de la URL base configurada para debugging
    console.log('🌐 URL base de API configurada:', this.baseApiUrl);
  }

  /**
   * Construye URLs correctas asegurando que no haya duplicación de prefijos '/api'
   * @param path Ruta relativa a añadir después de la URL base
   * @returns URL completa y normalizada para realizar la petición
   */
  private buildUrl(path: string): string {
    // Elimina 'api/' si existe al principio para evitar duplicación
    const cleanPath = path.replace(/^api\//, '');

    // Asegura que el path comience con barra para la concatenación correcta
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;

    // Construye la URL final combinando base y ruta
    const url = `${this.baseApiUrl}${normalizedPath}`;
    console.log(`🔗 URL construida: ${url}`);
    return url;
  }

  /**
   * Prepara las opciones de petición HTTP añadiendo el token de autenticación
   * si está disponible. Crucial para rutas protegidas en el backend.
   * @param options Opciones base para la petición HTTP (headers, params, etc)
   * @returns Opciones modificadas con el token añadido si existe
   */
  private getAuthOptions(options: any = {}): any {
    // Obtiene el token actual del servicio de tokens
    const token = this.tokenService.getToken();

    // Si no hay token, devuelve las opciones originales y advierte
    if (!token) {
      console.warn('Solicitud sin token de autenticación');
      return options;
    }

    // Retorna opciones con cabecera de Authorization añadida
    return {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
      }
    };
  }

  /**
   * Registra un nuevo usuario en el sistema
   * @param user Datos del nuevo usuario a registrar
   * @returns Observable con la respuesta del registro
   */
  signIn(user: user): Observable<any> {
    // Realiza una petición POST al endpoint de creación de usuarios
    return this.http.post<any>(this.buildUrl('users'), user);
  }

 /**
 * Autentica a un usuario y gestiona el estado de sesión
 * @param user Credenciales del usuario (email/usuario y contraseña)
 * @returns Observable con los datos de sesión y usuario autenticado
 */
login(user: any): Observable<LoginResponse> {
  console.log('🔐 Iniciando login para:', user.email);
  
  return this.http.post<LoginResponse>(this.buildUrl('users/login'), user)
    .pipe(
      // ✅ VALIDAR RESPUESTA ANTES DE GUARDAR DATOS
      map((response: LoginResponse) => {
        console.log('📥 Respuesta del servidor:', response);
        
        // 🔍 VERIFICAR QUE LA RESPUESTA SEA VÁLIDA
        if (!response || !response.token || !response.user) {
          console.error('❌ Respuesta de login inválida:', response);
          throw new Error('Respuesta de login inválida del servidor');
        }
        
        // 🔍 VERIFICAR ESTADO DEL USUARIO (redundancia de seguridad)
        if (response.user.isVerified === false) {
          console.warn('⚠️ Usuario no verificado detectado en frontend');
          throw new Error('UNVERIFIED_USER');
        }
        
        // ✅ SOLO SI TODO ESTÁ BIEN, GUARDAR DATOS
        console.log('✅ Login válido, guardando datos de sesión');
        this.tokenService.setToken(response.token);
        this.tokenService.setUser(response.user);
        return response;
      }),
      
      // 🔄 PROCESAR CARRITO PENDIENTE SOLO PARA LOGINS EXITOSOS
      switchMap(response => {
        const pendingItems = this.cartService.getPendingItems();
        if (pendingItems && pendingItems.length > 0) {
          console.log(`🛒 Procesando ${pendingItems.length} items pendientes en el carrito`);
          return this.cartService.processPendingCart().pipe(
            tap(cartResponse => {
              console.log('✅ Carrito pendiente procesado:', cartResponse);
            }),
            map(() => response) // Devolver respuesta original
          );
        }
        return of(response);
      }),
      
      // 🚨 MANEJO ESPECÍFICO DE ERRORES
      catchError(error => {
        console.error('❌ Error en login:', error);
        
        // Limpiar cualquier dato que se haya guardado por error
        this.tokenService.removeToken();
        this.tokenService.removeUser();
        
        // 🔍 IDENTIFICAR TIPO ESPECÍFICO DE ERROR
        if (error.status === 401) {
          if (error.error?.code === 'UNVERIFIED_USER') {
            console.log('🚫 Usuario no verificado - rechazando login');
            // Crear error específico para usuario no verificado
            const unverifiedError = {
              status: 401,
              error: {
                code: 'UNVERIFIED_USER',
                msg: 'Debes verificar tu cuenta antes de iniciar sesión. Revisa tu correo electrónico.',
                needsVerification: true
              }
            };
            return throwError(() => unverifiedError);
          } else {
            console.log('🚫 Credenciales inválidas');
          }
        }
        
        // Para otros errores, propagar tal como vienen
        return throwError(() => error);
      })
    );
}

  /**
   * Obtiene la lista de todos los usuarios (típicamente solo para administradores)
   * @returns Observable con array de usuarios del sistema
   */
  getUsers(): Observable<user[]> {
    return this.http.get<user[]>(this.buildUrl('users'));
  }

  /**
   * Obtiene información detallada de un usuario específico por su ID
   * @param id Identificador único del usuario
   * @returns Observable con datos del usuario solicitado
   */
  getUser(id: number): Observable<user> {
    // Realiza petición GET con opciones de autenticación
    return this.http.get<user>(
      this.buildUrl(`users/${id}`),
      this.getAuthOptions()
    ).pipe(
      // Procesa la respuesta para asegurar formato correcto de datos
      map((response: any) => {
        // Si la respuesta ya es el objeto usuario, lo devuelve directamente
        if (response && (response.id || response.name || response.email)) {
          return response as user;
        }
        // Si es una respuesta HTTP completa, extrae el cuerpo
        if (response && response.body) {
          return response.body as user;
        }
        // Si no hay datos reconocibles, devuelve objeto vacío
        return {} as user;
      }),
      // Manejo de errores centralizado
      catchError(error => {
        console.error(`Error obteniendo usuario ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Método alternativo para obtener usuario por ID con nombre más explícito
   * @param id Identificador único del usuario
   * @returns Observable con datos del usuario
   */
  getUserById(id: number): Observable<user> {
    // Reutiliza el método getUser para mantener consistencia
    return this.getUser(id);
  }

  /**
   * Actualiza información de un usuario existente
   * @param id Identificador del usuario a actualizar
   * @param userData Datos nuevos o modificados del usuario
   * @returns Observable con la respuesta de la operación
   */
  updateUser(id: number, userData: Partial<user>): Observable<any> {
    console.log(`Actualizando usuario ${id} con datos:`, userData);

    // Envía petición PUT con datos y opciones de autenticación
    return this.http.put<any>(
      this.buildUrl(`users/${id}`),
      userData,
      this.getAuthOptions()
    ).pipe(
      // Registra resultado exitoso sin modificar la respuesta
      tap(response => console.log(`Usuario ${id} actualizado correctamente:`, response)),
      // Asegura que el tipo de retorno sea consistente
      map(response => response),
      // Manejo de errores centralizado
      catchError(error => {
        console.error(`Error actualizando usuario ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina o desactiva un usuario del sistema
   * @param id Identificador del usuario a eliminar
   * @param hardDelete Si es true, elimina físicamente; si es false, solo desactiva
   * @returns Observable con resultado de la operación
   */
  deleteUser(id: number, hardDelete: boolean = false): Observable<any> {
    // Construye URL con parámetro opcional para eliminación física
    const url = this.buildUrl(`users/${id}${hardDelete ? '?hard=true' : ''}`);

    console.log(`Eliminando usuario ${id}${hardDelete ? ' (eliminación física)' : ' (desactivación)'}`);

    // Realiza petición DELETE con autenticación
    return this.http.delete<any>(
      url,
      this.getAuthOptions()
    ).pipe(
      // Registra éxito sin modificar respuesta
      tap(() => console.log(`Usuario ${id} eliminado correctamente`)),
      // Manejo de errores centralizado
      catchError(error => {
        console.error(`Error eliminando usuario ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verifica el correo electrónico de un usuario usando el token enviado por email
   * @param token Token único para verificación de email
   * @returns Observable con resultado de la verificación
   */
  verifyEmail(token: string): Observable<any> {
    console.log('📤 Enviando solicitud de verificación con token:', token);

    // Construye URL específica para verificación de email
    const verifyUrl = `${this.baseApiUrl}/users/verify?token=${encodeURIComponent(token)}`;
    console.log('🔗 URL de verificación final:', verifyUrl);

    // Configuración específica para esta petición
    return this.http.get(verifyUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      responseType: 'json'
    }).pipe(
      // Registra resultado exitoso
      tap(response => console.log('✅ Respuesta de verificación:', response)),
      // Manejo avanzado de errores con mensajes personalizados
      catchError(error => {
        console.error('❌ Error de verificación:', error);

        // Genera mensaje de error apropiado según el tipo de error
        let errorMessage = 'Error al verificar tu cuenta';
        if (error.error && error.error.msg) {
          errorMessage = error.error.msg;
        } else if (error.status === 401) {
          errorMessage = 'Token no válido o expirado';
        } else if (error.status === 0) {
          errorMessage = 'No se pudo conectar con el servidor';
        }

        // Devuelve error con mensaje estructurado para UI
        return throwError(() => ({ error: { msg: errorMessage } }));
      })
    );
  }

  /**
   * Inicia el proceso de recuperación de contraseña
   * @param email Correo electrónico del usuario que olvidó su contraseña
   * @returns Observable con respuesta del proceso
   */
  forgotPassword(email: string): Observable<any> {
    return this.http.post(this.buildUrl('users/forgot-password'), { email });
  }

  /**
   * Completa el proceso de restablecimiento de contraseña
   * @param token Token de verificación enviado al email del usuario
   * @param newPassword Nueva contraseña elegida por el usuario
   * @returns Observable con resultado de la operación
   */
  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(this.buildUrl('users/reset-password'), { token, newPassword });
  }

  /**
   * @param userData Datos a actualizar, incluida la contraseña para verificación
  @returns Observable con la respuesta
   */
  updateUserProfileWithPassword(userData: any): Observable<any> {
    console.log(`Actualizando perfil de usuario con verificación de contraseña`);
    
    return this.http.put<any>(
      this.buildUrl(`users/profile`),
      userData,
      this.getAuthOptions()
    ).pipe(
      tap(response => console.log('Perfil actualizado correctamente:', response)),
      catchError(error => {
        console.error('Error al actualizar perfil:', error);
        
        // Manejar el error 401 de forma especial para no cerrar sesión automáticamente excepto en caso de forceLogout
        if (error.status === 401 && error.error?.forceLogout === true) {
          this.toastr.error('Demasiados intentos fallidos. Por seguridad, su sesión será cerrada.');
          // Esperar un momento para que el usuario vea el mensaje
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(['/login']);
          }, 1500);
        }
        
        // Siempre propagar el error para que el componente lo maneje
        return throwError(() => error);
      })
    );
  }

  /**
   * Sube una imagen de perfil para el usuario autenticado
   * @param userId ID del usuario al que pertenece la imagen
   * @param formData Formulario con la imagen a subir
   * @returns Observable con la respuesta del servidor
   */
  uploadProfileImage(userId: number, formData: FormData): Observable<any> {
    // Extraer el archivo de imagen del FormData
    const imageFile = formData.get('image') as File;
    if (!imageFile) {
      return throwError(() => new Error('No se proporcionó ninguna imagen'));
    }
    
    // Delegar al método en ImageService
    return this.imageService.uploadProfileImage(userId, imageFile);
  }

  // Reemplazar los métodos getUserProfile y getUserInfo con uno solo:
  getUserProfile(): Observable<any> {
    return this.http.get<any>(
      this.buildUrl('users/profile'),
      this.getAuthOptions()
    ).pipe(
      map((response: any) => {
        // Asegurarnos de que estamos trabajando con el cuerpo de la respuesta
        const userData = response.body || response;
        
        // Procesamiento de imagen de perfil
        if (userData.userImages && userData.userImages.length > 0) {
          const mainImage = userData.userImages.find((img: any) => img.is_main);
          userData.profileImage = mainImage ? mainImage.url : userData.userImages[0].url;
        }
        
        // Actualizar datos en localStorage
        this.updateUserInStorage(userData);
        
        return userData;
      }),
      catchError(error => {
        console.error('Error obteniendo información de usuario:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para actualizar datos del usuario en localStorage
  private updateUserInStorage(userData: any): void {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      
      // Actualizar datos básicos
      user.name = userData.name || user.name;
      user.email = userData.email || user.email;
      user.phone = userData.phone || user.phone;
      user.department = userData.department || user.department;
      user.city = userData.city || user.city;
      user.document_type = userData.document_type || user.document_type;
      user.document_number = userData.document_number || user.document_number;
      
      // Actualizar imagen de perfil
      if (userData.profileImage) {
        user.profileImage = userData.profileImage;
      } else if (userData.userImages && userData.userImages.length > 0) {
        const mainImage = userData.userImages.find((img: any) => img.is_main);
        user.profileImage = mainImage ? mainImage.url : userData.userImages[0].url;
      }
      
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  /**
   * Actualiza el perfil del usuario actual (el autenticado)
   * @param userData - Datos del usuario a actualizar
   * @returns Observable con la respuesta del servidor
   */
  updateUserProfile(userData: any): Observable<any> {
    console.log('Actualizando perfil de usuario actual con datos:', userData);
    return this.http.put<any>(
      this.buildUrl('users/profile'),
      userData,
      this.getAuthOptions()
    ).pipe(
      tap(response => {
        console.log('✅ Perfil actualizado correctamente:', response);
      }),
      catchError(error => {
        console.error('❌ Error al actualizar perfil:', error);
        return throwError(() => error);
      })
    );
  }
}