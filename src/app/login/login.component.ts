import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

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
      email: ['', Validators.required],
      password: ['', Validators.required],
      confirmPassword: ['']
    });
  }

  toggleForm() {
    this.isRegister = !this.isRegister;
    this.errorMessage = '';
    if (this.isRegister) {
      this.loginForm.get('confirmPassword')?.setValidators(Validators.required);
      this.loginForm.get('name')?.setValidators(Validators.required);
      this.loginForm.get('contact')?.setValidators(Validators.required);
    } else {
      this.loginForm.get('confirmPassword')?.clearValidators();
    }
    this.loginForm.get('confirmPassword')?.updateValueAndValidity();
    this.loginForm.get('name')?.updateValueAndValidity();
    this.loginForm.get('contact')?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      return;
    }
    

    const { email, password, confirmPassword , name, contact} = this.loginForm.value;

    if (this.isRegister) {
      //validate if all fields are filled
      if (!name || !contact || !email || !password || !confirmPassword) {
        this.errorMessage = 'Please fill in all fields';
        return;
      }
      if (password !== confirmPassword) {
        this.errorMessage = 'Passwords do not match';
        return;
      }
      // this.auth.register(username, password).subscribe({
      //   next: () => this.router.navigate(['/home']),
      //   error: (err) => {
      //     this.errorMessage = err.error?.message || 'Registration failed';
      //   }
      // });
      this.auth.register(name, contact, email, password).subscribe({
        next: () => this.router.navigate(['/home']),
        error: (err) => {
          console.log(err);
          this.errorMessage = err.error?.message || 'Registration failed';
        }
      });
    } else {
      this.auth.login(email, password).subscribe({
        next: () => this.router.navigate(['/home']),
        error: (err) => {
          this.errorMessage = err.error?.message || 'Login failed';
        }
      });
    }
  }
}