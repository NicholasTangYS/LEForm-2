// src/app/auth/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { baseUrl } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = baseUrl; // change to your backend

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((res: any) => {
        this.setTokens(res.accessToken, res.refreshToken);
        if (res.userID) {
            localStorage.setItem('user_id', res.userID);
        }
      })
    );
  }

    register(name: string, contact: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { name, contact, email, password }).pipe(
      tap((res: any) => {
        //show success message and redirect to login
        // alert('Registration successful! Please log in.');
        
        this.router.navigate(['/login']);
        // this.setTokens(res.accessToken, res.refreshToken);
      })
    );
  }
  refreshToken(): Observable<any> {
    const refresh = localStorage.getItem('refresh_token');
    return this.http.post(`${this.apiUrl}/refresh`, { refreshToken: refresh }).pipe(
      tap((res: any) => {
        this.setTokens(res.accessToken, res.refreshToken);
      })
    );
  }

  getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    // ⭐ NEW: Remove the user ID on logout
    localStorage.removeItem('id'); 
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setTokens(access: string, refresh: string) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    try {
      const decoded: any = jwtDecode(access);
      // Assuming your backend stores the User ID in the token payload 
      // under a key like 'userId', 'sub' (subject), or '_id'.
      // You must check your backend's token structure. Let's assume 'userId'.
      if (decoded.userId) { 
        localStorage.setItem('id', decoded.id);
      }
    } catch (e) {
      console.error('Failed to decode access token:', e);
      // Handle error (e.g., if the token is invalid)
    }
  }

  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    const decoded: any = jwtDecode(token);
    const exp = decoded.exp * 1000;
    return Date.now() > exp;
  }

  setProjectId(id: any): void {
    // Using sessionStorage allows the ID to persist through a page reload
    sessionStorage.setItem('activeProjectId', id);
  }

  /**
   * Gets the project ID and clears it from storage to prevent reuse.
   * @returns The project ID, or null if not found.
   */
  getProjectId(): any {
    const id = sessionStorage.getItem('activeProjectId');
    if (id) {
      sessionStorage.removeItem('activeProjectId'); // Clear after reading
    }
    return id;
  }
}
