import {
  provideHttpClient,
  withFetch,
  withInterceptorsFromDi
} from '@angular/common/http';
import {
  ApplicationConfig,
  LOCALE_ID,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import {
  COUNTRY_NAME_OVERRIDES,
  CountryNameOverrides
} from 'ngx-material-intl-tel-input';
import { appRoutes } from './app.routes';

const englishCountryOverrides: CountryNameOverrides = {
  US: 'United States of America',
  MX: 'United Mexican States'
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    provideZonelessChangeDetection(),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    {
      provide: COUNTRY_NAME_OVERRIDES,
      useValue: englishCountryOverrides
    }
  ]
};
