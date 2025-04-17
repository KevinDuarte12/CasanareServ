import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';
  private readonly USER_DATA_KEY = 'userData';

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  // Método para decodificar el token JWT
  parseJwt(token: string): any {
    try {
      // Dividir el token en sus tres partes: header, payload, signature
      const base64Url = token.split('.')[1];
      // Convertir base64url a base64
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      // Decodificar la cadena base64
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      // Devolver el payload como un objeto
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error al parsear el token JWT:', error);
      return null;
    }
  }

  // Agregar este método a tu TokenService

  /**
   * Verifica si el token actual ha expirado
   * @returns true si el token está expirado, false en caso contrario
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    
    try {
      // Decodificar token
      const decoded = this.parseJwt(token);
      
      // Verificar si tiene campo de expiración (exp)
      if (!decoded.exp) return false;
      
      // Comparar con tiempo actual (exp está en segundos)
      const expirationDate = new Date(decoded.exp * 1000);
      const now = new Date();
      
      // Devolver true si el token ha expirado
      return expirationDate < now;
    } catch (e) {
      console.error('Error verificando expiración del token:', e);
      return true; // Por seguridad, asumir que expiró si hay error
    }
  }

  // Métodos para el manejo de usuario
  getUser(): any {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  setUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  // Métodos para el manejo de datos extendidos del usuario
  getUserData(): any {
    const userData = localStorage.getItem(this.USER_DATA_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  setUserData(userData: any): void {
    localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
  }

  removeUserData(): void {
    localStorage.removeItem(this.USER_DATA_KEY);
  }

  // Limpiar todos los datos de sesión
  clearSession(): void {
    this.removeToken();
    this.removeUser();
    this.removeUserData();
  }

  // Método adicional para renovar token si es necesario
  updateToken(newToken: string): void {
    if (newToken && newToken !== this.getToken()) {
      this.setToken(newToken);
    }
  }
}