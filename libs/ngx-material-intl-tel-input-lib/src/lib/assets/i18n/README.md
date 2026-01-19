# Internationalization (i18n) for ngx-material-intl-tel-input

This directory contains translation files for the phone input component.

## Available Languages

- `en.json` - English
- `fr.json` - French

## Usage

### 1. Setup @ngx-translate in your app

```typescript
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@Component({
  imports: [
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  // ...
})
export class AppComponent {
  constructor(private translate: TranslateService) {
    // Set default language
    translate.setDefaultLang('en');
    // Use a language
    translate.use('fr');
  }
}
```

### 2. Copy translation files to your assets

Copy `en.json` and `fr.json` to your app's `assets/i18n/` directory.

### 3. Enable i18n in the component

```html
<ngx-material-intl-tel-input
  [enableI18n]="true"
  <!-- other props -->
></ngx-material-intl-tel-input>
```

### 4. Switch languages dynamically

```typescript
export class MyComponent {
  constructor(private translate: TranslateService) {}

  switchLanguage(lang: string) {
    this.translate.use(lang);
  }
}
```

## Translation Keys

All translation keys are prefixed with `NGX_MAT_INTL_TEL_INPUT`:

- `MAIN_LABEL` - Main label for the component
- `CODE_PLACEHOLDER` - Placeholder for country code select
- `SEARCH_PLACEHOLDER` - Placeholder for country search
- `NO_ENTRIES_FOUND` - Message when no countries match search
- `NATIONAL_NUMBER_LABEL` - Label for phone number input
- `HINT_LABEL` - Hint text below the input
- `INVALID_NUMBER_ERROR` - Error message for invalid phone number
- `REQUIRED_ERROR` - Error message for required field
- `NUMBER_TOO_LONG_ERROR` - Error message for phone number too long

## Custom Translations

You can override default translations by providing custom `textLabels`:

```html
<ngx-material-intl-tel-input
  [enableI18n]="true"
  [textLabels]="{
    mainLabel: 'Custom Phone Label',
    invalidNumberError: 'Please enter a valid number'
  }"
></ngx-material-intl-tel-input>
```

When `enableI18n` is `true`, the component will:
1. First try to get translations from `@ngx-translate`
2. Fall back to custom `textLabels` if translation key is missing
3. Fall back to default English labels if both are missing

## Adding New Languages

To add a new language:

1. Create a new JSON file (e.g., `de.json` for German)
2. Copy the structure from `en.json`
3. Translate all values
4. Copy the file to your app's `assets/i18n/` directory
5. Configure the language in your app's TranslateModule

Example for German (`de.json`):

```json
{
  "NGX_MAT_INTL_TEL_INPUT": {
    "MAIN_LABEL": "Telefonnummer",
    "CODE_PLACEHOLDER": "Code",
    "SEARCH_PLACEHOLDER": "Suchen",
    "NO_ENTRIES_FOUND": "Keine Länder gefunden",
    "NATIONAL_NUMBER_LABEL": "Nummer",
    "HINT_LABEL": "Land auswählen und Telefonnummer eingeben",
    "INVALID_NUMBER_ERROR": "Nummer ist ungültig",
    "REQUIRED_ERROR": "Dieses Feld ist erforderlich",
    "NUMBER_TOO_LONG_ERROR": "Telefonnummer ist zu lang"
  }
}
```
