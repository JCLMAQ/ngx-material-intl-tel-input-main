import {
  ChangeDetectionStrategy,
  Component,
  effect,
  signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { form, required, schema } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { PhoneNumberFormat } from 'google-libphonenumber';
import { NgxMaterialIntlTelInputComponent } from 'ngx-material-intl-tel-input';

@Component({
  imports: [
    NgxMaterialIntlTelInputComponent,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule
  ],
  selector: 'ngx-material-intl-tel-input-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'ngx-material-intl-tel-input';
  currentPhoneValue = signal<string>('');
  currentCountryCode = signal<string>('');
  currentCountryISO = signal<string>('');
  submittedPhoneValue = signal<string>('');
  showSetPhoneInput = signal<boolean>(false);
  PhoneNumberFormat = PhoneNumberFormat;
  private readonly phoneControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required]
  });

  private readonly setPhoneTextboxControl = new FormControl<string>('', {
    nonNullable: true
  });
  private readonly formState = signal<DemoFormState>({
    phone: '',
    setPhoneTextbox: ''
  });
  private readonly phoneValueSignal = toSignal(
    this.phoneControl.valueChanges,
    { initialValue: this.phoneControl.value }
  );
  private readonly setPhoneValueSignal = toSignal(
    this.setPhoneTextboxControl.valueChanges,
    { initialValue: this.setPhoneTextboxControl.value }
  );
  readonly phoneForm = form(this.formState, demoFormSchema);
  readonly formTestGroup: FormGroup<{
    phone: FormControl<string>;
    setPhoneTextbox: FormControl<string>;
  }> = new FormGroup({
    phone: this.phoneControl,
    setPhoneTextbox: this.setPhoneTextboxControl
  });

  constructor() {
    effect(() => {
      this.formState.update((state) => ({
        ...state,
        phone: this.phoneValueSignal() ?? ''
      }));
    });

    effect(() => {
      this.formState.update((state) => ({
        ...state,
        setPhoneTextbox: this.setPhoneValueSignal() ?? ''
      }));
    });
  }

  /**
   * Sets the current phone value to the provided value.
   *
   * @param value - The new value for the current phone.
   */
  getValue(value: string): void {
    this.currentPhoneValue.set(value);
    this.formState.update((state) => ({ ...state, phone: value }));
  }

  /**
   * Submits the form data by setting the submitted phone value to the current phone value from the form group.
   */
  onSubmit(): void {
    if (!this.phoneForm().valid() || this.formTestGroup.invalid) {
      this.formTestGroup.markAllAsTouched();
      return;
    }
    this.submittedPhoneValue.set(this.formState().phone);
  }

  /**
   * Sets the phone control value to the value entered in the 'setPhoneTextbox' control.
   */
  setPhone(): void {
    const nextValue = this.formState().setPhoneTextbox;
    this.formTestGroup.controls.phone.setValue(nextValue);
  }

  /**
   * Toggles the visibility of the set phone input field.
   */
  toggleShowSetPhoneInput(): void {
    this.showSetPhoneInput.set(!this.showSetPhoneInput());
  }

  /**
   * Sets the current country code to the provided value.
   *
   * @param value - The new country code to set.
   */
  getCountryCode(value: string): void {
    this.currentCountryCode.set(value);
  }

  /**
   * Sets the current country ISO code to the provided value.
   *
   * @param value - The new ISO code to set.
   */
  getCountryISO(value: string): void {
    this.currentCountryISO.set(value);
  }

  /**
   * Resets the form group to its initial state, clearing all form controls.
   */
  resetForm(): void {
    this.formTestGroup.reset();
    this.formState.set({ phone: '', setPhoneTextbox: '' });
    this.currentPhoneValue.set('');
    this.currentCountryCode.set('');
    this.currentCountryISO.set('');
    this.submittedPhoneValue.set('');
  }
}

interface DemoFormState {
  phone: string;
  setPhoneTextbox: string;
}

const demoFormSchema = schema<DemoFormState>((f) => {
  required(f.phone, { message: 'Phone number is required' });
});
