import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product } from '../interfaces/product';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private myAppUrl: string;
  private myApiUrl: string;
  private headers = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(private http: HttpClient) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/products/';
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.myAppUrl}${this.myApiUrl}`);
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.myAppUrl}${this.myApiUrl}${id}`);
  }

  createProduct(product: Product): Observable<any> {
    return this.http.post(`${this.myAppUrl}${this.myApiUrl}`, product, { headers: this.getAuthHeaders() });
  }

  updateProduct(id: number, product: Product): Observable<any> {
    return this.http.put(`${this.myAppUrl}${this.myApiUrl}${id}`, product, { headers: this.getAuthHeaders() });
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.myAppUrl}${this.myApiUrl}${id}`, { headers: this.getAuthHeaders() });
  }

  changeProductStatus(id: number, newStatus: 'disponible' | 'vendido' | 'en_trueque'): Observable<any> {
    return this.http.patch(`${this.myAppUrl}${this.myApiUrl}${id}/status`, { newStatus }, { headers: this.getAuthHeaders() });
  }

  // Helper method to get authentication headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return this.headers.set('Authorization', `Bearer ${token}`);
  }
}