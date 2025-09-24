import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, RouterModule } from '@angular/router';

import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TokenInterceptor } from './auth/token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(), // Add this
    // provideFormsModule(), // Add this
    FormsModule ,
    ReactiveFormsModule ,
    RouterModule,
    { provide: HTTP_INTERCEPTORS, useClass: TokenInterceptor, multi: true }
  ]
};
// function provideFormsModule(): import("@angular/core").Provider | import("@angular/core").EnvironmentProviders {
//   throw new Error('Function not implemented.');
// }

