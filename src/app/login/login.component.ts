import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { SocialAuthService, GoogleSigninButtonModule, SocialUser } from '@abacritt/angularx-social-login';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WelcomeModalComponent } from '../welcome-modal/welcome-modal.component';

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
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule, GoogleSigninButtonModule, MatDialogModule],
})
export class LoginComponent implements OnInit {
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
    private router: Router,
    private socialAuthService: SocialAuthService,
    private dialog: MatDialog
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

  ngOnInit() {
    this.socialAuthService.authState.subscribe((user: SocialUser) => {
      if (user && user.idToken) {
        this.auth.googleLogin(user.idToken).subscribe({
          next: (res) => {
            if (res.isNewUser) {
              const dialogRef = this.dialog.open(WelcomeModalComponent, {
                width: '500px',
                disableClose: true
              });
              dialogRef.afterClosed().subscribe(() => {
                this.router.navigate(['/dashboard']);
              });
            } else {
              this.router.navigate(['/dashboard']);
            }
          },
          error: (err) => {
            console.error('Google login failed', err);
            this.errorMessage = 'Google Login failed. Please try again.';
          }
        });
      }
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
          if (response.isNewUser) {
            const dialogRef = this.dialog.open(WelcomeModalComponent, {
              width: '500px',
              disableClose: true
            });
            dialogRef.afterClosed().subscribe(() => {
              this.router.navigate(['/dashboard']);
            });
          } else {
            this.router.navigate(['/dashboard']);
          }
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