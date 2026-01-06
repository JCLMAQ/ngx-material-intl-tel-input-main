import { AsyncPipe } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
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
import {
  AbstractControl,
  ControlContainer,
  FormControl,
  FormControlStatus,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  Field,
  customError,
  form,
  schema,
  validate
} from '@angular/forms/signals';
import {
  MatFormFieldAppearance,
  MatFormFieldModule
} from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import {
  MAT_SELECT_CONFIG,
  MatSelect,
  MatSelectModule
} from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { IMaskModule } from 'angular-imask';
import {
  PhoneNumber,
  PhoneNumberFormat,
  PhoneNumberType,
  PhoneNumberUtil
} from 'google-libphonenumber';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { ReplaySubject, Subject, take, takeUntil } from 'rxjs';
import { PhoneIconComponent } from '../components/phone-icon/phone-icon.component';
import { CountryCode } from '../data/country-code';
import { CountryISO } from '../enums/country-iso.enum';
import { CountryDataService } from '../services/country-data/country-data.service';
import { GeoIpService } from '../services/geo-ip/geo-ip.service';
import { Country } from '../types/country.model';
import { GeoData } from '../types/geo.type';
import { TextLabels } from '../types/text-labels.type';
import {
  getMaxPhoneNumberLength,
  isValidPhoneNumberLength
} from '../utils/phone-number.utils';

type PhoneErrorKind = 'required' | 'invalidNumber' | 'numberTooLong';

interface TelFormState {
  prefixCtrl: Country | null;
  numberControl: string;
}

interface PhoneValidationResult {
  formatted: string;
  error?: PhoneErrorKind;
  country?: Country | null;
  parsed?: PhoneNumber | null;
}

