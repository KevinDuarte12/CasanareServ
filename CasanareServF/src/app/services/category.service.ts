import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category } from '../interfaces/category'; // Importa la interfaz Category para tipar los datos
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private myAppUrl: string;
  private myApiUrl: string;
  private headers = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(private http: HttpClient) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/categories/';
  }

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.myAppUrl}${this.myApiUrl}`);
  }

  getCategory(id: number): Observable<Category> {
    return this.http.get<Category>(`${this.myAppUrl}${this.myApiUrl}${id}`);
  }

  createCategory(category: Category): Observable<any> {
    return this.http.post(`${this.myAppUrl}${this.myApiUrl}`, category, { headers: this.getAuthHeaders() });
  }

  updateCategory(id: number, category: Category): Observable<any> {
    return this.http.put(`${this.myAppUrl}${this.myApiUrl}${id}`, category, { headers: this.getAuthHeaders() });
  }

  deleteCategory(id: number): Observable<any> {
    return this.http.delete(`${this.myAppUrl}${this.myApiUrl}${id}`, { headers: this.getAuthHeaders() });
  }

  toggleCategoryStatus(id: number): Observable<any> {
    return this.http.patch(`${this.myAppUrl}${this.myApiUrl}${id}/toggle-status`, {}, { headers: this.getAuthHeaders() });
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return this.headers.set('Authorization', `Bearer ${token}`);
  }
}
