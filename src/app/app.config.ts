import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // anchorScrolling lets links like routerLink="/home" fragment="features"
    // jump straight to that section after navigating.
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled' }))
  ]
};