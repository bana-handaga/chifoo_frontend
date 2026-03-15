import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-laporan',
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Laporan Perguruan Tinggi</h1>
        <p>Monitoring kepatuhan pelaporan PTMA</p>
      </div>

      <div class="summary-row" *ngIf="rekap">
        <div class="sum-item approved">✅ Disetujui<br><strong>{{ rekap.approved }}</strong></div>
        <div class="sum-item submitted">📤 Dikirim<br><strong>{{ rekap.submitted }}</strong></div>
        <div class="sum-item rejected">❌ Ditolak<br><strong>{{ rekap.rejected }}</strong></div>
        <div class="sum-item draft">📝 Draft<br><strong>{{ rekap.draft }}</strong></div>
        <div class="sum-item belum">⏳ Belum<br><strong>{{ rekap.belum }}</strong></div>
        <div class="sum-item total">📊 Kepatuhan<br><strong>{{ rekap.persen_kepatuhan }}%</strong></div>
      </div>

      <div class="card">
        <div class="filter-row">
          <select [(ngModel)]="filterStatus" (change)="loadData()">
            <option value="">Semua Status</option>
            <option value="approved">Disetujui</option>
            <option value="submitted">Dikirim</option>
            <option value="rejected">Ditolak</option>
            <option value="draft">Draft</option>
            <option value="belum">Belum</option>
          </select>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr><th>PT</th><th>Organisasi</th><th>Periode</th><th>Status</th><th>Pengisian</th><th>Dikirim</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let l of data">
                <td><strong>{{ l.pt_singkatan }}</strong><br><small>{{ l.pt_nama }}</small></td>
                <td><span [class]="'badge ' + (l.pt_organisasi==='muhammadiyah' ? 'badge-muh' : 'badge-ais')">
                  {{ l.pt_organisasi | titlecase }}</span></td>
                <td>{{ l.periode_nama }}</td>
                <td><span [class]="'status-badge status-' + l.status">{{ l.status_display }}</span></td>
                <td>
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="l.persentase_pengisian"></div>
                  </div>
                  <small>{{ l.persentase_pengisian }}%</small>
                </td>
                <td><small>{{ l.submitted_at ? (l.submitted_at | date:'dd/MM/yyyy') : '-' }}</small></td>
                <td class="aksi-col">
                  <button *ngIf="l.status==='submitted'" class="btn-sm btn-approve" (click)="approve(l.id)">Setujui</button>
                  <button *ngIf="l.status==='submitted'" class="btn-sm btn-reject" (click)="reject(l.id)">Tolak</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="loading-overlay" *ngIf="loading"><div class="spinner"></div></div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 20px; }
    .page-header h1 { font-size: 22px; font-weight: 700; color: #1a237e; }
    .page-header p { color: #666; font-size: 13px; }

    .summary-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 16px; }
    .sum-item {
      background: white; border-radius: 10px; padding: 14px 12px;
      font-size: 12px; color: #555;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center;
    }
    .sum-item strong { display: block; font-size: 22px; font-weight: 700; margin-top: 4px; }
    .sum-item.approved strong { color: #137333; }
    .sum-item.submitted strong { color: #1a73e8; }
    .sum-item.rejected strong { color: #c5221f; }
    .sum-item.total    strong { color: #1a237e; }

    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); position: relative; }
    .filter-row { margin-bottom: 16px; }
    select { padding: 7px 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 13px; }
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { padding: 10px 12px; background: #f8f9fa; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e9ecef; white-space: nowrap; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    small { color: #888; font-size: 11px; }
    .badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
    .badge-muh { background: #e3f2fd; color: #1565c0; }
    .badge-ais { background: #fce4ec; color: #c62828; }
    .status-badge { padding: 3px 10px; border-radius: 10px; font-size: 11px; font-weight: 500; white-space: nowrap; }
    .status-approved { background: #e6f4ea; color: #137333; }
    .status-submitted { background: #e8f0fe; color: #1a73e8; }
    .status-rejected  { background: #fce8e6; color: #c5221f; }
    .status-draft     { background: #fff3e0; color: #e65100; }
    .status-belum     { background: #f1f3f4; color: #5f6368; }
    .progress-bar { height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; margin-bottom: 3px; min-width: 60px; }
    .progress-fill { height: 100%; background: #1a237e; border-radius: 3px; }
    .aksi-col { white-space: nowrap; }
    .btn-sm { padding: 4px 10px; border-radius: 6px; font-size: 11px; cursor: pointer; border: none; margin-right: 4px; }
    .btn-approve { background: #e6f4ea; color: #137333; }
    .btn-reject  { background: #fce8e6; color: #c5221f; }
    .loading-overlay {
      position: absolute; inset: 0; background: rgba(255,255,255,0.7);
      display: flex; align-items: center; justify-content: center; border-radius: 12px;
    }
    .spinner {
      width: 36px; height: 36px; border: 3px solid #eee; border-top-color: #1a237e;
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Tablet */
    @media (max-width: 1024px) {
      .summary-row { grid-template-columns: repeat(3, 1fr); }
    }

    /* Mobile */
    @media (max-width: 767px) {
      .page-header h1 { font-size: 18px; }
      .summary-row { grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .sum-item { padding: 10px 8px; font-size: 11px; }
      .sum-item strong { font-size: 18px; }
      .card { padding: 12px; }
      th, td { padding: 8px 10px; font-size: 12px; }
    }

    @media (max-width: 480px) {
      .summary-row { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class LaporanComponent implements OnInit {
  data: any[] = [];
  rekap: any;
  loading = true;
  filterStatus = '';

  constructor(private api: ApiService) {}
  ngOnInit() { this.loadData(); this.api.getRekapKepatuhan().subscribe({ next: d => this.rekap = d, error: () => {} }); }
  loadData() {
    this.loading = true;
    const params: any = {};
    if (this.filterStatus) params['status'] = this.filterStatus;
    this.api.getLaporanList(params).subscribe({
      next: res => { this.data = res.results || res; this.loading = false; },
      error: () => this.loading = false
    });
  }
  approve(id: number) {
    const catatan = prompt('Catatan reviewer (opsional):') || '';
    this.api.approveLaporan(id, catatan).subscribe({ next: () => this.loadData(), error: () => {} });
  }
  reject(id: number) {
    const catatan = prompt('Alasan penolakan:') || '';
    this.api.rejectLaporan(id, catatan).subscribe({ next: () => this.loadData(), error: () => {} });
  }
}
