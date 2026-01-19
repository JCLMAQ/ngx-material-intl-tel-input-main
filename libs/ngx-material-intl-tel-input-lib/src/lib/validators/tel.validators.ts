import { WritableSignal } from '@angular/core';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import { Country } from '../types/country.model';
import { isValidPhoneNumberLength } from '../utils/phone-number.utils';

/**
 * Interface for phone form state using signals
 */
export interface PhoneFormState {
  prefixCtrl: WritableSignal<Country | null>;
  numberControl: WritableSignal<string>;
}

/**
 * Validation error types for phone number validation
 */
export interface PhoneValidationError {
  kind: 'invalidNumber' | 'numberTooLong';
  message: string;
}

export default class TelValidators {
  /**
   * Validates phone number format and length using google-libphonenumber.
   * Compatible with both traditional ValidatorFn and Signal Forms.
   *
   * @param telFormState - Signal-based form state containing prefix and number controls
   * @param includeDialCode - Whether to include the dial code in validation
   * @param allCountries - List of all available countries
   * @param outputNumberFormat - Format for the phone number output
   * @returns ValidatorFn for use with Angular forms
   */
  static isValidNumber(
    telFormState: PhoneFormState,
    includeDialCode = false,
    allCountries: Country[],
    outputNumberFormat: PhoneNumberFormat = PhoneNumberFormat.INTERNATIONAL
  ): ValidatorFn {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
      try {
        const phoneNumberUtil = PhoneNumberUtil.getInstance();

        if (!control.value) {
          return null;
        }

        // NOTE: the PhoneNumberUtil.parse() method does NOT appear to correctly parse phone numbers with
        // country codes which include the 'area code' eg. Dominica (+1767), Grenada (+1473), etc.
        // Instead, the returned phone number is for the US (+1) country code.
        const parsed = phoneNumberUtil.parse(control.value);

        const setPrefixControlValue = (
          countryCode: string | number | undefined,
          allCountries: Country[]
        ) => {
          const country = allCountries.find((c) => {
            if (c.dialCode === countryCode?.toString()) {
              if (c.areaCodes) {
                // Checking the area codes only works because the countries using the same country code as the
                // US (+1) and UK (+44) are ALL defined earlier in the list of all countries (country-code.ts)
                // and are checked before defaulting to the US or UK (which are defined without area codes and
                // have the highest priority (0)).
                return c.areaCodes?.find((ac) =>
                  parsed.getNationalNumber()?.toString().startsWith(ac)
                );
              } else if (c.priority === 0) {
                // If a country does NOT have any area codes but shares a country code with another country,
                // return the country with the highest priority (0), eg. country code '599' belongs to both
                // 'Carribean Netherlands' (priority 1) and 'Curaçao' (priority 0).
                return c;
              }
            }
            return undefined;
          });

          if (country && country.iso2 !== telFormState.prefixCtrl()?.iso2) {
            telFormState.prefixCtrl.set(country);
          }
        };

        if (includeDialCode) {
          const countryDialCode =
            telFormState.prefixCtrl()?.dialCode || parsed.getCountryCode();
          if (countryDialCode) {
            setPrefixControlValue(countryDialCode, allCountries);
          }
        }

        const formattedOnlyNumber = phoneNumberUtil.format(
          parsed,
          includeDialCode || telFormState.prefixCtrl()?.iso2 === 'mp'
            ? outputNumberFormat
            : PhoneNumberFormat.NATIONAL
        );

        telFormState.numberControl.set(formattedOnlyNumber);

        const isValidNumber = phoneNumberUtil.isValidNumber(parsed);
        setPrefixControlValue(parsed.getCountryCode(), allCountries);

        // Check if the phone number length is valid for the country
        const countryIso = telFormState.prefixCtrl()?.iso2;
        const isValidLength = countryIso
          ? isValidPhoneNumberLength(control.value, countryIso)
          : true;

        if (!isValidNumber) {
          return { invalidNumber: true };
        } else if (!isValidLength) {
          // If the number is valid according to libphonenumber but exceeds the maximum length
          return { numberTooLong: true };
        } else {
          return null;
        }
      } catch {
        return { invalidNumber: true };
      }
    };
  }

  /**
   * Creates a validation error message for phone number validation
   * @param error - The validation error object
   * @returns Human-readable error message
   */
  static getErrorMessage(error: { [key: string]: boolean } | null): string | null {
    if (!error) return null;

    if (error['invalidNumber']) {
      return 'Invalid phone number format';
    }
    if (error['numberTooLong']) {
      return 'Phone number is too long';
    }

    return 'Invalid phone number';
  }
}
