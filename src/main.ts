import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { routes } from './app/app.routes';

// bootstrapApplication(AppComponent, appConfig)
//   .catch((err) => console.error(err));
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, 
      // This is the correct way to enable scrolling in a standalone router
      withInMemoryScrolling({ 
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      })
    )
  ]
}).catch(err => console.error(err));