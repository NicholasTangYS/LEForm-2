// src/app/auth/token.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable, throwError, switchMap, catchError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {
  private isRefreshing = false;

  constructor(private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;
    const token = this.auth.getAccessToken();

    if (token) {
      authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` }
      });
    }

    return next.handle(authReq).pipe(
      catchError(error => {
        if (error.status === 401 && !this.isRefreshing) {
          this.isRefreshing = true;
          return this.auth.refreshToken().pipe(
            switchMap((res: any) => {
              this.isRefreshing = false;
              return next.handle(
                req.clone({
                  setHeaders: { Authorization: `Bearer ${res.accessToken}` }
                })
              );
            }),
            catchError(err => {
              this.isRefreshing = false;
              this.auth.logout();
              return throwError(() => err);
            })
          );
        }
        return throwError(() => error);
      })
    );
  }
}
