import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  template: `
    <div class="profile-page">
      <div class="profile-header">
        <div class="profile-avatar">{{ userInitial }}</div>
        <div class="profile-title">
          <h2>{{ user?.first_name ? user.first_name + ' ' + (user.last_name || '') : user?.username }}</h2>
          <span class="role-badge">{{ user?.role_display || user?.role }}</span>
        </div>
      </div>

      <div class="profile-grid">

        <!-- Informasi Akun -->
        <div class="card">
          <div class="card-title">Informasi Akun</div>
          <div class="info-row"><span class="info-label">Username</span><span>{{ user?.username }}</span></div>
          <div class="info-row"><span class="info-label">Nama Lengkap</span><span>{{ (user?.first_name || '') + ' ' + (user?.last_name || '') || '-' }}</span></div>
          <div class="info-row"><span class="info-label">Email</span><span>{{ user?.email || '-' }}</span></div>
          <div class="info-row"><span class="info-label">Peran</span><span>{{ user?.role_display || '-' }}</span></div>
          <div class="info-row" *ngIf="user?.pt_nama"><span class="info-label">Perguruan Tinggi</span><span>{{ user?.pt_nama }}</span></div>
          <div class="info-row"><span class="info-label">MFA Email</span>
            <span class="badge" [class.badge-on]="user?.mfa_enabled" [class.badge-off]="!user?.mfa_enabled">
              {{ user?.mfa_enabled ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>
        </div>

        <!-- Update Email -->
        <div class="card">
          <div class="card-title">Perbarui Email</div>
          <form [formGroup]="emailForm" (ngSubmit)="onUpdateEmail()">
            <div class="form-group">
              <label>Email Baru</label>
              <input type="email" formControlName="email" placeholder="Masukkan email baru">
            </div>
            <div class="form-group">
              <label>Konfirmasi Password</label>
              <input type="password" formControlName="password" placeholder="Masukkan password Anda">
            </div>
            <div class="msg msg-error" *ngIf="emailMsg.error">{{ emailMsg.error }}</div>
            <div class="msg msg-success" *ngIf="emailMsg.success">{{ emailMsg.success }}</div>
            <button type="submit" class="btn-primary" [disabled]="emailLoading || emailForm.invalid">
              {{ emailLoading ? 'Menyimpan...' : 'Simpan Email' }}
            </button>
          </form>
        </div>

        <!-- Ganti Password -->
        <div class="card">
          <div class="card-title">Ganti Password</div>
          <form [formGroup]="pwForm" (ngSubmit)="onUpdatePassword()">
            <div class="form-group">
              <label>Password Lama</label>
              <input type="password" formControlName="old_password" placeholder="Masukkan password lama">
            </div>
            <div class="form-group">
              <label>Password Baru</label>
              <input type="password" formControlName="new_password" placeholder="Minimal 8 karakter">
            </div>
            <div class="form-group">
              <label>Konfirmasi Password Baru</label>
              <input type="password" formControlName="confirm_password" placeholder="Ulangi password baru">
            </div>
            <div class="msg msg-error" *ngIf="pwMsg.error">{{ pwMsg.error }}</div>
            <div class="msg msg-success" *ngIf="pwMsg.success">{{ pwMsg.success }}</div>
            <button type="submit" class="btn-primary" [disabled]="pwLoading || pwForm.invalid">
              {{ pwLoading ? 'Menyimpan...' : 'Ganti Password' }}
            </button>
          </form>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .profile-page { max-width: 900px; margin: 0 auto; padding: 24px 16px; }

    .profile-header {
      display: flex; align-items: center; gap: 20px; margin-bottom: 28px;
      background: white; border-radius: 16px; padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    .profile-avatar {
      width: 64px; height: 64px; border-radius: 50%;
      background: linear-gradient(135deg, #1a237e, #3949ab);
      color: white; font-size: 28px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .profile-title h2 { margin: 0 0 6px; font-size: 20px; color: #1f2937; }
    .role-badge {
      display: inline-block; background: #e8f0fe; color: #1a237e;
      padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
    }

    .profile-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    }
    .card:first-child { grid-column: 1 / -1; }
    @media (max-width: 640px) { .profile-grid { grid-template-columns: 1fr; } .card:first-child { grid-column: auto; } }

    .card {
      background: white; border-radius: 16px; padding: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    }
    .card-title { font-size: 15px; font-weight: 700; color: #1a237e; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }

    .info-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid #f9f9f9; font-size: 14px; color: #374151; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6b7280; font-size: 13px; min-width: 130px; }
    .badge { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-on { background: #dcfce7; color: #16a34a; }
    .badge-off { background: #f3f4f6; color: #6b7280; }

    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .form-group input {
      width: 100%; padding: 10px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px;
      font-size: 14px; outline: none; box-sizing: border-box; transition: border-color .2s;
    }
    .form-group input:focus { border-color: #3949ab; }

    .msg { padding: 10px 12px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }
    .msg-error { background: #fef2f2; color: #dc2626; }
    .msg-success { background: #f0fdf4; color: #16a34a; }

    .btn-primary {
      background: #1a237e; color: white; border: none; border-radius: 8px;
      padding: 10px 24px; font-size: 14px; font-weight: 600; cursor: pointer;
      transition: background .15s;
    }
    .btn-primary:hover:not(:disabled) { background: #283593; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  `]
})
export class ProfileComponent implements OnInit {
  user: any;
  emailForm: FormGroup;
  pwForm: FormGroup;
  emailLoading = false;
  pwLoading = false;
  emailMsg: { error?: string; success?: string } = {};
  pwMsg: { error?: string; success?: string } = {};

  constructor(private authService: AuthService, private fb: FormBuilder) {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
    this.pwForm = this.fb.group({
      old_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required],
    });
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(u => this.user = u);
    this.authService.refreshCurrentUser();
  }

  get userInitial(): string {
    const name = this.user?.first_name || this.user?.username || '';
    return name.charAt(0).toUpperCase();
  }

  onUpdateEmail() {
    if (this.emailForm.invalid) return;
    this.emailLoading = true;
    this.emailMsg = {};
    const { email, password } = this.emailForm.value;
    this.authService.updateEmail(email, password).subscribe({
      next: (res: any) => {
        this.emailMsg.success = res.detail;
        this.emailForm.reset();
        this.emailLoading = false;
      },
      error: (err: any) => {
        this.emailMsg.error = err?.error?.detail || 'Gagal memperbarui email.';
        this.emailLoading = false;
      }
    });
  }

  onUpdatePassword() {
    if (this.pwForm.invalid) return;
    const { new_password, confirm_password } = this.pwForm.value;
    if (new_password !== confirm_password) {
      this.pwMsg.error = 'Konfirmasi password tidak cocok.';
      return;
    }
    this.pwLoading = true;
    this.pwMsg = {};
    const { old_password } = this.pwForm.value;
    this.authService.updatePassword(old_password, new_password, confirm_password).subscribe({
      next: (res: any) => {
        this.pwMsg.success = res.detail;
        this.pwForm.reset();
        this.pwLoading = false;
      },
      error: (err: any) => {
        this.pwMsg.error = err?.error?.detail || 'Gagal mengganti password.';
        this.pwLoading = false;
      }
    });
  }
}
