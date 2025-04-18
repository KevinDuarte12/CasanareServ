import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Category } from '../interfaces/category';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private myAppUrl: string;
  private myApiUrl: string;

  constructor(private http: HttpClient) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/categories/';
  }

  /**
   * IMPORTANTE: Este método es clave para resolver el problema
   * Crea nuevos HttpHeaders con el token de autenticación
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }

    // Si no hay token, simplemente devolvemos los headers básicos
    return headers;
  }

  getCategories(): Observable<Category[]> {
    // Listado general sin requisito de autenticación
    return this.http.get<Category[]>(`${this.myAppUrl}${this.myApiUrl}`).pipe(
      catchError(error => {
        console.error('Error al obtener categorías:', error);
        return throwError(() => error);
      })
    );
  }


  getCategory(id: number): Observable<Category> {
    // MODIFICADO: Marcamos esta operación como pública con un parámetro
    const params = new HttpParams().set('publicAccess', 'true');

    // Intentamos usar headers de autenticación si están disponibles,
    // pero no fallamos si no lo están
    return this.http.get<Category>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
      {
        headers: this.getAuthHeaders(),
        params: params
      }
    ).pipe(
      tap(data => console.log('Categoría obtenida:', data)),
      catchError(error => {
        console.error(`Error al obtener categoría ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  createCategory(category: Category): Observable<any> {
    // Importante: Usar el mismo formato para todas las operaciones
    return this.http.post(
      `${this.myAppUrl}${this.myApiUrl}`,
      category,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error('Error al crear categoría:', error);
        return throwError(() => error);
      })
    );
  }

  updateCategory(id: number, category: Partial<Category>): Observable<any> {
    console.log(`Enviando solicitud para actualizar categoría ${id}`, category);
    console.log('Token utilizado:', localStorage.getItem('token')?.substring(0, 15) + '...');

    // CORREGIDO: Usar myAppUrl y myApiUrl en lugar de apiUrl
    return this.http.put<any>(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
      category,
      { headers: this.getAuthHeaders() }
    ).pipe(
      tap(response => console.log('Respuesta de actualización:', response)),
      catchError(error => {
        console.error(`Error al actualizar categoría ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(
      `${this.myAppUrl}${this.myApiUrl}${id}`,
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error al eliminar categoría ${id}:`, error);
        return throwError(() => error);
      })
    );
  }

  toggleCategoryStatus(id: number): Observable<any> {
    return this.http.patch(
      `${this.myAppUrl}${this.myApiUrl}${id}/toggle-status`,
      {},
      { headers: this.getAuthHeaders() }
    ).pipe(
      catchError(error => {
        console.error(`Error al cambiar estado de categoría ${id}:`, error);
        return throwError(() => error);
      })
    );
  }
}
