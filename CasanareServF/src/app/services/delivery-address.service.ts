import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { TokenService } from './token.service';
import { DeliveryAddress } from '../interfaces/deliveryAddress';

@Injectable({
  providedIn: 'root'
})
export class DeliveryAddressService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) { }

  // Obtener headers de autenticación
  private getAuthOptions() {
    const token = this.tokenService.getToken();
    return {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
  }

  // Obtener todas las direcciones del usuario
  getUserAddresses(): Observable<DeliveryAddress[]> {
    return this.http.get<DeliveryAddress[]>(
      `${this.apiUrl}/api/addresses`,
      this.getAuthOptions()
    );
  }

  // Obtener una dirección específica
  getAddress(id: number): Observable<DeliveryAddress> {
    return this.http.get<DeliveryAddress>(
      `${this.apiUrl}/api/addresses/${id}`,
      this.getAuthOptions()
    );
  }

  // Crear una nueva dirección
  createAddress(address: DeliveryAddress): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/api/addresses`,
      address,
      this.getAuthOptions()
    );
  }

  // Actualizar una dirección existente
  updateAddress(id: number, address: DeliveryAddress): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/api/addresses/${id}`,
      address,
      this.getAuthOptions()
    );
  }

  // Eliminar una dirección
  deleteAddress(id: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/api/addresses/${id}`,
      this.getAuthOptions()
    );
  }

  // Establecer una dirección como predeterminada
  setDefaultAddress(id: number): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/api/addresses/${id}/default`,
      {},
      this.getAuthOptions()
    );
  }
}
