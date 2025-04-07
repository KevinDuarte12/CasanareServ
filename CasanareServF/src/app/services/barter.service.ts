import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Barter } from '../interfaces/barter';
import { environment } from '../../environment/environment';

@Injectable({
  providedIn: 'root'
})
export class BarterService {
  private myAppUrl: string;
  private myApiUrl: string;
  private headers = new HttpHeaders().set('Content-Type', 'application/json');

  constructor(private http: HttpClient) {
    this.myAppUrl = environment.endpoint;
    this.myApiUrl = 'api/barters/';
  }

  getBarters(): Observable<Barter[]> {
    return this.http.get<Barter[]>(`${this.myAppUrl}${this.myApiUrl}`);
  }

  getBarter(id: number): Observable<Barter> {
    return this.http.get<Barter>(`${this.myAppUrl}${this.myApiUrl}${id}`);
  }

  createBarter(barter: Barter): Observable<any> {
    return this.http.post(`${this.myAppUrl}${this.myApiUrl}`, barter, { headers: this.getAuthHeaders() });
  }

  updateBarterStatus(id: number, status: string): Observable<any> {
    console.log(`Actualizando barter ${id} con estado: ${status}`);
    
    // Asegúrate de que se esté enviando correctamente la estructura
    const payload = { status: status };
    console.log('Payload:', payload);
    
    return this.http.patch(
      `${this.myAppUrl}${this.myApiUrl}/${id}/status`, 
      payload, 
      { headers: this.getAuthHeaders() }
    );
  }

  deleteBarter(id: number): Observable<any> {
    return this.http.delete(`${this.myAppUrl}${this.myApiUrl}${id}`, { headers: this.getAuthHeaders() });
  }

  // Helper method to get authentication headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return this.headers.set('Authorization', `Bearer ${token}`);
  }
}