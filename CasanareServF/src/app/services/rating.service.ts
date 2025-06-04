import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environment/environment';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  
  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) { }

  /**
   * Corrige el método buildUrl para depurar mejor las URLs
   */
  private buildUrl(path: string): string {
    const baseApiUrl = environment.apiUrl.endsWith('/')
      ? environment.apiUrl.slice(0, -1)
      : environment.apiUrl;
    
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const fullUrl = `${baseApiUrl}/api/${cleanPath}`;
    
    console.log('URL construida para API:', fullUrl);
    return fullUrl;
  }

  /**
   * ✅ RENOMBRAR: getAuthOptions a getAuthHeaders para consistencia
   */
  private getAuthHeaders(): { [key: string]: string } {
    const token = this.tokenService.getToken();
    const headers: { [key: string]: string } = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Crear una nueva calificación para un producto
   */
  createRating(ratingData: any): Observable<any> {
    console.log('Enviando calificación a:', this.buildUrl('ratings'));
    console.log('Datos:', ratingData);
    console.log('Token presente:', !!this.tokenService.getToken());
    
    // ✅ DETECTAR si es FormData (con imágenes) o JSON (sin imágenes)
    const isFormData = ratingData instanceof FormData;
    
    const headers = this.getAuthHeaders(); // ✅ USAR método unificado
    
    // ✅ IMPORTANTE: NO agregar Content-Type para FormData
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    
    console.log('Tipo de datos:', isFormData ? 'FormData (con imágenes)' : 'JSON (sin imágenes)');
    
    return this.http.post(
      this.buildUrl('ratings'), 
      ratingData,
      { headers }
    ).pipe(
      tap(response => console.log('Respuesta del servidor:', response)),
      catchError(error => {
        console.error('Error detallado:', error);
        throw error;
      })
    );
  }

  /**
   * Obtener las calificaciones de un producto
   */
  getProductRatings(productId: number): Observable<any> {
    return this.http.get(this.buildUrl(`ratings/product/${productId}`));
  }

  /**
   * Obtener calificaciones recibidas por un usuario
   */
  getUserRatings(userId: number): Observable<any> {
    return this.http.get(this.buildUrl(`ratings/user/${userId}`));
  }

  /**
   * ✅ CORREGIR: Eliminar una calificación
   */
  deleteRating(ratingId: number): Observable<any> {
    console.log('🗑️ Eliminando calificación:', ratingId);
    
    return this.http.delete(this.buildUrl(`ratings/${ratingId}`), {
      headers: this.getAuthHeaders() // ✅ USAR método corregido
    }).pipe(
      tap(response => console.log('✅ Calificación eliminada:', response)),
      catchError(error => {
        console.error('❌ Error al eliminar calificación:', error);
        throw error;
      })
    );
  }
}