import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

/**
 * Custom validator to check that two fields match.
 */
export function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  // If the confirm password field hasn't been touched yet, don't show the error.
  if (control.get('confirmPassword')?.pristine) {
    return null;
  }

  // Return an error object if passwords do not match, otherwise return null.
  return password === confirmPassword ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  styleUrls: ['./login.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';
  isRegister = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      name: [''],
      contact: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      confirmPassword: ['']
    });
  }

  /**
   * Toggles the form between Login and Register modes.
   * Resets the form and manages validators for each mode.
   */
  toggleForm() {
    this.isRegister = !this.isRegister;
    this.errorMessage = '';
    this.loginForm.reset(); // Clear form fields and validation state

    if (this.isRegister) {
      // When registering, add validators for name, contact, and confirmPassword
      this.loginForm.get('name')?.setValidators(Validators.required);
      this.loginForm.get('contact')?.setValidators(Validators.required);
      this.loginForm.get('confirmPassword')?.setValidators(Validators.required);
      // Add the group validator to check if passwords match
      this.loginForm.setValidators(passwordsMatchValidator);
    } else {
      // When logging in, clear the extra validators
      this.loginForm.get('name')?.clearValidators();
      this.loginForm.get('contact')?.clearValidators();
      this.loginForm.get('confirmPassword')?.clearValidators();
      // Clear any group-level validators
      this.loginForm.clearValidators();
    }
    // Apply the validator changes
    this.loginForm.updateValueAndValidity();
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      // Mark all fields as touched to display validation errors
      this.loginForm.markAllAsTouched();
      return;
    }
    
    const { email, password, name, contact } = this.loginForm.value;

    if (this.isRegister) {
      // Registration Logic
      this.auth.register(name, contact, email, password).subscribe({
        next: (response) => {
          // On successful registration:
          // 1. Show the success message from the auth service's tap operator.
          // 2. Switch the form back to login mode.
          alert(response?.message || 'Registration successful! You may now log in.');
          this.toggleForm();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.error || 'Registration failed. Please try again.';
        }
      });
    } else {
      // Login Logic (remains the same)
      this.auth.login(email, password).subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err) => {
          this.errorMessage = err.error || 'Login failed: Invalid email or password.';
        }
      });
    }
  }
}