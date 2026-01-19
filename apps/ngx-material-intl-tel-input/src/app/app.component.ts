import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { PhoneNumberFormat } from 'google-libphonenumber';
import { NgxMaterialIntlTelInputComponent } from 'ngx-material-intl-tel-input';

@Component({
  imports: [
    NgxMaterialIntlTelInputComponent,
    RouterOutlet,
    FormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule
  ],
  selector: 'ngx-material-intl-tel-input-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  // Signals pour l'état du formulaire
  phoneValue = signal<string>('');
  setPhoneInputValue = signal<string>('');
  currentPhoneValue = signal<string>('');
  currentCountryCode = signal<string>('');
  currentCountryISO = signal<string>('');
  submittedPhoneValue = signal<string>('');
  showSetPhoneInput = signal<boolean>(false);
  enableI18n = signal<boolean>(true);
  selectedLanguage = signal<string>('en');

  PhoneNumberFormat = PhoneNumberFormat;

  // Liste des langues disponibles
  availableLanguages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    // { code: 'es', label: 'Español' },
    { code: 'de', label: 'Deutsch' },
    { code: 'nl', label: 'Nederlands' }
  ];

  // Computed pour la validation du formulaire
  isFormValid = computed(() => {
    const phone = this.currentPhoneValue();
    return phone && phone.length > 0;
  });

  constructor(private translate: TranslateService) {
    // Définir la langue par défaut
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  switchLanguage(lang: string): void {
    this.selectedLanguage.set(lang);
    this.translate.use(lang);
  }

  toggleI18n(): void {
    this.enableI18n.update(v => !v);
  }

  getValue(value: string): void {
    this.currentPhoneValue.set(value);
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.isFormValid()) {
      return;
    }
    this.submittedPhoneValue.set(this.currentPhoneValue());
  }

  setPhone(): void {
    const newPhone = this.setPhoneInputValue();
    this.phoneValue.set(newPhone);
  }

  updateSetPhoneInput(value: string): void {
    this.setPhoneInputValue.set(value);
  }

  toggleShowSetPhoneInput(): void {
    this.showSetPhoneInput.set(!this.showSetPhoneInput());
  }

  resetForm(): void {
    this.phoneValue.set('');
    this.setPhoneInputValue.set('');
    this.currentPhoneValue.set('');
    this.currentCountryCode.set('');
    this.currentCountryISO.set('');
  }

  getCountryCode(value: string): void {
    this.currentCountryCode.set(value);
  }

  getCountryISO(value: string): void {
    this.currentCountryISO.set(value);
  }
}
