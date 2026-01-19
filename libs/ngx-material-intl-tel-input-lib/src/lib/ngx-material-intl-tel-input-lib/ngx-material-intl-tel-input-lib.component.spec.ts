import { provideHttpClient, withFetch } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateService } from '@ngx-translate/core';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import { of, Subject } from 'rxjs';
import { GeoIpService } from '../services/geo-ip/geo-ip.service';
import { Country } from '../types/country.model';
import { GeoData } from '../types/geo.type';
import { NgxMaterialIntlTelInputComponent } from './ngx-material-intl-tel-input-lib.component';

describe('NgxMaterialIntlTelInputComponent', () => {
  let component: NgxMaterialIntlTelInputComponent;
  let fixture: ComponentFixture<NgxMaterialIntlTelInputComponent>;
  let phoneNumberUtil: PhoneNumberUtil;
  const geoIpServiceMock = {
    geoIpLookup: jest.fn().mockReturnValue(of({} as GeoData))
  };
  const translateServiceMock = {
    instant: jest.fn((key: string) => key),
    use: jest.fn(),
    setDefaultLang: jest.fn(),
    onLangChange: of({ lang: 'en' })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxMaterialIntlTelInputComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(withFetch()),
        { provide: GeoIpService, useValue: geoIpServiceMock },
        { provide: TranslateService, useValue: translateServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NgxMaterialIntlTelInputComponent);
    component = fixture.componentInstance;
    phoneNumberUtil = PhoneNumberUtil.getInstance();
    fixture.detectChanges();
  });

  afterEach(() => {
    // Clean up component
    fixture?.destroy();
    // Reset mocks
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize component with default values', () => {
    component.ngOnInit();
    expect(component.selectedPrefix()).toBeNull();
    expect(component.searchFilter()).toBe('');
    expect(component.phoneNumber()).toBe('');
    expect(component.required()).toBe(false);
    expect(component.disabled()).toBe(false);
    expect(component.enablePlaceholder()).toBe(true);
    expect(component.enableSearch()).toBe(true);
    expect(component.includeDialCode()).toBe(false);
    expect(component.autoIpLookup()).toBe(true);
    expect(component.autoSelectCountry()).toBe(true);
    expect(component.autoSelectedCountry()).toBe('');
    expect(component.numberValidation()).toBe(true);
    expect(component.iconMakeCall()).toBe(true);
    expect(component.initialValue()).toBe('');
    expect(component.preferredCountries()).toEqual([]);
    expect(component.visibleCountries()).toEqual([]);
    expect(component.excludedCountries()).toEqual([]);
    expect(component.textLabels()).toEqual({
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
    expect(component.isFocused()).toBe(false);
    expect(component.isLoading()).toBe(true);
  });

  it('should set phone number value to the entered phone number when is not valid', () => {
    component.ngOnInit();
    const phoneNumber = '678906543';
    component['telFormState'].set({
      prefix: component.selectedPrefix(),
      number: phoneNumber
    });
    expect(component.phoneNumber()).toBe(phoneNumber);
  });

  it('should format a valid phone number correctly', () => {
    component.ngOnInit();
    const phoneNumber = '+34678906543';
    const phoneNumberUtil = PhoneNumberUtil.getInstance();
    const parsed = phoneNumberUtil.parse(phoneNumber);
    const country: Country = {
      emojiFlag: '🇪🇸',
      name: 'Spain (España)',
      iso2: 'es',
      dialCode: '34',
      priority: 0,
      htmlId: 'country-code__es',
      flagClass: 'country-code__es',
      placeHolder: '612 34 56 78'
    };
    component['telFormState'].set({
      prefix: country,
      number: '678906543'
    });
    const formatted = component.formattedPhoneNumber();
    expect(formatted).toContain('678');
  });

  it('should select a country from the dropdown', () => {
    component.ngOnInit();
    const country: Country = {
      emojiFlag: '🇪🇸',
      name: 'Spain (España)',
      iso2: 'es',
      dialCode: '34',
      priority: 0,
      htmlId: 'country-code__es',
      flagClass: 'country-code__es',
      placeHolder: '612 34 56 78'
    };
    component['telFormState'].update(state => ({
      ...state,
      prefix: country
    }));
    expect(component.selectedPrefix()).toEqual(country);
  });

  describe('ngOnInit', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      component.allCountries = [
        { name: 'Spain', iso2: 'es' } as Country,
        { name: 'United States', iso2: 'us' } as Country
      ];
      component.ngOnInit();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should call setInitialTelValue', () => {
      const setInitialTelValueSpy = jest.spyOn(
        component as any,
        'setInitialTelValue'
      );
      component.ngOnInit();
      jest.advanceTimersByTime(0);
      expect(setInitialTelValueSpy).toHaveBeenCalled();
    });

    it('should filter countries based on search keyword', () => {
      component.searchFilter.set('spain');
      const filtered = component.filteredCountries();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].iso2).toBe('es');
    });

    it('should return all countries when no search keyword', () => {
      component.searchFilter.set('');
      const filtered = component.filteredCountries();
      expect(filtered).toEqual(component.allCountries);
    });

    it('should set isFocused to true on input focus', () => {
      component.onInputFocus();
      expect(component.isFocused()).toBe(true);
    });

    it('should set isFocused to false on input blur', () => {
      component.onInputBlur();
      expect(component.isFocused()).toBe(false);
    });
  });

  describe('fetchCountryData', () => {
    beforeEach(() => {
      (component as any).countryDataService = {
        processCountries: jest
          .fn()
          .mockReturnValue([
            { name: 'Spain', iso2: 'es', dialCode: '34' } as Country,
            { name: 'United States', iso2: 'us', dialCode: '1' } as Country
          ])
      };
    });

    it('should fetch and set country data', () => {
      component['fetchCountryData']();
      expect(
        (component as any).countryDataService.processCountries
      ).toHaveBeenCalledWith(
        (component as any).countryCodeData,
        component.enablePlaceholder(),
        component.includeDialCode(),
        component.visibleCountries(),
        component.preferredCountries(),
        component.excludedCountries(),
        component.useMask(),
        component.forceSelectedCountryCode(),
        component.showMaskPlaceholder(),
        component.outputNumberFormat(),
        component.localizeCountryNames()
      );
      expect(component.allCountries).toHaveLength(2);
    });
  });

  describe('ngAfterViewInit', () => {
    it('should call setInitialPrefixValue', () => {
      const setInitialPrefixValueSpy = jest.spyOn(
        component as any,
        'setInitialPrefixValue'
      );
      component.ngAfterViewInit();
      expect(setInitialPrefixValueSpy).toHaveBeenCalled();
    });
  });

  describe('ngOnDestroy', () => {
    it('should use DestroyRef for cleanup', () => {
      // Le composant utilise maintenant DestroyRef d'Angular
      // DestroyRef gère automatiquement le nettoyage lors de la destruction du composant
      // On vérifie simplement que le component est bien créé avec DestroyRef
      expect(component['destroyRef']).toBeDefined();
    });
  });

  describe('geoIpLookup', () => {
    beforeEach(() => {
      component.allCountries = [
        { name: 'Spain', iso2: 'es', dialCode: '34' } as Country,
        { name: 'United States', iso2: 'us', dialCode: '1' } as Country
      ];
      jest.spyOn(component as any, 'setAutoSelectedCountry');
      (component as any).geoIpService = geoIpServiceMock;
    });

    it('should set prefix when country is found', () => {
      const mockGeoData = { country_code: 'ES' } as GeoData;
      geoIpServiceMock.geoIpLookup.mockReturnValue(of(mockGeoData));

      component['geoIpLookup']();

      expect(component.selectedPrefix()?.iso2).toBe('es');
      expect(component.isLoading()).toBe(false);
    });

    it('should call setAutoSelectedCountry when country is not found', () => {
      const mockGeoData = { country_code: 'XX' } as GeoData;
      geoIpServiceMock.geoIpLookup.mockReturnValue(of(mockGeoData));

      component['geoIpLookup']();

      expect(component['setAutoSelectedCountry']).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('should call setAutoSelectedCountry on error', () => {
      const errorObservable = new Subject<GeoData>();
      geoIpServiceMock.geoIpLookup.mockReturnValue(
        errorObservable.asObservable()
      );

      component['geoIpLookup']();

      errorObservable.error(new Error('Network error'));

      expect(component['setAutoSelectedCountry']).toHaveBeenCalled();
      expect(component.isLoading()).toBe(true);
    });

    it('should handle null country_code', () => {
      const mockGeoData = { country_code: null } as unknown as GeoData;
      geoIpServiceMock.geoIpLookup.mockReturnValue(of(mockGeoData));

      component['geoIpLookup']();

      expect(component['setAutoSelectedCountry']).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('should handle undefined country_code', () => {
      const mockGeoData = {} as unknown as GeoData;
      geoIpServiceMock.geoIpLookup.mockReturnValue(of(mockGeoData));

      component['geoIpLookup']();

      expect(component['setAutoSelectedCountry']).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('setInitialPrefixValue', () => {
    beforeEach(() => {
      component.singleSelect = jest.fn().mockReturnValue({
        compareWith: null
      }) as any;
    });

    it('should set compareWith function for singleSelect', () => {
      component['setInitialPrefixValue']();
      const singleSelectInstance = component.singleSelect();
      if (singleSelectInstance) {
        expect(singleSelectInstance.compareWith).toBeDefined();

        const country1: Country = { iso2: 'es' } as Country;
        const country2: Country = { iso2: 'es' } as Country;
        const country3: Country = { iso2: 'us' } as Country;

        expect(singleSelectInstance.compareWith!(country1, country2)).toBe(
          true
        );
        expect(singleSelectInstance.compareWith!(country1, country3)).toBe(
          false
        );
      }
    });
  });

  describe('filterCountries', () => {
    it('should return all countries when search is empty', () => {
      component.searchFilter.set('');
      const result = component.filteredCountries();
      // Vérifie que tous les pays sont retournés (243 pays dans la base de données)
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBe(component.allCountries.length);
    });

    it('should filter countries by name', () => {
      component.searchFilter.set('espana');
      const result = component.filteredCountries();
      expect(result).toHaveLength(1);
      expect(result[0].iso2).toBe('es');
    });

    it('should return empty array when no countries match', () => {
      component.searchFilter.set('xyz');
      const result = component.filteredCountries();
      expect(result).toEqual([]);
    });

    it('should handle null allCountries', () => {
      component.allCountries = null as any;
      expect(() => component.filteredCountries()).not.toThrow();
    });
  });

  describe('setInitialTelValue', () => {
    beforeEach(() => {
      component.allCountries = [
        { name: 'Spain', iso2: 'es', dialCode: '34', priority: 0 } as Country,
        {
          name: 'United States',
          iso2: 'us',
          dialCode: '1',
          priority: 0
        } as Country
      ];
      jest.spyOn(component as any, 'geoIpLookup');
      jest.spyOn(component as any, 'setAutoSelectedCountry');
    });

    it('should call geoIpLookup when autoIpLookup and autoSelectCountry are true and no initial value', () => {
      Object.defineProperty(component, 'initialValue', {
        value: jest.fn().mockReturnValue(''),
        writable: true
      });
      Object.defineProperty(component, 'autoSelectCountry', {
        value: jest.fn().mockReturnValue(true),
        writable: true
      });
      Object.defineProperty(component, 'autoIpLookup', {
        value: jest.fn().mockReturnValue(true),
        writable: true
      });

      component['setInitialTelValue']();
      expect(component['geoIpLookup']).toHaveBeenCalled();
    });

    it('should call setAutoSelectedCountry when autoSelectCountry is true but autoIpLookup is false', () => {
      Object.defineProperty(component, 'initialValue', {
        value: jest.fn().mockReturnValue(''),
        writable: true
      });
      Object.defineProperty(component, 'autoSelectCountry', {
        value: jest.fn().mockReturnValue(true),
        writable: true
      });
      Object.defineProperty(component, 'autoIpLookup', {
        value: jest.fn().mockReturnValue(false),
        writable: true
      });

      component['setInitialTelValue']();
      expect(component['setAutoSelectedCountry']).toHaveBeenCalled();
      expect(component.isLoading()).toBe(false);
    });

    it('should set loading to false when autoSelectCountry is false', () => {
      Object.defineProperty(component, 'initialValue', {
        value: jest.fn().mockReturnValue(''),
        writable: true
      });
      Object.defineProperty(component, 'autoSelectCountry', {
        value: jest.fn().mockReturnValue(false),
        writable: true
      });

      component['setInitialTelValue']();
      expect(component.isLoading()).toBe(false);
    });

    it('should parse and set initial value when provided', () => {
      Object.defineProperty(component, 'initialValue', {
        value: jest.fn().mockReturnValue('+34678906543'),
        writable: true
      });

      component['setInitialTelValue']();

      expect(component.selectedPrefix()?.dialCode).toBe('34');
      expect(component.isLoading()).toBe(false);
    });

    it('should handle invalid initial value', () => {
      Object.defineProperty(component, 'initialValue', {
        value: jest.fn().mockReturnValue('invalid-number'),
        writable: true
      });

      component['setInitialTelValue']();

      expect(component.phoneNumber()).toBe('invalid-number');
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('setAutoSelectedCountry', () => {
    beforeEach(() => {
      component.allCountries = [
        { name: 'Spain', iso2: 'es', dialCode: '34' } as Country,
        { name: 'United States', iso2: 'us', dialCode: '1' } as Country,
        { name: 'France', iso2: 'fr', dialCode: '33' } as Country
      ];
    });

    it('should set auto selected country when found', () => {
      Object.defineProperty(component, 'autoSelectedCountry', {
        value: jest.fn().mockReturnValue('us'),
        writable: true
      });

      component['setAutoSelectedCountry']();
      expect(component.selectedPrefix()?.iso2).toBe('us');
    });

    it('should set Spain as default when auto selected country not found', () => {
      Object.defineProperty(component, 'autoSelectedCountry', {
        value: jest.fn().mockReturnValue('xx'),
        writable: true
      });

      component['setAutoSelectedCountry']();
      expect(component.selectedPrefix()?.iso2).toBe('es');
    });

    it('should set first country when Spain is not available', () => {
      Object.defineProperty(component, 'autoSelectedCountry', {
        value: jest.fn().mockReturnValue('xx'),
        writable: true
      });
      component.allCountries = [
        { name: 'United States', iso2: 'us', dialCode: '1' } as Country,
        { name: 'France', iso2: 'fr', dialCode: '33' } as Country
      ];

      component['setAutoSelectedCountry']();
      expect(component.selectedPrefix()?.iso2).toBe('us');
    });

    it('should handle empty allCountries array', () => {
      component.allCountries = [];
      component['setAutoSelectedCountry']();
      expect(component.selectedPrefix()).toBeNull();
    });
  });

  describe('setCursorPosition', () => {
    let mockInputElement: HTMLInputElement;
    let mockParsedNumber: any;

    beforeEach(() => {
      mockInputElement = {
        setSelectionRange: jest.fn()
      } as any;
      mockParsedNumber = {
        getNationalNumber: jest.fn().mockReturnValue(1234567890),
        hasNationalNumber: jest.fn().mockReturnValue(true),
        getCountryCodeOrDefault: jest.fn().mockReturnValue(1),
        getCountryCode: jest.fn().mockReturnValue(1),
        getExtension: jest.fn().mockReturnValue(''),
        hasExtension: jest.fn().mockReturnValue(false),
        getItalianLeadingZero: jest.fn().mockReturnValue(false),
        hasItalianLeadingZero: jest.fn().mockReturnValue(false),
        getNumberOfLeadingZeros: jest.fn().mockReturnValue(1),
        hasNumberOfLeadingZeros: jest.fn().mockReturnValue(false),
        getRawInput: jest.fn().mockReturnValue(''),
        hasRawInput: jest.fn().mockReturnValue(false),
        getCountryCodeSource: jest.fn().mockReturnValue(0),
        hasCountryCodeSource: jest.fn().mockReturnValue(false),
        getPreferredDomesticCarrierCode: jest.fn().mockReturnValue(''),
        hasPreferredDomesticCarrierCode: jest.fn().mockReturnValue(false)
      };
      jest.spyOn(component as any, 'adjustCursorPosition').mockReturnValue(10);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should set cursor position after timeout', () => {
      component['setCursorPosition'](
        mockInputElement,
        5,
        mockParsedNumber,
        '12345'
      );

      jest.advanceTimersByTime(1);
      expect(mockInputElement.setSelectionRange).toHaveBeenCalledWith(10, 10);
    });

    it('should return early when numberValidation is false', () => {
      Object.defineProperty(component, 'numberValidation', {
        value: jest.fn().mockReturnValue(false),
        writable: true
      });

      component['setCursorPosition'](
        mockInputElement,
        5,
        mockParsedNumber,
        '12345'
      );

      jest.advanceTimersByTime(1);
      expect(mockInputElement.setSelectionRange).not.toHaveBeenCalled();
      expect(component['adjustCursorPosition']).not.toHaveBeenCalled();
    });
  });

  describe('adjustCursorPosition', () => {
    beforeEach(() => {
      jest
        .spyOn(component as any, 'countSpacesBeforePosition')
        .mockImplementation((...args: any[]) => {
          const [value, position] = args as [string, number];
          return value
            .slice(0, position)
            .split('')
            .filter((char) => char === ' ').length;
        });
    });

    it('should return new value length when original position is at end', () => {
      const result = component['adjustCursorPosition'](
        5,
        '12345',
        '123 456 789'
      );
      expect(result).toBe(11);
    });

    it('should adjust cursor position based on space count difference', () => {
      const result = component['adjustCursorPosition'](3, '123456', '123 456');
      expect(result).toBe(3); // Position 3 in '123456' maps to position 3 in '123 456' (before the space)
    });

    it('should ensure cursor position is within bounds', () => {
      const result = component['adjustCursorPosition'](-5, '123', '123456');
      expect(result).toBe(0);
    });

    it('should not exceed new value length', () => {
      const result = component['adjustCursorPosition'](10, '123456789', '123');
      expect(result).toBe(3);
    });
  });

  describe('countSpacesBeforePosition', () => {
    it('should count spaces before position', () => {
      const result = component['countSpacesBeforePosition']('12 34 56', 5);
      expect(result).toBe(1); // Only one space before position 5 ('12 34')
    });

    it('should return 0 when no spaces', () => {
      const result = component['countSpacesBeforePosition']('123456', 3);
      expect(result).toBe(0);
    });

    it('should handle position at start', () => {
      const result = component['countSpacesBeforePosition'](' 123', 0);
      expect(result).toBe(0);
    });
  });

  describe('getMaxInputLength', () => {
    beforeEach(() => {
      component['telFormState'].set({
        prefix: null,
        number: '1234567890'
      });
      jest
        .spyOn(component as any, 'isCurrentNumberValidAndFormatted')
        .mockReturnValue(false);
      jest
        .spyOn(component as any, 'calculateFormattingBuffer')
        .mockReturnValue(4);
      jest.spyOn(component as any, 'calculateSafetyMargin').mockReturnValue(2);
      Object.defineProperty(component, 'includeDialCode', {
        value: jest.fn().mockReturnValue(false),
        writable: true
      });
      Object.defineProperty(component, 'outputNumberFormat', {
        value: jest.fn().mockReturnValue(PhoneNumberFormat.INTERNATIONAL),
        writable: true
      });
    });

    it('should return default fallback when no country code provided', () => {
      const result = component.getMaxInputLength();
      expect(result).toBe(25);
    });

    it('should return extended length for valid formatted numbers', () => {
      jest
        .spyOn(component as any, 'isCurrentNumberValidAndFormatted')
        .mockReturnValue(true);
      const result = component.getMaxInputLength('us');
      expect(result).toBeGreaterThan(15);
    });

    it('should return restricted length for invalid numbers', () => {
      jest
        .spyOn(component as any, 'isCurrentNumberValidAndFormatted')
        .mockReturnValue(false);
      const result = component.getMaxInputLength('us');
      expect(result).toBeLessThan(20);
    });

    it('should handle RFC3966 format with includeDialCode', () => {
      Object.defineProperty(component, 'includeDialCode', {
        value: jest.fn().mockReturnValue(true),
        writable: true
      });
      Object.defineProperty(component, 'outputNumberFormat', {
        value: jest.fn().mockReturnValue(PhoneNumberFormat.RFC3966),
        writable: true
      });

      const result = component.getMaxInputLength('us');
      expect(result).toBeGreaterThan(15);
    });

    it('should handle errors gracefully', () => {
      jest
        .spyOn(component as any, 'isCurrentNumberValidAndFormatted')
        .mockImplementation(() => {
          throw new Error('Test error');
        });

      const result = component.getMaxInputLength('us');
      expect(result).toBeGreaterThan(10);
    });
  });

  describe('isCurrentNumberValidAndFormatted', () => {
    beforeEach(() => {
      component['telFormState'].set({
        prefix: { dialCode: '1' } as Country,
        number: ''
      });
      Object.defineProperty(component, 'includeDialCode', {
        value: jest.fn().mockReturnValue(false),
        writable: true
      });
    });

    it('should return false for short values', () => {
      const result = component['isCurrentNumberValidAndFormatted']('12', 'us');
      expect(result).toBe(false);
    });

    it('should return false for empty values', () => {
      const result = component['isCurrentNumberValidAndFormatted']('', 'us');
      expect(result).toBe(false);
    });

    it('should return false for invalid numbers', () => {
      const result = component['isCurrentNumberValidAndFormatted'](
        'invalid',
        'us'
      );
      expect(result).toBe(false);
    });
  });

  describe('calculateSafetyMargin', () => {
    beforeEach(() => {
      Object.defineProperty(component, 'includeDialCode', {
        value: jest.fn().mockReturnValue(false),
        writable: true
      });
      Object.defineProperty(component, 'outputNumberFormat', {
        value: jest.fn().mockReturnValue(PhoneNumberFormat.INTERNATIONAL),
        writable: true
      });
    });

    it('should return base margin for international format', () => {
      const result = component['calculateSafetyMargin']();
      expect(result).toBe(2); // 1 base + 1 for international
    });

    it('should add margin for includeDialCode', () => {
      Object.defineProperty(component, 'includeDialCode', {
        value: jest.fn().mockReturnValue(true),
        writable: true
      });

      const result = component['calculateSafetyMargin']();
      expect(result).toBe(3); // 1 base + 1 for includeDialCode + 1 for international
    });

    it('should handle RFC3966 format', () => {
      Object.defineProperty(component, 'outputNumberFormat', {
        value: jest.fn().mockReturnValue(PhoneNumberFormat.RFC3966),
        writable: true
      });

      const result = component['calculateSafetyMargin']();
      expect(result).toBe(3); // 1 base + 2 for RFC3966
    });

    it('should handle E164 format', () => {
      Object.defineProperty(component, 'outputNumberFormat', {
        value: jest.fn().mockReturnValue(PhoneNumberFormat.E164),
        writable: true
      });

      const result = component['calculateSafetyMargin']();
      expect(result).toBe(1); // 1 base + 0 for E164
    });
  });

  describe('calculateFormattingBuffer', () => {
    it('should calculate formatting buffer based on example numbers', () => {
      const result = component['calculateFormattingBuffer']('us', 10);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('should return default buffer when no examples available', () => {
      const result = component['calculateFormattingBuffer']('xx', 10);
      expect(result).toBe(4); // Default fallback
    });

    it('should handle PhoneNumberUtil.getInstance() errors gracefully', () => {
      // Mock PhoneNumberUtil.getInstance to throw an error
      const originalGetInstance = PhoneNumberUtil.getInstance;
      jest.spyOn(PhoneNumberUtil, 'getInstance').mockImplementation(() => {
        throw new Error('PhoneNumberUtil error');
      });

      const result = component['calculateFormattingBuffer']('us', 10);
      expect(result).toBe(4); // Fallback value from outer catch block

      // Restore original implementation
      PhoneNumberUtil.getInstance = originalGetInstance;
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined values gracefully', () => {
      component.allCountries = null as any;
      expect(() => component.filteredCountries()).not.toThrow();
    });

    it('should handle missing singleSelect element', () => {
      component.singleSelect = jest.fn().mockReturnValue(null) as any;
      expect(() => component['setInitialPrefixValue']()).not.toThrow();
    });

    it('should handle missing numberInput element', () => {
      component.numberInput = jest.fn().mockReturnValue(null) as any;
      expect(() => component.numberInput()?.nativeElement).not.toThrow();
    });

    it('should handle empty allCountries array', () => {
      component.allCountries = [];
      component['setAutoSelectedCountry']();
      expect(component.selectedPrefix()).toBeNull();
    });

    it('should handle phone number parsing errors', () => {
      Object.defineProperty(component, 'initialValue', {
        value: jest.fn().mockReturnValue('invalid-phone-number'),
        writable: true
      });

      expect(() => component['setInitialTelValue']()).not.toThrow();
      expect(component.isLoading()).toBe(false);
    });
  });
});
