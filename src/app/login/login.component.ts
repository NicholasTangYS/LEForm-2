import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
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
  registerForm: FormGroup;
  errorMessage = '';
  isRegister = false;
  isForgotPassword = false;
  isResettingPassword = false;

  forgotPasswordEmail = new FormControl('', [Validators.required, Validators.email]);
  resetPasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });

    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      contact: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordsMatchValidator });

    this.resetPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      resetCode: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  /**
   * Toggles the form between Login and Register modes.
   * Resets the form and manages validators for each mode.
   */
  toggleForm() {
    this.isRegister = !this.isRegister;
    console.log(`Switching to Register Mode: ${this.isRegister}`);
    this.errorMessage = '';
    this.isForgotPassword = false;
    this.isResettingPassword = false;
    this.loginForm.reset();
    this.registerForm.reset();
}

  showForgotPassword() {
    this.isForgotPassword = true;
    this.isRegister = false;
    this.isResettingPassword = false;
    this.errorMessage = '';
    this.loginForm.reset();
  }

  showLogin() {
    this.isForgotPassword = false;
    this.isResettingPassword = false;
    this.isRegister = false;
    this.errorMessage = '';
    this.loginForm.reset();
    this.registerForm.reset();
    this.forgotPasswordEmail.reset();
  }

   getInvalidControls() {
    const invalidControls: string[] = [];
    const controls = this.loginForm.controls;

    for (const name in controls) {
      if (controls[name].invalid) {
        // Push the name of the control (e.g., 'email', 'password')
        invalidControls.push(name);
        
        // Optional: Log the specific error object for debugging
        // console.log(`Control ${name} errors:`, controls[name].errors);
      }
    }
    return invalidControls;
  }
  onSubmit() {
    if (this.isRegister) {
      if (this.registerForm.invalid) {
        this.registerForm.markAllAsTouched();
        return;
      }
      const { name, contact, email, password } = this.registerForm.value;
      // Registration Logic
      this.auth.register(name, contact, email, password).subscribe({
        next: (response) => {
          // On successful registration:
          // 1. Show the success message from the auth service's tap operator.
          // 2. Switch the form back to login mode.
          alert('Registration successful! You may now log in.');
          this.toggleForm();
        },
        error: (err) => {
          this.errorMessage = err.error?.message || err.error || 'Registration failed. Please try again.';
        }
      });
    } else {
      if (this.loginForm.invalid) {
        this.loginForm.markAllAsTouched();
        return;
      }
      const { email, password } = this.loginForm.value;
      // Login Logic
      this.auth.login(email, password).subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err) => {
          this.errorMessage = err.error || 'Login failed: Invalid email or password.';
        }
      });
    }
  }

  onForgotPassword() {
   
    if (this.forgotPasswordEmail.invalid) {
      this.forgotPasswordEmail.markAsTouched();
      return;
    }

    const email = this.forgotPasswordEmail.value!;
    this.auth.requestPasswordReset(email).subscribe({
      next: (response) => {
        alert(response.message);
        // Prepare the next form
        this.isForgotPassword = false;
        this.isResettingPassword = true;
        this.resetPasswordForm.get('email')?.setValue(email);
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'An error occurred. Please try again.';
      }
    });
  }

  onResetPassword() {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const { email, resetCode, newPassword } = this.resetPasswordForm.value;
    this.auth.resetPassword(email, resetCode, newPassword).subscribe({
      next: (response) => {
        alert(response.message);
        this.showLogin(); // Go back to the login screen
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to reset password. The code may be invalid or expired.';
      }
    });
  }
}