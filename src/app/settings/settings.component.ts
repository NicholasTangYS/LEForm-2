// src/app/settings/settings.component.ts
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { baseUrl } from '../../environments/environment';

// Custom Validator for matching passwords
export function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  // If passwords match, return null (no error). Otherwise, return an error object.
  return newPassword === confirmPassword ? null : { mismatch: true };
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  settingsForm: FormGroup;
  changePasswordForm: FormGroup; // New form for changing password
  isLoading = false;
  userId: string | null = null;
  private apiUrl = baseUrl;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {
    // Form for user profile details
    this.settingsForm = this.fb.group({
      Name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      contact_no: ['', [Validators.required]],
      address: ['', [Validators.required]]
    });

    // New form for changing the password
    this.changePasswordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: passwordMatchValidator // Apply the custom validator to the whole group
    });
  }

  ngOnInit(): void {
    this.userId = this.authService.getUserId();

    if (this.userId) {
      this.loadUserData();
    } else {
      console.error('User is not logged in. Redirecting...');
      alert('You must be logged in to view this page.');
      this.router.navigate(['/login']);
    }
  }

  // Getter for easy access to password form controls in the template
  get p() {
    return this.changePasswordForm.controls;
  }

  loadUserData(): void {
    this.isLoading = true;
    this.http.get<any>(`${this.apiUrl}/getUserDetails/${this.userId}`).subscribe({
      next: (userData) => {
        this.settingsForm.patchValue(userData[0]);
      },
      error: (err) => {
        console.error('Failed to load user data:', err);
        alert('Could not load your profile data. Please try again later.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Handles the form submission to update user profile information.
   */
  onSubmit(): void {
    this.settingsForm.markAllAsTouched();

    if (this.settingsForm.invalid) {
      alert('Please correct the errors in your profile before submitting.');
      return;
    }

    this.isLoading = true;
    const updatedData = this.settingsForm.value;

    this.http.put(`${this.apiUrl}/updateUserDetails/${this.userId}`, updatedData).subscribe({
      next: () => {
        alert('Your profile has been updated successfully!');
      },
      error: (err) => {
        console.error('Failed to update user data:', err);
        alert('An error occurred while updating your profile. Please try again.');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /**
   * Handles the submission for the change password form.
   */
  onChangePassword(): void {
    this.changePasswordForm.markAllAsTouched();

    if (this.changePasswordForm.invalid) {
      alert('Please correct the errors in the password form.');
      return;
    }

    this.isLoading = true;
    const { currentPassword, newPassword } = this.changePasswordForm.value;
    const payload = { currentPassword, newPassword };

    // NOTE: You need to create this API endpoint on your backend
    this.http.post(`${this.apiUrl}/changePassword/${this.userId}`, payload).subscribe({
      next: () => {
        alert('Your password has been changed successfully!');
        this.changePasswordForm.reset(); // Clear the form fields
      },
      error: (err) => {
        console.error('Failed to change password:', err);

        // Provide more specific feedback if the API sends it
        const errorMessage = err.error?.message || 'An error occurred. Please ensure your current password is correct.';
        alert(errorMessage);
        this.changePasswordForm.reset(); // Clear the form fields
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}