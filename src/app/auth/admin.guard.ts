// src/app/auth/admin.guard.ts
//
// Re-uses the same logic as AppComponent (le_user.admin === 1) so admin-only
// routes are gated by the exact same flag the sidebar already toggles on.
// Result is cached in-memory for the lifetime of the page to avoid hitting
// /getUserDetails on every navigation.

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay } from 'rxjs';
import { AuthService } from './auth.service';
import { baseUrl } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  private adminCheck$: Observable<boolean> | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  canActivate(): Observable<boolean> | boolean {
    // Must be logged in first
    if (!this.auth.getAccessToken() || this.auth.isTokenExpired()) {
      this.router.navigate(['/login']);
      return false;
    }

    const userId = this.auth.getUserId();
    if (!userId) {
      this.router.navigate(['/login']);
      return false;
    }

    // Cache the lookup for this page session
    if (!this.adminCheck$) {
      this.adminCheck$ = this.http
        .get<any[]>(`${baseUrl}/getUserDetails/${userId}`)
        .pipe(
          map(userData => userData?.length > 0 && userData[0].admin === 1),
          catchError(() => of(false)),
          shareReplay(1)
        );
    }

    return this.adminCheck$.pipe(
      map(isAdmin => {
        if (!isAdmin) {
          this.router.navigate(['/dashboard']);
          return false;
        }
        return true;
      })
    );
  }
}
