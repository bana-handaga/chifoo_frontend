import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment.prod';

const API = environment.apiUrl;

const HARI = [
  { value: 0, label: 'Senin' }, { value: 1, label: 'Selasa' },
  { value: 2, label: 'Rabu' },  { value: 3, label: 'Kamis' },
  { value: 4, label: 'Jumat' }, { value: 5, label: 'Sabtu' },
  { value: 6, label: 'Minggu' },
];

@Component({
  selector: 'app-sync',
  template: `
<div class="sync-page">
  <div class="page-header">
    <h1>Sinkronisasi PDDikti</h1>
    <p>Kelola jadwal sinkronisasi data perguruan tinggi dari PDDikti</p>
  </div>

  <!-- Daftar Jadwal -->
  <div class="card">
    <div class="card-header">
      <h2>Jadwal Aktif</h2>
      <button class="btn-primary" (click)="showForm=true; editId=null; resetForm()" *ngIf="!showForm">
        + Tambah Jadwal
      </button>
    </div>

    <div class="empty-state" *ngIf="jadwals.length === 0 && !loading">
      Belum ada jadwal sinkronisasi.
    </div>
    <div class="loading" *ngIf="loading">Memuat...</div>

    <table class="jadwal-table" *ngIf="jadwals.length > 0">
      <thead>
        <tr>
          <th>Tipe Sync</th>
          <th>PT</th>
          <th>Jadwal</th>
          <th>Waktu</th>
          <th>Status</th>
          <th>Terakhir Dijalankan</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let j of jadwals" [class.inactive]="!j.is_active">
          <td>
            <span class="badge" [class.badge-blue]="j.tipe_sync==='prodi_dosen'" [class.badge-purple]="j.tipe_sync==='detail_dosen'">
              {{ j.tipe_sync_label }}
            </span>
          </td>
          <td>
            <span *ngIf="j.mode_pt==='semua'" class="text-muted">Semua PT</span>
            <span *ngIf="j.mode_pt==='pilihan'">
              {{ j.pt_list.length }} PT dipilih
              <div class="pt-tooltip" *ngIf="j.pt_list.length > 0">
                <span class="pt-tag" *ngFor="let p of j.pt_list">{{ p.singkatan }}</span>
              </div>
            </span>
          </td>
          <td>{{ j.tipe_jadwal_label }}</td>
          <td class="waktu-cell">
            <span class="hari">{{ j.hari_mulai_label }}</span> {{ j.jam_mulai }}
            <span class="arrow">→</span>
            <span class="hari">{{ j.hari_selesai_label }}</span> {{ j.jam_selesai }}
          </td>
          <td>
            <span class="status-badge" [ngClass]="'status-'+j.status_terakhir">
              {{ statusLabel(j.status_terakhir) }}
            </span>
            <div class="toggle-wrap">
              <label class="toggle-switch">
                <input type="checkbox" [checked]="j.is_active" (change)="toggleAktif(j, $event)">
                <span class="slider"></span>
              </label>
            </div>
          </td>
          <td class="text-muted">{{ j.last_run ? formatDate(j.last_run) : '-' }}</td>
          <td class="aksi-cell">
            <button class="btn-icon btn-edit" (click)="editJadwal(j)" title="Edit">✏️</button>
            <button class="btn-icon btn-del" (click)="hapusJadwal(j.id)" title="Hapus">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Form Tambah / Edit -->
  <div class="card form-card" *ngIf="showForm">
    <h2>{{ editId ? 'Edit Jadwal' : 'Tambah Jadwal Baru' }}</h2>
    <form [formGroup]="form" (ngSubmit)="simpan()">

      <!-- Tipe Sync -->
      <div class="form-row">
        <div class="form-group">
          <label>Tipe Sinkronisasi</label>
          <select formControlName="tipe_sync">
            <option value="prodi_dosen">Prodi + Dosen + Mahasiswa</option>
            <option value="detail_dosen">Detail Dosen</option>
          </select>
        </div>
      </div>

      <!-- Pilih PT -->
      <div class="form-row">
        <div class="form-group full">
          <label>Cakupan PT</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" formControlName="mode_pt" value="semua"> Semua PT
            </label>
            <label class="radio-label">
              <input type="radio" formControlName="mode_pt" value="pilihan"> PT Tertentu
            </label>
          </div>
        </div>
      </div>

      <!-- PT Selector (muncul jika pilihan) -->
      <div class="form-row" *ngIf="form.get('mode_pt')?.value === 'pilihan'">
        <div class="form-group full">
          <label>Pilih PT <span class="text-muted">({{ selectedPtIds.length }} dipilih)</span></label>
          <div class="pt-search-wrap">
            <input type="text" [(ngModel)]="ptSearch" [ngModelOptions]="{standalone:true}"
              placeholder="Cari nama PT..." class="pt-search-input">
          </div>
          <div class="pt-selector">
            <label class="pt-check" *ngFor="let pt of filteredPtList">
              <input type="checkbox" [checked]="selectedPtIds.includes(pt.id)"
                (change)="togglePt(pt.id, $event)">
              <span class="pt-name">{{ pt.singkatan }}</span>
              <span class="pt-full">{{ pt.nama }}</span>
            </label>
            <div class="empty-state" *ngIf="filteredPtList.length === 0">Tidak ada PT ditemukan.</div>
          </div>
        </div>
      </div>

      <!-- Tipe Jadwal -->
      <div class="form-row">
        <div class="form-group full">
          <label>Frekuensi</label>
          <div class="radio-group">
            <label class="radio-label">
              <input type="radio" formControlName="tipe_jadwal" value="harian"> Rutin setiap hari
            </label>
            <label class="radio-label">
              <input type="radio" formControlName="tipe_jadwal" value="sekali"> Sekali saja
            </label>
          </div>
        </div>
      </div>

      <!-- Waktu Mulai & Selesai -->
      <div class="form-row">
        <div class="form-group">
          <label>Hari Mulai</label>
          <select formControlName="hari_mulai">
            <option *ngFor="let h of hariList" [value]="h.value">{{ h.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Jam Mulai</label>
          <input type="time" formControlName="jam_mulai">
        </div>
        <div class="form-group">
          <label>Hari Selesai</label>
          <select formControlName="hari_selesai">
            <option *ngFor="let h of hariList" [value]="h.value">{{ h.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Jam Selesai</label>
          <input type="time" formControlName="jam_selesai">
        </div>
      </div>

      <!-- Aktif -->
      <div class="form-row">
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" formControlName="is_active"> Aktifkan jadwal ini
          </label>
        </div>
      </div>

      <div class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</div>

      <div class="form-actions">
        <button type="submit" class="btn-primary" [disabled]="saving">
          {{ saving ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Buat Jadwal') }}
        </button>
        <button type="button" class="btn-secondary" (click)="batalForm()">Batal</button>
      </div>
    </form>
  </div>

  <!-- Info Box -->
  <div class="info-box">
    <h3>ℹ️ Catatan</h3>
    <ul>
      <li><strong>Prodi + Dosen + Mahasiswa</strong>: Sync data prodi, jumlah dosen, dan data mahasiswa per semester dari tabel utama PDDikti.</li>
      <li><strong>Detail Dosen</strong>: Sync profil lengkap dan riwayat pendidikan individu dosen dari halaman detail PDDikti.</li>
      <li>Jadwal ini dicatat di sistem — eksekusi otomatis memerlukan cron job di server.</li>
      <li>Rentang waktu <strong>Hari Mulai s/d Hari Selesai</strong> menentukan window sync yang diperbolehkan berjalan.</li>
    </ul>
  </div>
</div>
  `,
  styles: [`
    .sync-page { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .page-header h1 { font-size: 22px; font-weight: 700; color: #1a237e; margin: 0 0 4px; }
    .page-header p { color: #6b7280; font-size: 14px; margin: 0; }

    .card { background: #fff; border-radius: 12px; box-shadow: 0 1px 6px rgba(0,0,0,.08); padding: 24px; margin-bottom: 24px; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .card-header h2 { font-size: 16px; font-weight: 700; color: #1f2937; margin: 0; }
    h2 { font-size: 16px; font-weight: 700; color: #1f2937; margin: 0 0 20px; }

    .btn-primary { background: #1a237e; color: #fff; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { background: #283593; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary { background: #f3f4f6; color: #374151; border: none; border-radius: 8px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-secondary:hover { background: #e5e7eb; }
    .btn-icon { background: none; border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px 8px; cursor: pointer; font-size: 14px; }
    .btn-icon:hover { background: #f9fafb; }

    .empty-state { color: #9ca3af; font-size: 14px; padding: 20px 0; text-align: center; }
    .loading { color: #6b7280; font-size: 14px; padding: 16px 0; }

    .jadwal-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .jadwal-table th { background: #f9fafb; padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
    .jadwal-table td { padding: 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
    .jadwal-table tr.inactive td { opacity: .5; }
    .jadwal-table tr:last-child td { border-bottom: none; }

    .badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .badge-blue { background: #e8f0fe; color: #1a237e; }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }

    .waktu-cell { font-size: 12px; white-space: nowrap; }
    .hari { font-weight: 600; color: #374151; }
    .arrow { color: #9ca3af; margin: 0 4px; }

    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .status-menunggu { background: #fef3c7; color: #92400e; }
    .status-berjalan { background: #dbeafe; color: #1e40af; }
    .status-selesai  { background: #dcfce7; color: #166534; }
    .status-error    { background: #fee2e2; color: #991b1b; }

    .toggle-wrap { margin-top: 6px; }
    .toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 99px; cursor: pointer; transition: .2s; }
    .slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; bottom: 3px; background: #fff; border-radius: 50%; transition: .2s; }
    input:checked + .slider { background: #1a237e; }
    input:checked + .slider::before { transform: translateX(16px); }

    .aksi-cell { white-space: nowrap; }
    .aksi-cell button { margin-right: 4px; }
    .text-muted { color: #9ca3af; font-size: 12px; }

    .pt-tooltip { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px; }
    .pt-tag { background: #e8f0fe; color: #1a237e; border-radius: 4px; padding: 1px 6px; font-size: 11px; }

    /* Form */
    .form-card { border: 2px solid #e8f0fe; }
    .form-row { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .form-group { flex: 1; min-width: 160px; }
    .form-group.full { flex: 100%; }
    .form-group label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .form-group select, .form-group input[type=time] { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; outline: none; }
    .form-group select:focus, .form-group input[type=time]:focus { border-color: #1a237e; box-shadow: 0 0 0 3px rgba(26,35,126,.1); }

    .radio-group { display: flex; gap: 20px; flex-wrap: wrap; }
    .radio-label { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; color: #374151; }
    .radio-label input { cursor: pointer; }

    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: #374151; }
    .checkbox-label input { cursor: pointer; }

    .pt-search-wrap { margin-bottom: 8px; }
    .pt-search-input { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; outline: none; box-sizing: border-box; }
    .pt-search-input:focus { border-color: #1a237e; }
    .pt-selector { max-height: 240px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px 0; }
    .pt-check { display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; font-size: 13px; }
    .pt-check:hover { background: #f9fafb; }
    .pt-check input { cursor: pointer; flex-shrink: 0; }
    .pt-name { font-weight: 600; color: #1a237e; min-width: 100px; }
    .pt-full { color: #6b7280; font-size: 12px; }

    .form-actions { display: flex; gap: 10px; margin-top: 8px; }
    .error-msg { background: #fee2e2; color: #991b1b; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 12px; }

    .info-box { background: #f0f4ff; border-radius: 12px; padding: 20px 24px; }
    .info-box h3 { font-size: 14px; font-weight: 700; color: #1a237e; margin: 0 0 10px; }
    .info-box ul { margin: 0; padding-left: 20px; color: #374151; font-size: 13px; line-height: 1.8; }
  `]
})
export class SyncComponent implements OnInit {
  jadwals: any[] = [];
  ptList: any[]  = [];
  hariList = HARI;
  loading  = false;
  showForm = false;
  editId: number | null = null;
  saving   = false;
  errorMsg = '';

