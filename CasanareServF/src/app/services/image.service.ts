// Importar los módulos necesarios
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators'; // Añadir 'tap'
import { environment } from '../../environment/environment';
import { Image } from '../interfaces/image';
import { TokenService } from './token.service'; // Importar TokenService

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  // URL base correcta
  private baseUrl = `${environment.apiUrl}/api/images`;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService // Inyectar TokenService
  ) {
    console.log('ImageService inicializado con URL base:', this.baseUrl);
  }

  /**
   * Genera headers HTTP con token de autenticación para solicitudes JSON
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`
    });
  }

  // Subir una imagen
  uploadImage(imageFile: File, entityType: string, entityId: number, isMain: boolean = false): Observable<any> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId.toString());
    formData.append('is_main', isMain.toString());

    console.log(`Subiendo imagen para ${entityType} ID: ${entityId}, isMain: ${isMain}`);
    
    // MODIFICAR ESTA LÍNEA - Cambiar la URL para usar /upload
    return this.http.post<any>(`${this.baseUrl}/upload`, formData).pipe(
      catchError(error => {
        console.error('Error en uploadImage:', error);
        return throwError(() => new Error(error.error?.message || 'Error al subir imagen'));
      })
    );
  }

  // Obtener imágenes por entidad
  getImagesByEntity(entityType: string, entityId: number): Observable<Image[]> {
    return this.http.get<Image[]>(`${this.baseUrl}/${entityType}/${entityId}`).pipe(
      catchError(error => {
        console.error('Error en getImagesByEntity:', error);
        return throwError(() => new Error(error.error?.message || 'Error al obtener imágenes'));
      })
    );
  }

  // Método para eliminar una imagen
  deleteImage(imageId: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${imageId}`).pipe(
      catchError(error => {
        console.error('Error en deleteImage:', error);
        return throwError(() => new Error(error.error?.message || 'Error al eliminar imagen'));
      })
    );
  }

  // Método para establecer una imagen como principal
  setMainImage(imageId: number): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${imageId}/main`, {}).pipe(
      catchError(error => {
        console.error('Error en setMainImage:', error);
        return throwError(() => new Error(error.error?.message || 'Error al establecer imagen principal'));
      })
    );
  }

  // Método para obtener imágenes de un producto específico
  getProductImages(productId: number): Observable<Image[]> {
    return this.http.get<Image[]>(`${this.baseUrl}/product/${productId}`).pipe(
      catchError(error => {
        console.error('Error obteniendo imágenes del producto:', error);
        return of([]); // Devolver array vacío en caso de error
      })
    );
  }

  /**
   * Obtiene todas las imágenes asociadas a una categoría
   */
  getCategoryImages(categoryId: number): Observable<Image[]> {
    return this.http.get<Image[]>(`${this.baseUrl}/category/${categoryId}`).pipe(
      catchError(error => {
        console.error('Error al obtener imágenes de categoría:', error);
        return of([]); // Devolver array vacío en caso de error
      })
    );
  }

  /**
   * Sube una imagen para una categoría
   */
  uploadCategoryImage(categoryId: number, imageFile: File, isMain: boolean = true): Observable<Image> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('entity_id', categoryId.toString());
    formData.append('entity_type', 'category');
    formData.append('is_main', isMain.toString());
    
    // Ya es correcto, no necesita cambios si ya está usando /upload
    return this.http.post<any>(`${this.baseUrl}/upload`, formData, {
      headers: this.getAuthHeadersForFileUpload()
    }).pipe(
      map(response => response.image),
      catchError(error => {
        console.error('Error al subir imagen de categoría:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Elimina una imagen de categoría
   */
  deleteCategoryImage(imageId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${imageId}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error al eliminar imagen de categoría:', error);
        return throwError(() => error);
      })
    );
  }

  // Método para headers de autenticación cuando se suben archivos
  private getAuthHeadersForFileUpload(): HttpHeaders {
    const token = localStorage.getItem('token');
    
    // Para FormData no incluimos Content-Type, el navegador lo establece automáticamente
    return new HttpHeaders({
      'Authorization': `Bearer ${token || ''}`
    });
  }

  /**
   * Sube una imagen de perfil para un usuario
   * @param userId ID del usuario
   * @param imageFile Archivo de imagen a subir
   * @returns Observable con la respuesta del servidor incluyendo la URL de la imagen
   */
  uploadProfileImage(userId: number | undefined, imageFile: File): Observable<any> {
    // Verificar que userId no sea undefined antes de continuar
    if (userId === undefined) {
      console.error('Error: userId es undefined en uploadProfileImage');
      return throwError(() => new Error('ID de usuario no definido'));
    }
    
    console.log(`Subiendo imagen de perfil para usuario ${userId}`);
    
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('entity_type', 'user');
    formData.append('entity_id', userId.toString());
    formData.append('is_main', 'true');
    
    // Log de debug para verificar el contenido de FormData
    console.log('Datos de FormData:', {
      tieneImagen: !!imageFile,
      nombreImagen: imageFile.name,
      entity_type: 'user',
      entity_id: userId,
      is_main: true
    });
    
    return this.http.post<any>(`${this.baseUrl}/upload`, formData, {
      headers: this.getAuthHeadersForFileUpload()
    }).pipe(
      map(response => {
        console.log('Respuesta exitosa de subida:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error al subir imagen de perfil:', error);
        return throwError(() => new Error(error.error?.message || 'Error al subir la imagen de perfil'));
      })
    );
  }

  /**
   * Sube múltiples imágenes para un tipo de entidad
   * @param entityType Tipo de entidad ('product', 'barter', 'user', etc.)
   * @param entityId ID de la entidad
   * @param files Array de archivos de imagen a subir
   * @param mainIndex Índice de la imagen que debe marcarse como principal (-1 si ninguna)
   * @returns Observable con la respuesta que contiene las URLs de las imágenes
   */
  uploadMultipleImages(entityType: string, entityId: number, files: File[], mainIndex: number = -1): Observable<any> {
    if (!files || files.length === 0) {
      return throwError(() => new Error('No se proporcionaron archivos para subir'));
    }

    const formData = new FormData();
    
    // Añadir cada archivo al FormData con el mismo nombre de campo
    files.forEach(file => {
      formData.append('images', file);
    });
    
    // Añadir información sobre el tipo de entidad y su ID
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId.toString());
    
    // Añadir el índice de la imagen principal si se especificó
    if (mainIndex >= 0) {
      formData.append('main_index', mainIndex.toString());
    }

    // Log para debugging
    console.log(`Subiendo ${files.length} imágenes para ${entityType} ID: ${entityId}, imagen principal: ${mainIndex}`);

    return this.http.post(
      `${this.baseUrl}/upload-multiple`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${this.tokenService.getToken() || ''}`
        }
      }
    ).pipe(
      tap(response => console.log('Respuesta de subida múltiple:', response)),
      catchError(error => {
        console.error('Error al subir múltiples imágenes:', error);
        return throwError(() => error);
      })
    );
  }
}