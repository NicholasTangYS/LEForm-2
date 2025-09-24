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

  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { username, password }).pipe(
      tap((res: any) => {
        this.setTokens(res.accessToken, res.refreshToken);
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

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setTokens(access: string, refresh: string) {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
  }

  isTokenExpired(): boolean {
    const token = this.getAccessToken();
    if (!token) return true;

    const decoded: any = jwtDecode(token);
    const exp = decoded.exp * 1000;
    return Date.now() > exp;
  }
}