  form!: FormGroup;
  selectedPtIds: number[] = [];
  ptSearch = '';

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit() {
    this.loadJadwal();
    this.loadPtList();
    this.initForm();
  }

  initForm() {
    this.form = this.fb.group({
      tipe_sync:    ['prodi_dosen'],
      mode_pt:      ['semua'],
      tipe_jadwal:  ['harian'],
      hari_mulai:   [0],
      jam_mulai:    ['23:00', Validators.required],
      hari_selesai: [6],
      jam_selesai:  ['05:00', Validators.required],
      is_active:    [true],
    });
  }

  resetForm() {
    this.form.reset({
      tipe_sync: 'prodi_dosen', mode_pt: 'semua', tipe_jadwal: 'harian',
      hari_mulai: 0, jam_mulai: '23:00', hari_selesai: 6, jam_selesai: '05:00', is_active: true,
    });
    this.selectedPtIds = [];
    this.ptSearch = '';
    this.errorMsg = '';
  }

  get filteredPtList() {
    if (!this.ptSearch) return this.ptList;
    const q = this.ptSearch.toLowerCase();
    return this.ptList.filter(p =>
      p.nama.toLowerCase().includes(q) || p.singkatan.toLowerCase().includes(q)
    );
  }

  togglePt(id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedPtIds.includes(id)) this.selectedPtIds = [...this.selectedPtIds, id];
    } else {
      this.selectedPtIds = this.selectedPtIds.filter(x => x !== id);
    }
  }

  loadJadwal() {
    this.loading = true;
    this.http.get<any[]>(`${API}/universities/sync/jadwal/`).subscribe({
      next: data => { this.jadwals = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadPtList() {
    this.http.get<any[]>(`${API}/universities/sync/pt-list/`).subscribe({
      next: data => this.ptList = data,
    });
  }

  simpan() {
    if (this.form.invalid) return;
    this.saving = true;
    this.errorMsg = '';
    const payload = {
      ...this.form.value,
      hari_mulai:   Number(this.form.value.hari_mulai),
      hari_selesai: Number(this.form.value.hari_selesai),
      pt_ids: this.form.value.mode_pt === 'pilihan' ? this.selectedPtIds : [],
    };

    const req = this.editId
      ? this.http.put(`${API}/universities/sync/jadwal/${this.editId}/`, payload)
      : this.http.post(`${API}/universities/sync/jadwal/`, payload);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.editId = null;
        this.loadJadwal();
      },
      error: (err: any) => {
        this.saving = false;
        this.errorMsg = err?.error?.detail || 'Gagal menyimpan jadwal.';
      }
    });
  }

  editJadwal(j: any) {
    this.editId  = j.id;
    this.showForm = true;
    this.form.patchValue({
      tipe_sync:    j.tipe_sync,
      mode_pt:      j.mode_pt,
      tipe_jadwal:  j.tipe_jadwal,
      hari_mulai:   j.hari_mulai,
      jam_mulai:    j.jam_mulai,
      hari_selesai: j.hari_selesai,
      jam_selesai:  j.jam_selesai,
      is_active:    j.is_active,
    });
    this.selectedPtIds = j.pt_list.map((p: any) => p.id);
    this.errorMsg = '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  hapusJadwal(id: number) {
    if (!confirm('Hapus jadwal ini?')) return;
    this.http.delete(`${API}/universities/sync/jadwal/${id}/`).subscribe({
      next: () => this.loadJadwal(),
      error: (err: any) => alert(err?.error?.detail || 'Gagal menghapus.'),
    });
  }

  toggleAktif(j: any, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.http.put(`${API}/universities/sync/jadwal/${j.id}/`, { ...j, is_active: checked, pt_ids: j.pt_list.map((p:any) => p.id) }).subscribe({
      next: () => { j.is_active = checked; },
      error: () => { (event.target as HTMLInputElement).checked = !checked; }
    });
  }

  batalForm() {
    this.showForm = false;
    this.editId = null;
    this.resetForm();
  }

  statusLabel(s: string) {
    const m: any = { menunggu: 'Menunggu', berjalan: 'Berjalan', selesai: 'Selesai', error: 'Error' };
    return m[s] || s;
  }

  formatDate(iso: string) {
    return new Date(iso).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });
  }
}
