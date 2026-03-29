import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment.prod';

@Component({
  selector: 'app-register',
  template: `
    <div class="page">
      <div class="card">

        <!-- Header -->
        <div class="card-header">
          <div class="brand">
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm-2 15v-5h4v5h3v-6.27l-5-2.73-5 2.73V18h3z"/>
            </svg>
            <span>PTMA Monitor</span>
          </div>
          <h2>Buat Akun Baru</h2>
          <p>Isi form di bawah untuk mendaftar. Akun akan aktif setelah disetujui admin.</p>
        </div>

        <!-- Form -->
        <ng-container *ngIf="!done">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">

            <div class="row-2">
              <div class="form-group">
                <label>Nama Depan <span class="req">*</span></label>
                <input type="text" formControlName="first_name" placeholder="Nama depan">
                <div class="err" *ngIf="fe('first_name')">{{ fe('first_name') }}</div>
              </div>
              <div class="form-group">
                <label>Nama Belakang</label>
                <input type="text" formControlName="last_name" placeholder="Nama belakang">
              </div>
            </div>

            <div class="form-group">
              <label>Username <span class="req">*</span></label>
              <input type="text" formControlName="username" placeholder="Huruf kecil, tanpa spasi"
                autocomplete="username">
              <div class="err" *ngIf="fe('username')">{{ fe('username') }}</div>
            </div>

            <div class="form-group">
              <label>Email <span class="req">*</span></label>
              <input type="email" formControlName="email" placeholder="nama@domain.ac.id"
                autocomplete="email">
              <div class="err" *ngIf="fe('email')">{{ fe('email') }}</div>
            </div>

            <div class="form-group">
              <label>Nomor Telepon / WA</label>
              <input type="text" formControlName="nomor_telepon" placeholder="08xx-xxxx-xxxx">
            </div>

            <div class="row-2">
              <div class="form-group">
                <label>Password <span class="req">*</span></label>
                <input type="password" formControlName="password" placeholder="Min. 8 karakter"
                  autocomplete="new-password">
                <div class="err" *ngIf="fe('password')">{{ fe('password') }}</div>
              </div>
              <div class="form-group">
                <label>Konfirmasi Password <span class="req">*</span></label>
                <input type="password" formControlName="confirm_password" placeholder="Ulangi password"
                  autocomplete="new-password">
                <div class="err" *ngIf="fe('confirm_password')">{{ fe('confirm_password') }}</div>
              </div>
            </div>

            <div class="err-global" *ngIf="errorMsg">{{ errorMsg }}</div>

            <button type="submit" class="btn-primary" [disabled]="loading">
              {{ loading ? 'Mendaftar...' : 'Daftar Sekarang' }}
            </button>
          </form>
        </ng-container>

        <!-- Sukses -->
        <ng-container *ngIf="done">
          <div class="success-box">
            <div class="success-icon">✓</div>
            <h3>Pendaftaran Berhasil!</h3>
            <p>Akun Anda telah dibuat dan sedang menunggu persetujuan admin.
              Anda akan dapat login setelah akun diaktifkan.</p>
          </div>
          <button class="btn-primary" (click)="router.navigate(['/login'])">Kembali ke Login</button>
        </ng-container>

        <!-- Footer link -->
        <div class="footer-link" *ngIf="!done">
          Sudah punya akun? <a (click)="router.navigate(['/login'])">Masuk</a>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; display:flex; align-items:center; justify-content:center;
      background: linear-gradient(135deg, #000d33 0%, #001f5b 50%, #1a237e 100%); padding:24px 16px; }
    .card { background:white; border-radius:16px; padding:36px 32px; width:100%; max-width:520px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.25); }

    .card-header { margin-bottom:24px; }
    .brand { display:flex; align-items:center; gap:8px; color:#1a237e; font-size:16px;
      font-weight:800; margin-bottom:16px; }
    .card-header h2 { font-size:22px; font-weight:800; color:#111827; margin:0 0 8px; }
    .card-header p { font-size:13px; color:#6b7280; line-height:1.5; margin:0; }

    .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .form-group { margin-bottom:16px; }
    .form-group label { display:block; font-size:13px; font-weight:600; color:#374151;
      margin-bottom:5px; }
    .req { color:#ef4444; }
    .form-group input { width:100%; padding:10px 12px; border:1.5px solid #e5e7eb;
      border-radius:8px; font-size:14px; outline:none; box-sizing:border-box;
      transition:border-color .2s; }
    .form-group input:focus { border-color:#3949ab; }
    .err { font-size:12px; color:#dc2626; margin-top:4px; }
    .err-global { background:#fef2f2; color:#dc2626; padding:10px 12px; border-radius:8px;
      font-size:13px; margin-bottom:14px; }

    .success-box { text-align:center; padding:20px 0 24px; }
    .success-icon { width:56px; height:56px; border-radius:50%; background:#dcfce7;
      color:#16a34a; font-size:26px; font-weight:700; display:flex; align-items:center;
      justify-content:center; margin:0 auto 16px; }
    .success-box h3 { font-size:18px; font-weight:700; color:#111827; margin:0 0 10px; }
    .success-box p { font-size:14px; color:#6b7280; line-height:1.6; max-width:380px; margin:0 auto; }

    .btn-primary { width:100%; padding:12px; background:#1a237e; color:white; border:none;
      border-radius:8px; font-size:15px; font-weight:700; cursor:pointer;
      transition:background .15s; margin-top:4px; }
    .btn-primary:hover:not(:disabled) { background:#283593; }
    .btn-primary:disabled { opacity:0.6; cursor:not-allowed; }

    .footer-link { text-align:center; margin-top:18px; font-size:13px; color:#6b7280; }
    .footer-link a { color:#1a237e; font-weight:600; cursor:pointer; text-decoration:none; }
    .footer-link a:hover { text-decoration:underline; }

    @media (max-width:480px) { .row-2 { grid-template-columns:1fr; } .card { padding:28px 20px; } }
  `]
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  done = false;
  errorMsg = '';
  fieldErrors: any = {};

  constructor(public router: Router, private fb: FormBuilder, private http: HttpClient) {
    this.form = this.fb.group({
      first_name:       ['', Validators.required],
      last_name:        [''],
      username:         ['', Validators.required],
      email:            ['', [Validators.required, Validators.email]],
      nomor_telepon:    [''],
      password:         ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required],
    });
  }

  fe(field: string): string {
    return this.fieldErrors[field] || '';
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    if (v.password !== v.confirm_password) {
      this.fieldErrors = { confirm_password: 'Konfirmasi password tidak cocok.' };
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.fieldErrors = {};
    const url = environment.apiUrl.replace('/api', '') + '/api/auth/register/';
    this.http.post(url, v).subscribe({
      next: () => { this.done = true; this.loading = false; },
      error: (err: any) => {
        const e = err?.error || {};
        if (typeof e === 'object' && !e.detail) {
          this.fieldErrors = e;
        } else {
          this.errorMsg = e.detail || 'Terjadi kesalahan. Coba lagi.';
        }
        this.loading = false;
      }
    });
  }
}
