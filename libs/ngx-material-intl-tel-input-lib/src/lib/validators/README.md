# Validateurs de Numéros de Téléphone

## Vue d'ensemble

Ce dossier contient les validateurs pour la validation des numéros de téléphone internationaux dans l'application Angular.

## Fichiers

- **`tel.validators.ts`** - Classe utilitaire de validation avec support Signal Forms
- **`tel.validators.spec.ts`** - Tests unitaires complets (20+ scénarios)

## Statut Actuel ⚠️

Le validateur `TelValidators` est actuellement **adapté pour Signal Forms** mais **non utilisé dans le code de production**.

### Où est-il utilisé ?

- ✅ **Tests unitaires** : Utilisé extensivement dans `tel.validators.spec.ts`
- ❌ **Composant principal** : `NgxMaterialIntlTelInputComponent` utilise sa propre méthode `validatePhone()`

### Pourquoi cette duplication ?

Le composant a évolué vers Signal Forms et a intégré sa propre logique de validation directement dans son schéma de formulaire. Le validateur `TelValidators` est maintenu pour :

1. **Compatibilité ascendante** - Peut être utilisé dans d'autres contextes
2. **Référence** - Sert de documentation pour la logique de validation
3. **Tests** - Fournit une suite de tests complète pour la validation

## Migration vers Signal Forms

Le validateur a été adapté pour Signal Forms avec les changements suivants :

### Avant (FormGroup traditionnel)

```typescript
import { FormGroup } from '@angular/forms';

const telForm = new FormGroup({
  prefixCtrl: new FormControl(null),
  numberControl: new FormControl('')
});

const validator = TelValidators.isValidNumber(telForm, false, allCountries);
```

### Après (Signal Forms)

```typescript
import { signal } from '@angular/core';
import { PhoneFormState } from './validators/tel.validators';

const telFormState: PhoneFormState = {
  prefixCtrl: signal<Country | null>(null),
  numberControl: signal<string>('')
};

const validator = TelValidators.isValidNumber(telFormState, false, allCountries);
```

## Utilisation

### Exemple basique avec Signal Forms

```typescript
import { Component, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import TelValidators, { PhoneFormState } from './validators/tel.validators';
import { Country } from './types/country.model';
import { PhoneNumberFormat } from 'google-libphonenumber';

@Component({
  selector: 'app-phone-input'
})
export class PhoneInputComponent {
  // Créer l'état du formulaire avec des signals
  telFormState: PhoneFormState = {
    prefixCtrl: signal<Country | null>(null),
    numberControl: signal<string>('')
  };

  // Liste des pays (à charger depuis CountryCode)
  allCountries: Country[] = [];

  // Créer le contrôle de formulaire
  phoneControl = new FormControl('');

  ngOnInit() {
    // Appliquer le validateur
    const validator = TelValidators.isValidNumber(
      this.telFormState,
      false, // includeDialCode
      this.allCountries,
      PhoneNumberFormat.INTERNATIONAL
    );

    this.phoneControl.setValidators(validator);
  }

  // Vérifier les erreurs
  get errorMessage(): string | null {
    const errors = this.phoneControl.errors;
    return TelValidators.getErrorMessage(errors);
  }
}
```

### Gestion des erreurs

Le validateur retourne différents types d'erreurs :

```typescript
const errors = validator(control);

if (errors) {
  if (errors['invalidNumber']) {
    console.log('Format de numéro invalide');
  } else if (errors['numberTooLong']) {
    console.log('Numéro trop long pour le pays sélectionné');
  }
}

// Ou utiliser la méthode helper
const message = TelValidators.getErrorMessage(errors);
```

## Fonctionnalités

### ✅ Validation du format

Utilise `google-libphonenumber` pour valider le format du numéro selon les normes internationales.

### ✅ Validation de la longueur

Vérifie que le numéro ne dépasse pas la longueur maximale autorisée pour le pays.

### ✅ Détection automatique du pays

Détecte automatiquement le pays basé sur l'indicatif, y compris les codes régionaux (ex: +1767 pour Dominique).

### ✅ Formatage automatique

Formate automatiquement le numéro selon le format spécifié (INTERNATIONAL, NATIONAL, E164, etc.).

### ✅ Mise à jour des signals

Met à jour automatiquement les signals de préfixe et de numéro pendant la validation.

## Notes importantes

### Codes régionaux

⚠️ La méthode `PhoneNumberUtil.parse()` ne gère **pas correctement** les numéros avec codes régionaux (ex: Dominique +1767, Grenade +1473). Le validateur implémente une logique spéciale pour ces cas.

### Pays partageant un code

Les pays partageant le même code (ex: +1 pour US/Canada/Caraïbes) utilisent :
- **Codes régionaux** (`areaCodes`) pour la détection précise
- **Priorité** (0 = haute priorité) pour le pays par défaut

### Ordre de validation

1. ✅ Vérification du format via `libphonenumber`
2. ✅ Validation de la longueur maximale
3. ✅ Détection et mise à jour du pays
4. ✅ Formatage du numéro

## Tests

La suite de tests couvre :

- ✅ Numéros valides (US, UK, Suisse, etc.)
- ✅ Numéros invalides (format, longueur)
- ✅ Détection de pays par code régional
- ✅ Gestion des valeurs nulles/vides
- ✅ Formats de sortie personnalisés
- ✅ Gestion des erreurs de parsing

Exécuter les tests :

```bash
nx test ngx-material-intl-tel-input-lib --testPathPatterns=tel.validators.spec
```

## Alternative : Validation du composant

Le composant principal utilise sa propre méthode de validation intégrée :

```typescript
// Dans NgxMaterialIntlTelInputComponent
private validatePhone(state: TelFormState): PhoneValidationResult {
  // Logique de validation similaire mais intégrée
}
```

Cette approche est préférée dans le composant pour une meilleure intégration avec Signal Forms et le cycle de vie du composant.

## Évolution future

Options pour ce validateur :

1. **Intégration** - Refactoriser le composant pour utiliser ce validateur
2. **Suppression** - Supprimer si définitivement non utilisé en production
3. **Maintenance** - Garder comme référence et pour tests

## Ressources

- [google-libphonenumber](https://github.com/google/libphonenumber) - Bibliothèque de validation
- [Angular Signal Forms](https://angular.dev/guide/signal-forms) - Documentation Angular
- [Angular Validators](https://angular.dev/api/forms/Validators) - API de validation Angular
