import {
    ChangeDetectionStrategy,
    Component,
    signal
} from '@angular/core';
import { Field, form, required, schema } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { PhoneNumberFormat } from 'google-libphonenumber';
import { NgxMaterialIntlTelInputComponent } from 'ngx-material-intl-tel-input';

interface FormModel {
  phone: string;
  setPhoneTextbox: string;
}

const formSchema = schema<FormModel>((f) => {
  required(f.phone, { message: 'Phone number is required' });
});

@Component({
  imports: [
    NgxMaterialIntlTelInputComponent,
    RouterModule,
    Field,
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

  private formData = signal<FormModel>({
    phone: '',
    setPhoneTextbox: ''
  });

  formTestGroup = form(this.formData, formSchema);

  /**
   * Sets the current phone value to the provided value.
   *
   * @param value - The new value for the current phone.
   */
  getValue(value: string): void {
    this.currentPhoneValue.set(value);
  }

  /**
   * Submits the form data by setting the submitted phone value to the current phone value.
   */
  onSubmit(): void {
    if (this.formTestGroup().valid()) {
      this.submittedPhoneValue.set(this.formData().phone);
    }
  }

  /**
   * Sets the phone value to the value entered in the 'setPhoneTextbox' field.
   */
  setPhone(): void {
    this.formData.update((data) => ({
      ...data,
      phone: data.setPhoneTextbox
    }));
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
   * Resets the form to its initial state and clears all values.
   */
  resetForm(): void {
    this.formData.set({
      phone: '',
      setPhoneTextbox: ''
    });
    this.formTestGroup().reset();
  }
}
