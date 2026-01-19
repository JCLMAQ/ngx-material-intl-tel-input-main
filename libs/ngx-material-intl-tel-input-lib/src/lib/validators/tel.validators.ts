import { WritableSignal } from '@angular/core';
import { AbstractControl, ValidatorFn } from '@angular/forms';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import { Country } from '../types/country.model';
import { isValidPhoneNumberLength } from '../utils/phone-number.utils';

/**
 * @fileoverview
 * Validateur de numéros de téléphone pour Angular Forms et Signal Forms.
 *
 * **STATUT ACTUEL** : Ce validateur est adapté pour Signal Forms mais n'est actuellement
 * utilisé que dans les tests unitaires. Le composant principal
 * `NgxMaterialIntlTelInputComponent` utilise sa propre méthode de validation
 * `validatePhone()` qui implémente une logique similaire mais de manière intégrée
 * avec Angular Signal Forms.
 *
 * **USAGE POTENTIEL** :
 * - Peut être utilisé comme validateur standalone pour des formulaires réactifs
 * - Sert de référence pour la logique de validation des numéros de téléphone
 * - Maintenu pour compatibilité ascendante et tests
 *
 * **ÉVOLUTION VERS SIGNAL FORMS** :
 * Ce validateur a été adapté pour supporter les Signal Forms via l'interface
 * `PhoneFormState` qui utilise des signals au lieu de `FormGroup`. La signature
 * retourne toujours un `ValidatorFn` standard pour compatibilité avec l'API
 * Angular Forms, mais la gestion interne de l'état utilise des signals.
 *
 * @see NgxMaterialIntlTelInputComponent.validatePhone - Implémentation actuelle dans le composant
 * @see PhoneFormState - Interface pour l'état du formulaire basé sur des signals
 */

/**
 * Interface for phone form state using signals.
 *
 * Cette interface définit la structure de l'état d'un formulaire téléphonique
 * utilisant des signals Angular pour la réactivité.
 *
 * @example
 * ```typescript
 * const telFormState: PhoneFormState = {
 *   prefixCtrl: signal<Country | null>(null),
 *   numberControl: signal<string>('')
 * };
 * ```
 */
export interface PhoneFormState {
  /** Signal writable contenant le pays sélectionné (préfixe) */
  prefixCtrl: WritableSignal<Country | null>;
  /** Signal writable contenant le numéro de téléphone saisi */
  numberControl: WritableSignal<string>;
}

/**
 * Types d'erreurs de validation pour les numéros de téléphone.
 *
 * Utilisé pour fournir des messages d'erreur typés lors de la validation.
 */
export interface PhoneValidationError {
  /** Type d'erreur de validation */
  kind: 'invalidNumber' | 'numberTooLong';
  /** Message d'erreur lisible par l'utilisateur */
  message: string;
}

/**
 * Classe utilitaire pour la validation de numéros de téléphone internationaux.
 *
 * Fournit des méthodes statiques pour valider les numéros de téléphone en utilisant
 * la bibliothèque google-libphonenumber avec support pour Angular Signal Forms.
 *
 * @example Utilisation avec Signal Forms
 * ```typescript
 * const telFormState: PhoneFormState = {
 *   prefixCtrl: signal<Country | null>(null),
 *   numberControl: signal<string>('')
 * };
 *
 * const validator = TelValidators.isValidNumber(
 *   telFormState,
 *   false,
 *   allCountries,
 *   PhoneNumberFormat.INTERNATIONAL
 * );
 *
 * const control = new FormControl('+33612345678');
 * const errors = validator(control);
 * ```
 *
 * @example Utilisation avec FormGroup traditionnel (legacy)
 * ```typescript
 * const telForm = new FormGroup({
 *   prefixCtrl: new FormControl(null),
 *   numberControl: new FormControl('')
 * });
 *
 * // Nécessite une adaptation pour FormGroup traditionnel
 * ```
 */
export default class TelValidators {
  /**
   * Valide le format et la longueur d'un numéro de téléphone international.
   *
   * Cette méthode utilise google-libphonenumber pour valider les numéros de téléphone
   * et supporte les Signal Forms via l'interface PhoneFormState. Elle effectue :
   * - La validation du format via libphonenumber
   * - La vérification de la longueur du numéro
   * - La détection automatique du pays (y compris codes régionaux)
   * - Le formatage automatique du numéro
   * - La mise à jour des signals de préfixe et numéro
   *
   * **NOTES IMPORTANTES** :
   * - La méthode parse() de libphonenumber ne gère pas correctement les numéros
   *   avec codes régionaux (ex: Dominique +1767, Grenade +1473)
   * - Les pays partageant un code (ex: +1 pour US/Canada/Caraïbes) utilisent
   *   les codes régionaux pour la détection précise
   * - Les erreurs de parsing retournent automatiquement `invalidNumber`
   *
   * @param telFormState - État du formulaire basé sur des signals (préfixe + numéro)
   * @param includeDialCode - Si true, inclut l'indicatif pays dans le numéro formaté
   * @param allCountries - Liste complète des pays disponibles pour la détection
   * @param outputNumberFormat - Format de sortie du numéro (défaut: INTERNATIONAL)
   *
   * @returns ValidatorFn compatible avec Angular Forms, retournant :
   *          - `null` si le numéro est valide
   *          - `{ invalidNumber: true }` si le format est invalide
   *          - `{ numberTooLong: true }` si le numéro dépasse la longueur maximale
   *
   * @see {@link https://github.com/google/libphonenumber|google-libphonenumber}
   * @see {@link PhoneFormState}
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
   * Convertit une erreur de validation en message lisible par l'utilisateur.
   *
   * Méthode utilitaire pour transformer les erreurs retournées par `isValidNumber()`
   * en messages d'erreur appropriés pour l'affichage dans l'interface utilisateur.
   *
   * @param error - Objet d'erreur retourné par la validation, ou null si valide
   *
   * @returns Message d'erreur localisé ou null si aucune erreur
   *
   * @example
   * ```typescript
   * const validator = TelValidators.isValidNumber(telFormState, false, countries);
   * const errors = validator(control);
   * const message = TelValidators.getErrorMessage(errors);
   * // message = "Invalid phone number format" ou "Phone number is too long" ou null
   * ```
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
