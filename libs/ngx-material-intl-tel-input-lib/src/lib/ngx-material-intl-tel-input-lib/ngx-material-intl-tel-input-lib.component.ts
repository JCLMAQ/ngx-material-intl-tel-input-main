import { AsyncPipe, NgClass } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  MatFormFieldAppearance
} from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_SELECT_CONFIG,
  MatSelect,
  MatSelectModule
} from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IMaskModule } from 'angular-imask';
import {
  PhoneNumber,
  PhoneNumberFormat,
  PhoneNumberType,
  PhoneNumberUtil
} from 'google-libphonenumber';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { PhoneIconComponent } from '../components/phone-icon/phone-icon.component';
import { CountryCode } from '../data/country-code';
import { CountryISO } from '../enums/country-iso.enum';
import { CountryDataService } from '../services/country-data/country-data.service';
import { GeoIpService } from '../services/geo-ip/geo-ip.service';
import { Country } from '../types/country.model';
import { GeoData } from '../types/geo.type';
import { TextLabels } from '../types/text-labels.type';
import { getMaxPhoneNumberLength } from '../utils/phone-number.utils';

// Interface pour l'état du formulaire téléphone
interface TelFormState {
  prefix: Country | null;
  number: string;
}

@Component({
  selector: 'ngx-material-intl-tel-input',
  templateUrl: './ngx-material-intl-tel-input-lib.component.html',
  styleUrl: './ngx-material-intl-tel-input-lib.component.scss',
  imports: [
    AsyncPipe,
    FormsModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    NgClass,
    MatInputModule,
    MatTooltipModule,
    PhoneIconComponent,
    IMaskModule,
    TranslateModule
  ],
  providers: [
    CountryCode,
    {
      provide: MAT_SELECT_CONFIG,
      useValue: { overlayPanelClass: 'tel-mat-select-pane' }
    },
    GeoIpService,
    CountryDataService
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NgxMaterialIntlTelInputComponent
  implements OnInit, AfterViewInit
{
  private readonly countryCodeData = inject(CountryCode);
  private readonly geoIpService = inject(GeoIpService);
  private readonly countryDataService = inject(CountryDataService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  // ViewChild references
  singleSelect = viewChild<MatSelect>('singleSelect');
  numberInput = viewChild<ElementRef>('numberInput');

  // État du formulaire avec signals
  private readonly telFormState = signal<TelFormState>({
    prefix: null,
    number: ''
  });

  // Signals pour le filtre de recherche de pays
  protected readonly searchFilter = signal<string>('');

  // Computed signals pour accéder aux parties de l'état
  protected readonly selectedPrefix = computed(() => this.telFormState().prefix);
  protected readonly phoneNumber = computed(() => this.telFormState().number);

  // Signal pour la liste des pays filtrés
  protected readonly filteredCountries = computed(() => {
    const search = this.normalizeSearchValue(this.searchFilter());
    if (!search) {
      return this.allCountries;
    }
    return this.allCountries.filter(
      (country) =>
        this.normalizeSearchValue(country?.name).indexOf(search) > -1
    );
  });

  // Signal pour le numéro formaté final
  protected readonly formattedPhoneNumber = computed(() => {
    const state = this.telFormState();
    const number = state.number;
    const prefix = state.prefix;

    if (!number) {
      return '';
    }

    let value = '';
    if (
      prefix?.dialCode &&
      !this.includeDialCode() &&
      prefix?.iso2 !== 'mp'
    ) {
      value = '+' + prefix.dialCode + number;
    } else {
      value = number;
    }

    try {
      const parsed = this.phoneNumberUtil.parse(value, prefix?.iso2);
      return this.phoneNumberUtil.format(parsed, this.outputNumberFormat());
    } catch {
      return value;
    }
  });

  // Signal pour la validation
  protected readonly validationError = computed(() => {
    if (!this.numberValidation()) {
      return null;
    }

    const phone = this.formattedPhoneNumber();
    const prefix = this.selectedPrefix();

    if (!phone || !prefix) {
      return null;
    }

    try {
      const parsed = this.phoneNumberUtil.parse(phone, prefix.iso2);
      if (!this.phoneNumberUtil.isValidNumber(parsed)) {
        return { invalidPhoneNumber: true };
      }
      return null;
    } catch {
      return { invalidPhoneNumber: true };
    }
  });

  // Computed signals pour les labels traduits
  protected readonly translatedLabels = computed(() => {
    // Forcer la réévaluation quand la langue change
    this.translationUpdate();

    if (!this.enableI18n()) {
      return this.textLabels();
    }

    const getTranslation = (key: string, fallback?: string) => {
      const translation = this.translate.instant(key);
      return translation !== key ? translation : (fallback || '');
    };

    return {
      mainLabel: getTranslation('NGX_MAT_INTL_TEL_INPUT.MAIN_LABEL', this.textLabels().mainLabel),
      codePlaceholder: getTranslation('NGX_MAT_INTL_TEL_INPUT.CODE_PLACEHOLDER', this.textLabels().codePlaceholder),
      searchPlaceholderLabel: getTranslation('NGX_MAT_INTL_TEL_INPUT.SEARCH_PLACEHOLDER', this.textLabels().searchPlaceholderLabel),
      noEntriesFoundLabel: getTranslation('NGX_MAT_INTL_TEL_INPUT.NO_ENTRIES_FOUND', this.textLabels().noEntriesFoundLabel),
      nationalNumberLabel: getTranslation('NGX_MAT_INTL_TEL_INPUT.NATIONAL_NUMBER_LABEL', this.textLabels().nationalNumberLabel),
      hintLabel: getTranslation('NGX_MAT_INTL_TEL_INPUT.HINT_LABEL', this.textLabels().hintLabel),
      invalidNumberError: getTranslation('NGX_MAT_INTL_TEL_INPUT.INVALID_NUMBER_ERROR', this.textLabels().invalidNumberError),
      requiredError: getTranslation('NGX_MAT_INTL_TEL_INPUT.REQUIRED_ERROR', this.textLabels().requiredError),
      numberTooLongError: getTranslation('NGX_MAT_INTL_TEL_INPUT.NUMBER_TOO_LONG_ERROR', this.textLabels().numberTooLongError)
    };
  });

  // Propriétés publiques
  allCountries: Country[] = [];
  phoneNumberUtil = PhoneNumberUtil.getInstance();

  // Inputs
  required = model<boolean>(false);
  disabled = model<boolean>(false);
  appearance = input<MatFormFieldAppearance>('fill');
  enablePlaceholder = input<boolean>(true);
  autoIpLookup = input<boolean>(true);
  autoSelectCountry = input<boolean>(true);
  autoSelectedCountry = input<CountryISO | string>('');
  numberValidation = input<boolean>(true);
  iconMakeCall = input<boolean>(true);
  initialValue = model<string>('');
  enableSearch = input<boolean>(true);
  includeDialCode = input<boolean>(false);
  emojiFlags = input<boolean>(false);
  hidePhoneIcon = input<boolean>(false);
  localizeCountryNames = input<boolean>(false);
  preferredCountries = input<(CountryISO | string)[]>([]);
  visibleCountries = input<(CountryISO | string)[]>([]);
  excludedCountries = input<(CountryISO | string)[]>([]);
  enableI18n = input<boolean>(false);
  textLabels = input<TextLabels>({
    mainLabel: 'Phone number',
    codePlaceholder: 'Code',
    searchPlaceholderLabel: 'Search',
    noEntriesFoundLabel: 'No countries found',
    nationalNumberLabel: 'Number',
    hintLabel: 'Select country and type your phone number',
    invalidNumberError: 'Number is not valid',
    requiredError: 'This field is required',
    numberTooLongError: 'Phone number is too long'
  });
  mainLabel = input<string>('');
  useMask = input<boolean>(false);
  forceSelectedCountryCode = input<boolean>(false);
  showMaskPlaceholder = input<boolean>(false);
  outputNumberFormat = input<
    | PhoneNumberFormat.E164
    | PhoneNumberFormat.INTERNATIONAL
    | PhoneNumberFormat.RFC3966
  >(PhoneNumberFormat.INTERNATIONAL);
  enableInputMaxLength = input<boolean>(true);

  // Outputs
  currentValue = output<string>();
  currentCountryCode = output<string>();
  currentCountryISO = output<string>();

  // UI state signals
  isFocused = signal<boolean>(false);
  isLoading = signal<boolean>(true);

  // Signal pour forcer la mise à jour des traductions
  private readonly translationUpdate = signal<number>(0);

  constructor() {
    // Effect pour mettre à jour les traductions quand la langue change
    effect(() => {
      if (this.enableI18n()) {
        // S'abonner aux changements de langue avec nettoyage automatique
        this.translate.onLangChange
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            this.translationUpdate.update(v => v + 1);
          });
      }
    });

    // Effect pour propager les changements du numéro formaté
    effect(() => {
      const formatted = this.formattedPhoneNumber();
      this.currentValue.emit(formatted);
    });

    // Effect pour propager le code pays
    effect(() => {
      const prefix = this.selectedPrefix();
      this.currentCountryCode.emit(
        prefix?.dialCode ? `+${prefix.dialCode}` : ''
      );
      this.currentCountryISO.emit(prefix?.iso2 || '');
    });

    // Effect pour gérer le focus quand le préfixe change
    effect(() => {
      const prefix = this.selectedPrefix();
      if (prefix && !this.isLoading()) {
        setTimeout(() => {
          this.numberInput()?.nativeElement?.focus();
        });
      }
    });

    // Effect pour initialiser le dial code si includeDialCode
    effect(() => {
      const prefix = this.selectedPrefix();
      if (this.includeDialCode() && prefix?.dialCode) {
        const currentNumber = this.phoneNumber();
        if (!currentNumber.startsWith('+' + prefix.dialCode)) {
          this.updateNumber('+' + prefix.dialCode);
        }
      }
    });
  }

  ngOnInit(): void {
    this.fetchCountryData();
    setTimeout(() => {
      this.setInitialTelValue();
    });
  }

  ngAfterViewInit(): void {
    this.setInitialPrefixValue();
  }

  /**
   * Fetches country data and populates the allCountries array.
   */
  protected fetchCountryData(): void {
    const processedCountries = this.countryDataService.processCountries(
      this.countryCodeData,
      this.enablePlaceholder(),
      this.includeDialCode(),
      this.visibleCountries(),
      this.preferredCountries(),
      this.excludedCountries(),
      this.useMask(),
      this.forceSelectedCountryCode(),
      this.showMaskPlaceholder(),
      this.outputNumberFormat(),
      this.localizeCountryNames()
    );
    this.allCountries = processedCountries;
  }

  /**
   * Performs a geo IP lookup and sets the prefix based on the country retrieved.
   */
  private geoIpLookup(): void {
    this.geoIpService.geoIpLookup().subscribe({
      next: (data: GeoData) => {
        const country =
          this.allCountries?.find(
            (c) => c.iso2 === data.country_code?.toLowerCase()
          ) || null;
        if (country) {
          this.updatePrefix(country);
        } else {
          this.setAutoSelectedCountry();
        }
      },
      error: () => {
        this.setAutoSelectedCountry();
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Sets the initial value after the filteredCountries are loaded initially
   */
  protected setInitialPrefixValue(): void {
    const singleSelectInstance = this.singleSelect();
    if (singleSelectInstance) {
      singleSelectInstance.compareWith = (a: Country, b: Country) =>
        a && b && a.iso2 === b.iso2;
    }
  }

  /**
   * Normalizes the search value by trimming whitespace, converting to lowercase,
   * and removing diacritics.
   */
  private normalizeSearchValue(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    let normalizedValue = value.toString().trim().toLocaleLowerCase();
    try {
      normalizedValue = normalizedValue.normalize('NFD');
    } catch {
      // ignore if normalize is not supported
    }
    return normalizedValue.replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Handles focus event for the input.
   */
  onInputFocus(): void {
    this.isFocused.set(true);
  }

  /**
   * Handles blur event for the input.
   */
  onInputBlur(): void {
    this.isFocused.set(false);
  }

  /**
   * Updates the phone number in the state.
   */
  onNumberChange(value: string): void {
    const inputElement = this.numberInput()?.nativeElement;
    const cursorPosition = inputElement?.selectionStart;

    this.updateNumber(value);

    // Restore cursor position after formatting
    if (inputElement && cursorPosition !== null) {
      const prefix = this.selectedPrefix();
      if (prefix) {
        try {
          const fullNumber = this.includeDialCode()
            ? value
            : `+${prefix.dialCode}${value}`;
          const parsed = this.phoneNumberUtil.parse(fullNumber, prefix.iso2);
          const formatted = this.phoneNumberUtil.format(
            parsed,
            this.includeDialCode()
              ? this.outputNumberFormat()
              : PhoneNumberFormat.NATIONAL
          );
          this.setCursorPosition(inputElement, cursorPosition, parsed, value);
        } catch {
          // Invalid number, don't adjust cursor
        }
      }
    }
  }

  /**
   * Updates the selected country prefix.
   */
  onPrefixChange(country: Country): void {
    this.updatePrefix(country);
  }

  /**
   * Updates the search filter.
   */
  onSearchChange(value: string): void {
    this.searchFilter.set(value);
  }

  /**
   * Updates the prefix in the state.
   */
  private updatePrefix(prefix: Country | null): void {
    this.telFormState.update(state => ({ ...state, prefix }));
  }

  /**
   * Updates the number in the state.
   */
  private updateNumber(number: string): void {
    this.telFormState.update(state => ({ ...state, number }));
  }

  /**
   * Sets the initial telephone value based on the initial value.
   */
  private setInitialTelValue(): void {
    if (!this.initialValue()) {
      if (this.autoSelectCountry()) {
        if (this.autoIpLookup()) {
          this.geoIpLookup();
        } else {
          this.setAutoSelectedCountry();
          this.isLoading.set(false);
        }
      } else {
        this.isLoading.set(false);
      }
    } else {
      try {
        const parsedNumber = this.phoneNumberUtil.parse(this.initialValue());
        const countryCode = parsedNumber.getCountryCode();
        const country = this.allCountries?.find((c) => {
          if (c.dialCode === countryCode?.toString()) {
            if (c.areaCodes) {
              return c.areaCodes?.find((ac) =>
                parsedNumber.getNationalNumber()?.toString().startsWith(ac)
              );
            } else if (c.priority === 0) {
              return c;
            }
          }
          return undefined;
        });

        if (country) {
          this.updatePrefix(country);
        }

        const formattedOnlyNumber = this.phoneNumberUtil.format(
          parsedNumber,
          this.includeDialCode() || country?.iso2 === 'mp'
            ? this.outputNumberFormat()
            : PhoneNumberFormat.NATIONAL
        );

        if (formattedOnlyNumber) {
          this.updateNumber(formattedOnlyNumber);
        }
      } catch {
        this.updateNumber(this.initialValue());
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  /**
   * Set the auto selected country based on the specified criteria.
   */
  private setAutoSelectedCountry(): void {
    const autoSelectedCountry = this.allCountries?.find(
      (country) => country?.iso2 === this.autoSelectedCountry()
    );

    if (autoSelectedCountry) {
      this.updatePrefix(autoSelectedCountry);
    } else {
      const defaultCountry = this.allCountries?.find(
        (country) => country?.iso2 === CountryISO.Spain
      );
      if (defaultCountry) {
        this.updatePrefix(defaultCountry);
      } else {
        this.updatePrefix(this.allCountries?.[0] || null);
      }
    }
  }

  /**
   * Sets the cursor position after formatting.
   */
  private setCursorPosition(
    inputElement: HTMLInputElement,
    cursorPosition: number,
    parsed: PhoneNumber,
    currentValue: string
  ): void {
    if (!this.numberValidation()) {
      return;
    }

    const nationalNumber = this.phoneNumberUtil.format(
      parsed,
      this.includeDialCode()
        ? this.outputNumberFormat()
        : PhoneNumberFormat.NATIONAL
    );

    const newCursorPosition = this.adjustCursorPosition(
      cursorPosition,
      currentValue,
      nationalNumber
    );

    setTimeout(() => {
      inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  }

  /**
   * Adjusts the cursor position accounting for formatting changes.
   */
  private adjustCursorPosition(
    originalPosition: number,
    oldValue: string,
    newValue: string
  ): number {
    let cursorPosition = originalPosition;
    const spaceCountBefore = this.countSpacesBeforePosition(
      oldValue,
      originalPosition
    );
    const spaceCountAfter = this.countSpacesBeforePosition(
      newValue,
      cursorPosition
    );

    cursorPosition += spaceCountAfter - spaceCountBefore;

    if (originalPosition === oldValue.length) {
      return newValue.length;
    }

    cursorPosition = Math.max(0, Math.min(cursorPosition, newValue.length));
    return cursorPosition;
  }

  /**
   * Counts spaces before a position in a string.
   */
  private countSpacesBeforePosition(value: string, position: number): number {
    return value
      .slice(0, position)
      .split('')
      .filter((char) => char === ' ').length;
  }

  /**
   * Gets the maximum input length for a given country code.
   */
  getMaxInputLength = (countryCode?: string): number => {
    if (!countryCode) {
      return 25;
    }

    try {
      const baseMaxLength = getMaxPhoneNumberLength(countryCode);
      const currentValue = this.phoneNumber();

      const isCurrentNumberValid = this.isCurrentNumberValidAndFormatted(
        currentValue,
        countryCode
      );

      if (isCurrentNumberValid) {
        const formattingBuffer = this.calculateFormattingBuffer(
          countryCode,
          baseMaxLength
        );
        const safetyMargin = this.calculateSafetyMargin();
        return baseMaxLength + formattingBuffer + safetyMargin;
      } else {
        let minimalBuffer = this.includeDialCode() ? 4 : 2;

        if (
          this.includeDialCode() &&
          this.outputNumberFormat() === PhoneNumberFormat.RFC3966
        ) {
          minimalBuffer = 8;
        }

        return baseMaxLength + minimalBuffer;
      }
    } catch {
      const baseMaxLength = getMaxPhoneNumberLength(countryCode);
      return baseMaxLength + 3;
    }
  };

  private isCurrentNumberValidAndFormatted = (
    currentValue: string,
    countryCode: string
  ): boolean => {
    if (!currentValue || currentValue.length < 3) {
      return false;
    }

    try {
      const prefix = this.selectedPrefix();
      const fullNumber = this.includeDialCode()
        ? currentValue
        : `+${prefix?.dialCode}${currentValue}`;

      const parsedNumber = this.phoneNumberUtil.parse(fullNumber, countryCode);
      const isValid = this.phoneNumberUtil.isValidNumber(parsedNumber);
      const hasFormatting = /[\s\-()]/.test(currentValue);

      return isValid && hasFormatting;
    } catch {
      return false;
    }
  };

  private calculateSafetyMargin = (): number => {
    let safetyMargin = 1;

    if (this.includeDialCode()) {
      safetyMargin += 1;
    }

    switch (this.outputNumberFormat()) {
      case PhoneNumberFormat.RFC3966:
        safetyMargin += 2;
        break;
      case PhoneNumberFormat.E164:
        safetyMargin += 0;
        break;
      case PhoneNumberFormat.INTERNATIONAL:
      default:
        safetyMargin += 1;
        break;
    }

    return safetyMargin;
  };

  private calculateFormattingBuffer = (
    countryCode: string,
    baseLength: number
  ): number => {
    try {
      const phoneUtil = PhoneNumberUtil.getInstance();
      const numberTypes = [
        PhoneNumberType.MOBILE,
        PhoneNumberType.FIXED_LINE,
        PhoneNumberType.FIXED_LINE_OR_MOBILE
      ];

      let maxFormattingOverhead = 0;

      for (const numberType of numberTypes) {
        try {
          const exampleNumber = phoneUtil.getExampleNumberForType(
            countryCode.toUpperCase(),
            numberType
          );

          if (exampleNumber) {
            const formattedNational = phoneUtil.format(
              exampleNumber,
              PhoneNumberFormat.NATIONAL
            );

            const nationalNumber =
              exampleNumber.getNationalNumber()?.toString() || '';
            const formattingOverhead =
              formattedNational.length - nationalNumber.length;

            maxFormattingOverhead = Math.max(
              maxFormattingOverhead,
              formattingOverhead
            );
          }
        } catch {
          // Continue with next type
        }
      }

      return maxFormattingOverhead > 0 ? maxFormattingOverhead : 4;
    } catch {
      return 4;
    }
  };
}
