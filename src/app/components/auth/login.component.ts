import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-header">
          <div class="logo">
            <span class="logo-icon">🏛️</span>
          </div>
          <h1>PTMA Monitor</h1>
          <p>Sistem Monitoring Perguruan Tinggi<br>Muhammadiyah & Aisyiyah</p>
        </div>
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label>Username</label>
            <input type="text" formControlName="username" placeholder="Masukkan username" autocomplete="username">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" formControlName="password" placeholder="Masukkan password" autocomplete="current-password">
          </div>
          <div class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</div>
          <button type="submit" [disabled]="loading || loginForm.invalid" class="btn-login">
            {{ loading ? 'Masuk...' : 'Masuk' }}
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page { min-height:100vh; display:flex; align-items:center; justify-content:center;
      background: linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%); }
    .login-card { background:white; border-radius:16px; padding:40px; width:100%; max-width:400px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .login-header { text-align:center; margin-bottom:32px; }
    .logo { font-size:48px; margin-bottom:12px; }
    h1 { font-size:24px; font-weight:700; color:#1a237e; margin-bottom:4px; }
    p { color:#666; font-size:14px; line-height:1.5; }
    .form-group { margin-bottom:16px; }
    label { display:block; font-size:13px; font-weight:500; color:#444; margin-bottom:6px; }
    input { width:100%; padding:10px 14px; border:1px solid #ddd; border-radius:8px;
      font-size:14px; outline:none; transition:border-color 0.2s; }
    input:focus { border-color:#3949ab; box-shadow:0 0 0 3px rgba(57,73,171,0.1); }
    .error-msg { background:#fce8e6; color:#c5221f; padding:10px 14px; border-radius:8px;
      font-size:13px; margin-bottom:16px; }
    .btn-login { width:100%; padding:12px; background:#1a237e; color:white; border:none;
      border-radius:8px; font-size:15px; font-weight:600; cursor:pointer; transition:background 0.2s; }
    .btn-login:hover:not(:disabled) { background:#283593; }
    .btn-login:disabled { opacity:0.6; cursor:not-allowed; }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMsg = '';

  constructor(private fb: FormBuilder, private authService: AuthService,
    private router: Router, private route: ActivatedRoute) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    this.loading = true;
    this.errorMsg = '';
    const { username, password } = this.loginForm.value;
    this.authService.login(username, password).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      },
      error: () => {
        this.errorMsg = 'Username atau password salah.';
        this.loading = false;
      }
    });
  }
}
