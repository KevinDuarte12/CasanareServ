// Importar los módulos necesarios
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import { Image } from '../interfaces/image';

@Injectable({
  providedIn: 'root'
})
export class ImageService {
  // URL base correcta
  private baseUrl = `${environment.apiUrl}/api/images`;

  constructor(private http: HttpClient) {
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
}