@Component({
  selector: 'ngx-material-intl-tel-input',
  templateUrl: './ngx-material-intl-tel-input-lib.component.html',
  styleUrl: './ngx-material-intl-tel-input-lib.component.scss',
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    Field,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    PhoneIconComponent,
    IMaskModule
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
  implements OnInit, AfterViewInit, OnDestroy
{
  private readonly countryCodeData = inject(CountryCode);
  private readonly geoIpService = inject(GeoIpService);
  private readonly countryDataService = inject(CountryDataService);
  private readonly controlContainer = inject(ControlContainer);

  fieldControl = model<
    AbstractControl<string | null, string | null> | FormControl | null
  >(new FormControl(''));
  fieldControlName = input<string>('');
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
  outputNumberFormat = input<PhoneNumberFormat>(
    PhoneNumberFormat.INTERNATIONAL
  );
  enableInputMaxLength = input<boolean>(true);
  currentValue = output<string>();
  currentCountryCode = output<string>();
  currentCountryISO = output<string>();
  isFocused = signal(false);
  isLoading = signal(true);
  formattedValue = signal('');

  filteredCountries = new ReplaySubject<Country[]>(1);
  prefixFilterCtrl = new FormControl<string | null>('');
  singleSelect = viewChild<MatSelect>('singleSelect');
  numberInput = viewChild<ElementRef<HTMLInputElement>>('numberInput');
  protected _onDestroy = new Subject<void>();

  allCountries: Country[] = [];
  phoneNumberUtil = PhoneNumberUtil.getInstance();

  private readonly telState = signal<TelFormState>({
    prefixCtrl: null,
    numberControl: ''
  });

  private readonly telSchema = schema<TelFormState>((f) => {
    validate(f.numberControl, (field) => {
      const numberValue = field.value() || '';
      const prefixField = f.prefixCtrl as any;
      const prefixValue = prefixField.value?.() || null;
      return this.resolveValidation(numberValue, prefixValue);
    });
  });

  telForm = form(this.telState, this.telSchema);
  prefix = computed(() => this.telState().prefixCtrl);

  constructor() {
    effect(() => this.syncDisabledState());
    effect(() => this.applyPrefixDialCode());
    effect(() => this.syncWithTelState());
  }

  ngOnInit(): void {
    this.setFieldControl();
    this.fetchCountryData();
    this.filteredCountries.next(this.allCountries.slice());
    this.prefixFilterCtrl.valueChanges
      .pipe(takeUntil(this._onDestroy))
      .subscribe(() => this.filterCountries());
    this.setInitialTelValue();
    this.startFieldControlValueChangesListener();
    this.startFieldControlStatusChangesListener();
  }

  ngAfterViewInit(): void {
    this.setInitialPrefixValue();
  }

  ngOnDestroy(): void {
    this._onDestroy.next();
    this._onDestroy.complete();
  }

  fetchCountryData(): void {
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

  filterCountries(): void {
    if (!this.allCountries) {
      return;
    }
    const normalizedSearch = this.normalizeSearchValue(
      this.prefixFilterCtrl.value
    );
    if (!normalizedSearch) {
      this.filteredCountries.next(this.allCountries.slice());
      return;
    }
    this.filteredCountries.next(
      this.allCountries.filter(
        (country) =>
          this.normalizeSearchValue(country?.name).indexOf(normalizedSearch) >
          -1
      )
    );
  }

  onInputFocus(): void {
    this.isFocused.set(true);
  }

  onInputBlur(): void {
    this.isFocused.set(false);
  }

  private normalizeSearchValue(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    let normalizedValue = value.toString().trim().toLocaleLowerCase();
    try {
      normalizedValue = normalizedValue.normalize('NFD');
    } catch {
      normalizedValue = normalizedValue;
    }
    return normalizedValue.replace(/[\u0300-\u036f]/g, '');
  }

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
      return;
    }
    this.applyExternalValue(this.initialValue());
    this.isLoading.set(false);
  }

  private geoIpLookup(): void {
    this.geoIpService.geoIpLookup().subscribe({
      next: (data: GeoData) => {
        const country =
          this.allCountries?.find(
            (c) => c.iso2 === data.country_code?.toLowerCase()
          ) || null;
        if (country) {
          this.telState.update((state) => ({
            ...state,
            prefixCtrl: country
          }));
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

  private setInitialPrefixValue(): void {
    this.filteredCountries
      .pipe(take(1), takeUntil(this._onDestroy))
      .subscribe(() => {
        const singleSelectInstance = this.singleSelect() as MatSelect;
        singleSelectInstance.compareWith = (a: Country, b: Country) =>
          a && b && a.iso2 === b.iso2;
      });
  }

  private applyPrefixDialCode(): void {
    const prefixValue = this.prefix();
    if (!prefixValue) {
      return;
    }
    if (this.includeDialCode() && prefixValue.dialCode) {
      const dialCodeValue = `+${prefixValue.dialCode}`;
      const current = this.telState().numberControl;
      if (!current.startsWith(dialCodeValue)) {
        this.telState.update((state) => ({
          ...state,
          numberControl: dialCodeValue
        }));
      }
    }
    if (!this.isLoading()) {
      setTimeout(() => {
        this.numberInput()?.nativeElement?.focus();
      });
    }
  }

  private syncDisabledState(): void {
    const control = this.fieldControl();
    if (!control) {
      return;
    }
    if (this.disabled()) {
      control.disable({ emitEvent: false });
    } else {
      control.enable({ emitEvent: false });
    }
  }

  private syncWithTelState(): void {
    const state = this.telState();
    const inputElement = this.numberInput()?.nativeElement;
    const cursorPosition = inputElement?.selectionStart ?? 0;
    const validation = this.validatePhone(state);
    this.syncPrefixFromValidation(validation.country);
    this.formattedValue.set(validation.formatted);
    if (inputElement && validation.parsed) {
      this.setCursorPosition(
        inputElement,
        cursorPosition,
        validation.parsed,
        state.numberControl
      );
    }
    this.updateExternalControl(validation);
    this.emitOutputs(validation.formatted, validation.country ?? state.prefixCtrl);
  }

  private setFieldControl(): void {
    if (
      this.fieldControlName() &&
      this.controlContainer?.control?.get(this.fieldControlName())
    ) {
      this.fieldControl.set(
        this.controlContainer.control.get(this.fieldControlName())
      );
    }
    const control = this.fieldControl();
    if (control?.value) {
      this.initialValue.set(control.value as string);
      this.applyExternalValue(control.value as string);
    }
    if (control?.hasValidator(Validators.required)) {
      this.required.set(true);
    }
    if (control?.disabled) {
      this.disabled.set(true);
    }
  }

  private startFieldControlValueChangesListener(): void {
    const control = this.fieldControl();
    if (!control?.valueChanges) {
      return;
    }
    const sub = control.valueChanges.subscribe({
      next: (data: string) => {
        this.applyExternalValue(data);
      }
    });
    effect(() => {
      if (this._onDestroy.closed) {
        sub.unsubscribe();
      }
    });
  }

  private startFieldControlStatusChangesListener(): void {
    const control = this.fieldControl();
    if (!control?.statusChanges) {
      return;
    }
    const sub = control.statusChanges.subscribe({
      next: (status: FormControlStatus) => {
        this.disabled.set(status === 'DISABLED');
      }
    });
    effect(() => {
      if (this._onDestroy.closed) {
        sub.unsubscribe();
      }
    });
  }

  private setAutoSelectedCountry(): void {
    const autoSelectedCountry = this.allCountries?.find(
      (country) => country?.iso2 === this.autoSelectedCountry()
    );
    if (autoSelectedCountry) {
      this.telState.update((state) => ({
        ...state,
        prefixCtrl: autoSelectedCountry
      }));
    } else {
      const defaultCountry = this.allCountries?.find(
        (country) => country?.iso2 === CountryISO.Spain
      );
      if (defaultCountry) {
        this.telState.update((state) => ({
          ...state,
          prefixCtrl: defaultCountry
        }));
      } else {
        this.telState.update((state) => ({
          ...state,
          prefixCtrl: this.allCountries?.[0] ?? null
        }));
      }
    }
  }

  private applyExternalValue(value: string | null): void {
    if (!value) {
      this.telState.update((state) => ({ ...state, numberControl: '' }));
      return;
    }
    try {
      const parsed = this.phoneNumberUtil.parse(value);
      const country = this.findCountryForParsed(parsed);
      const formatted = this.phoneNumberUtil.format(
        parsed,
        this.includeDialCode() || country?.iso2 === 'mp'
          ? this.outputNumberFormat()
          : PhoneNumberFormat.NATIONAL
      );
      this.telState.set({
        prefixCtrl: country ?? this.telState().prefixCtrl,
        numberControl: formatted
      });
    } catch {
      this.telState.update((state) => ({ ...state, numberControl: value }));
    }
  }

  private resolveValidation(
    value: string,
    prefixValue: Country | null
  ) {
    const result = this.validatePhone({
      prefixCtrl: prefixValue,
      numberControl: value
    });
    if (!result.error) {
      return null;
    }
    return customError({
      kind: result.error,
      message: this.getErrorMessage(result.error)
    });
  }

  private getErrorMessage(kind: PhoneErrorKind): string {
    if (kind === 'required') {
      return this.textLabels().requiredError || 'This field is required';
    }
    if (kind === 'invalidNumber') {
      return this.textLabels().invalidNumberError || 'Number is not valid';
    }
    return this.textLabels().numberTooLongError || 'Phone number is too long';
  }

  private validatePhone(state: TelFormState): PhoneValidationResult {
    const prefixValue = state.prefixCtrl;
    const trimmed = state.numberControl?.trim() || '';
    if (!trimmed) {
      if (this.required()) {
        return {
          formatted: '',
          error: 'required',
          country: prefixValue,
          parsed: null
        };
      }
      return { formatted: '', country: prefixValue, parsed: null };
    }

    if (!this.numberValidation()) {
      return {
        formatted: this.buildValueForFormatting(trimmed, prefixValue),
        country: prefixValue,
        parsed: null
      };
    }

    try {
      const parsed = this.phoneNumberUtil.parse(
        this.buildValueForParsing(trimmed, prefixValue),
        prefixValue?.iso2
      );
      const country = this.findCountryForParsed(parsed) ?? prefixValue;
      const formatted = this.phoneNumberUtil.format(
        parsed,
        this.outputNumberFormat()
      );
      const validNumber = this.phoneNumberUtil.isValidNumber(parsed);
      const validLength = country?.iso2
        ? isValidPhoneNumberLength(formatted, country.iso2)
        : true;

      if (!validNumber) {
        return {
          formatted,
          error: 'invalidNumber',
          country,
          parsed
        };
      }

      if (!validLength) {
        return {
          formatted,
          error: 'numberTooLong',
          country,
          parsed
        };
      }

      return { formatted, country, parsed };
    } catch {
      return {
        formatted: trimmed,
        error: 'invalidNumber',
        country: prefixValue,
        parsed: null
      };
    }
  }

  private buildValueForFormatting(
    value: string,
    prefixValue: Country | null
  ): string {
    if (this.includeDialCode() && prefixValue?.dialCode && !value.startsWith('+')) {
      return `+${prefixValue.dialCode}${value}`;
    }
    return value;
  }

  private buildValueForParsing(
    value: string,
    prefixValue: Country | null
  ): string {
    if (!prefixValue) {
      return value;
    }
    if (this.includeDialCode()) {
      return value;
    }
    if (prefixValue.iso2 === 'mp') {
      return value;
    }
    if (
      prefixValue.dialCode &&
      !value.startsWith(`+${prefixValue.dialCode}`)
    ) {
      return `+${prefixValue.dialCode}${value}`;
    }
    return value;
  }

  private findCountryForParsed(parsed: PhoneNumber): Country | null {
    const countryCode = parsed.getCountryCode();
    const national = parsed.getNationalNumber()?.toString();
    if (!countryCode) {
      return null;
    }
    const dialCode = countryCode.toString();
    const directMatch = this.allCountries.find((c) => {
      if (c.dialCode === dialCode) {
        if (c.areaCodes?.length) {
          return c.areaCodes.some((ac) => national?.startsWith(ac));
        }
        return c.priority === 0;
      }
      return false;
    });
    if (directMatch) {
      return directMatch;
    }
    return this.allCountries.find((c) => c.dialCode === dialCode) || null;
  }

  private syncPrefixFromValidation(country: Country | null | undefined): void {
    if (!country) {
      return;
    }
    if (this.prefix()?.iso2 === country.iso2) {
      return;
    }
    this.telState.update((state) => ({ ...state, prefixCtrl: country }));
  }

  private updateExternalControl(result: PhoneValidationResult): void {
    const control = this.fieldControl();
    if (!control) {
      return;
    }
    control.setValue(result.formatted, { emitEvent: false });
    control.markAsDirty();
    if (result.error) {
      control.setErrors({ [result.error]: true });
    } else {
      control.setErrors(null);
    }
  }

  private emitOutputs(value: string, country: Country | null): void {
    this.currentValue.emit(value || '');
    this.currentCountryCode.emit(country?.dialCode ? `+${country.dialCode}` : '');
    this.currentCountryISO.emit(country?.iso2 || '');
  }

  hasError(kind: PhoneErrorKind): boolean {
    const errors = this.telForm.numberControl().errors();
    return errors?.some((error: any) => error.kind === kind) ?? false;
  }

  getFlagClass(flagClass?: string | null): string {
    return ['country-option-flag', flagClass || '']
      .filter(Boolean)
      .join(' ');
  }

  getMaxInputLength = (countryCode?: string): number => {
    if (!countryCode) {
      return 25;
    }

    try {
      const baseMaxLength = getMaxPhoneNumberLength(countryCode);
      const currentValue = this.telState().numberControl || '';

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
      }

      let minimalBuffer = this.includeDialCode() ? 4 : 2;

      if (
        this.includeDialCode() &&
        this.outputNumberFormat() === PhoneNumberFormat.RFC3966
      ) {
        minimalBuffer = 8;
      }

      return baseMaxLength + minimalBuffer;
    } catch (_) {
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
      const fullNumber = this.includeDialCode()
        ? currentValue
        : `+${this.prefix()?.dialCode}${currentValue}`;

      const parsedNumber = this.phoneNumberUtil.parse(fullNumber, countryCode);
      const isValid = this.phoneNumberUtil.isValidNumber(parsedNumber);

      const hasFormatting = /[\s\-()]/.test(currentValue);

      return isValid && hasFormatting;
    } catch (_) {
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
        } catch (_) {}
      }

      return maxFormattingOverhead > 0 ? maxFormattingOverhead : 4;
    } catch (_) {
      return 4;
    }
  };

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
      cursorPosition as number,
      currentValue,
      nationalNumber
    );
    setTimeout(() => {
      inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  }

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

  private countSpacesBeforePosition(value: string, position: number): number {
    return value
      .slice(0, position)
      .split('')
      .filter((char) => char === ' ').length;
  }
}
