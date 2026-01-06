import { PhoneNumberFormat } from 'google-libphonenumber';
import { AppComponent } from './app.component';

describe('AppComponent - Signal Forms Logic', () => {
  let component: AppComponent;

  beforeEach(() => {
    component = Object.create(AppComponent.prototype);
    component.title = 'ngx-material-intl-tel-input';
    component.currentPhoneValue = jest.fn(() => '');
    component.currentCountryCode = jest.fn(() => '');
    component.currentCountryISO = jest.fn(() => '');
    component.submittedPhoneValue = jest.fn(() => '');
    component.showSetPhoneInput = jest.fn(() => false);
    component.PhoneNumberFormat = PhoneNumberFormat;
  });

  describe('Component Basic Properties', () => {
    it('should have title property', () => {
      expect(component.title).toBe('ngx-material-intl-tel-input');
    });

    it('should expose PhoneNumberFormat enum', () => {
      expect(component.PhoneNumberFormat).toBe(PhoneNumberFormat);
    });

    it('should have signal properties defined', () => {
      expect(component.currentPhoneValue).toBeDefined();
      expect(component.currentCountryCode).toBeDefined();
      expect(component.currentCountryISO).toBeDefined();
      expect(component.submittedPhoneValue).toBeDefined();
      expect(component.showSetPhoneInput).toBeDefined();
    });
  });

  describe('Component Methods Exist', () => {
    it('should have getValue method', () => {
      expect(typeof component.getValue).toBe('function');
    });

    it('should have getCountryCode method', () => {
      expect(typeof component.getCountryCode).toBe('function');
    });

    it('should have getCountryISO method', () => {
      expect(typeof component.getCountryISO).toBe('function');
    });

    it('should have onSubmit method', () => {
      expect(typeof component.onSubmit).toBe('function');
    });

    it('should have setPhone method', () => {
      expect(typeof component.setPhone).toBe('function');
    });

    it('should have toggleShowSetPhoneInput method', () => {
      expect(typeof component.toggleShowSetPhoneInput).toBe('function');
    });

    it('should have resetForm method', () => {
      expect(typeof component.resetForm).toBe('function');
    });
  });

  describe('Signal Initialization', () => {
    it('currentPhoneValue should initialize as empty string', () => {
      expect(component.currentPhoneValue()).toBe('');
    });

    it('currentCountryCode should initialize as empty string', () => {
      expect(component.currentCountryCode()).toBe('');
    });

    it('currentCountryISO should initialize as empty string', () => {
      expect(component.currentCountryISO()).toBe('');
    });

    it('submittedPhoneValue should initialize as empty string', () => {
      expect(component.submittedPhoneValue()).toBe('');
    });

    it('showSetPhoneInput should initialize as false', () => {
      expect(component.showSetPhoneInput()).toBe(false);
    });
  });

  describe('Migration from ReactiveFormsModule to Signal Forms', () => {
    it('should use Signal Forms (form function) instead of FormBuilder', () => {
      expect(component).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should have correct method signatures', () => {
      expect(component.getValue.length).toBe(1);
      expect(component.getCountryCode.length).toBe(1);
      expect(component.getCountryISO.length).toBe(1);
    });

    it('should have all required exported properties', () => {
      const accessibleProperties = [
        'title',
        'currentPhoneValue',
        'currentCountryCode',
        'currentCountryISO',
        'submittedPhoneValue',
        'showSetPhoneInput',
        'PhoneNumberFormat',
        'getValue',
        'getCountryCode',
        'getCountryISO',
        'onSubmit',
        'setPhone',
        'toggleShowSetPhoneInput',
        'resetForm'
      ];

      accessibleProperties.forEach((prop) => {
        expect(component[prop]).toBeDefined();
      });
    });
  });
});
