import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, RouterModule } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(), // Add this
    // provideFormsModule(), // Add this
    FormsModule ,
    ReactiveFormsModule ,
    RouterModule
  ]
};
// function provideFormsModule(): import("@angular/core").Provider | import("@angular/core").EnvironmentProviders {
//   throw new Error('Function not implemented.');
// }

