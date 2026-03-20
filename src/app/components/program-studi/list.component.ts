import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild, NgZone } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../services/api.service';
import * as XLSX from 'xlsx';
import {
  Chart, BarController, BarElement,
  ArcElement, DoughnutController,
  LinearScale, CategoryScale, Tooltip, Legend
} from 'chart.js';

Chart.register(BarController, BarElement, ArcElement, DoughnutController, LinearScale, CategoryScale, Tooltip, Legend);

interface ProdiGroup {
  nama: string;
  jenjang: string;
  jenjang_display: string;
  jumlah_pt: number;
  total_mahasiswa: number;
  total_dosen: number;
}

type SortKey = 'nama' | 'jenjang' | 'jumlah_pt' | 'total_mahasiswa' | 'total_dosen' | 'rata_rata';

@Component({
  selector: 'app-program-studi-list',
  template: `
<div class="page-wrap">

  <!-- Header -->
  <div class="page-header">
    <div class="page-header__title">
      <h1>Program Studi PTMA</h1>
      <p class="page-header__sub">Pengelompokan program studi berdasarkan nama dan jenjang</p>
      <div class="periode-badge" *ngIf="periodeLabel">
        <span class="periode-badge__dot"></span>
        Periode Pelaporan Aktif: <strong>{{ periodeLabel }}</strong>
      </div>
    </div>
  </div>

  <!-- Accordion Pencarian Prodi -->
  <div class="ps-accordion" [class.open]="psOpen">
    <button class="ps-toggle" (click)="togglePs()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      Cari Program Studi
      <span class="ps-chevron" [class.rotated]="psOpen">▾</span>
    </button>

    <div class="ps-body" *ngIf="psOpen">
      <div class="ps-fields">
        <div class="psf">
          <label>Nama Program Studi</label>
          <input type="text" [(ngModel)]="psForm.nama" placeholder="Ketik nama prodi..." (keyup.enter)="runPs()">
        </div>
        <div class="psf">
          <label>Jenjang</label>
          <select [(ngModel)]="psForm.jenjang">
            <option value="">— Semua —</option>
            <option value="d1">D1</option><option value="d2">D2</option>
            <option value="d3">D3</option><option value="d4">D4 / Sarjana Terapan</option>
            <option value="s1">S1</option><option value="profesi">Profesi</option>
            <option value="s2">S2</option><option value="s3">S3</option>
          </select>
        </div>
        <div class="psf psf--action">
          <button class="ps-btn-search" (click)="runPs()" [disabled]="psSearching">
            {{ psSearching ? 'Mencari...' : 'Cari' }}
          </button>
          <button class="ps-btn-reset" (click)="resetPs()" *ngIf="psDone">Reset</button>
        </div>
      </div>

      <!-- Hasil -->
      <div class="ps-results" *ngIf="psDone">
        <div class="ps-results__header">
          <div class="ps-results__info">
            Ditemukan <strong>{{ psTotal | number }}</strong> program studi
            <span *ngIf="psTotalPages > 1"> — halaman {{ psPage }} / {{ psTotalPages }}</span>
          </div>
          <div class="ps-actions">
            <div class="ps-pagination" *ngIf="psTotalPages > 1">
              <button [disabled]="psPage===1" (click)="goPs(psPage-1)">‹ Prev</button>
              <span>{{ psPage }} / {{ psTotalPages }}</span>
              <button [disabled]="psPage===psTotalPages" (click)="goPs(psPage+1)">Next ›</button>
            </div>
            <div class="ps-export-btns">
              <button class="ps-exp ps-exp--csv"  (click)="exportPs('csv')">CSV</button>
              <button class="ps-exp ps-exp--xlsx" (click)="exportPs('xlsx')">XLSX</button>
              <button class="ps-exp ps-exp--pdf"  (click)="exportPs('pdf')">PDF</button>
            </div>
          </div>
        </div>
        <div class="ps-table-wrap">
          <table class="ps-table">
            <thead>
              <tr>
                <th (click)="setPsSort('nama_prodi')" class="ps-sortable">Nama Prodi <span class="ps-si">{{ psSortIcon('nama_prodi') }}</span></th>
                <th (click)="setPsSort('jenjang')" class="ps-sortable">Jenjang <span class="ps-si">{{ psSortIcon('jenjang') }}</span></th>
                <th (click)="setPsSort('akreditasi')" class="ps-sortable">Akreditasi <span class="ps-si">{{ psSortIcon('akreditasi') }}</span></th>
                <th (click)="setPsSort('nama_pt')" class="ps-sortable">Perguruan Tinggi <span class="ps-si">{{ psSortIcon('nama_pt') }}</span></th>
                <th class="num-col" (click)="setPsSort('mahasiswa_aktif')" class="ps-sortable num-col">Mhs. Aktif <span class="ps-si">{{ psSortIcon('mahasiswa_aktif') }}</span></th>
                <th class="num-col" (click)="setPsSort('dosen_tetap')" class="ps-sortable num-col">Dosen Tetap <span class="ps-si">{{ psSortIcon('dosen_tetap') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of psPaginated">
                <td>
                  <div class="ps-nama">{{ r.nama_prodi }}</div>
                  <div class="ps-prodi-kode">{{ r.kode_prodi }}</div>
                </td>
                <td><span class="badge-jenjang jenjang-{{ r.jenjang?.toLowerCase() }}">{{ r.jenjang }}</span></td>
                <td><span class="akr-badge" [ngClass]="akrClass(r.akreditasi)">{{ r.akreditasi_display || r.akreditasi || '—' }}</span></td>
                <td>
                  <div class="ps-pt-nama">{{ r.nama_pt }}</div>
                  <div class="ps-pt-kode">{{ r.kode_pt }}</div>
                </td>
                <td class="num-col">{{ r.mahasiswa_aktif ? (r.mahasiswa_aktif | number) : '—' }}</td>
                <td class="num-col">{{ r.dosen_tetap ? (r.dosen_tetap | number) : '—' }}</td>
              </tr>
              <tr *ngIf="!psResults.length">
                <td colspan="6" class="empty-row">Tidak ada hasil ditemukan</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="ps-pagination ps-pagination--bottom" *ngIf="psTotalPages > 1">
          <button [disabled]="psPage===1" (click)="goPs(psPage-1)">‹ Prev</button>
          <span>{{ psPage }} / {{ psTotalPages }}</span>
          <button [disabled]="psPage===psTotalPages" (click)="goPs(psPage+1)">Next ›</button>
        </div>
      </div>
    </div>
  </div>

  <div *ngIf="loading" class="loading-wrap">
    <div class="spinner"></div><span>Memuat data...</span>
  </div>

  <!-- Stat cards -->
  <div class="stat-grid" *ngIf="!loading && rows.length">
    <div class="stat-card stat-card--blue">
      <div class="stat-card__icon">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>
      </div>
      <div class="stat-card__val">{{ rows.length | number }}</div>
      <div class="stat-card__lbl">Kelompok Prodi</div>
    </div>
    <div class="stat-card stat-card--light">
      <div class="stat-card__main">
        <div class="stat-card__icon stat-card__icon--dark">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
        </div>
        <div class="stat-card__val stat-card__val--dark">{{ totalPt | number }}</div>
      </div>
      <div class="stat-card__lbl stat-card__lbl--dark">Total Program Studi</div>
    </div>
    <div class="stat-card stat-card--light">
      <div class="stat-card__main">
        <div class="stat-card__icon stat-card__icon--dark">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
        </div>
        <div class="stat-card__val stat-card__val--dark">{{ totalMhs | number }}</div>
      </div>
      <div class="stat-card__lbl stat-card__lbl--dark">Mahasiswa Aktif</div>
    </div>
    <div class="stat-card stat-card--light">
      <div class="stat-card__main">
        <div class="stat-card__icon stat-card__icon--dark">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/><circle cx="18" cy="18" r="5" fill="#22c55e"/><path d="M17 20.5l-2-2 .7-.7 1.3 1.3 2.8-2.8.7.7z" fill="white"/></svg>
        </div>
        <div class="stat-card__val stat-card__val--dark">{{ totalDsn | number }}</div>
      </div>
      <div class="stat-card__lbl stat-card__lbl--dark">Dosen</div>
    </div>
    <div class="stat-card stat-card--light">
      <div class="stat-card__main">
        <div class="stat-card__icon stat-card__icon--dark">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/><path d="M13 8h-2v3H8v2h3v3h2v-3h3v-2h-3z" fill="#22c55e"/></svg>
        </div>
        <div class="stat-card__val stat-card__val--dark stat-card__val--ratio">1 : {{ rasioDosenMhs }}</div>
      </div>
      <div class="stat-card__lbl stat-card__lbl--dark">Rasio Dosen : Mahasiswa</div>
    </div>
  </div>

  <!-- Chart row baris 1: Pie charts -->
  <div class="charts-row charts-row--pie" *ngIf="!loading && rows.length">
    <div class="chart-card chart-card--clickable" (click)="openChartModal('jenjang')">
      <div class="chart-card__title">Sebaran Jenjang <span class="expand-hint">⤢</span></div>
      <div class="chart-card__body chart-card__body--pie"><canvas #jenjangChart></canvas></div>
    </div>
    <div class="chart-card chart-card--clickable" (click)="openChartModal('akreditasi')">
      <div class="chart-card__title">Sebaran Akreditasi <span class="expand-hint">⤢</span></div>
      <div class="chart-card__body chart-card__body--pie"><canvas #ptChart></canvas></div>
    </div>
  </div>

  <!-- Chart row baris 2: Bar charts berdampingan -->
  <div class="charts-row charts-row--bar" *ngIf="!loading && rows.length">
    <div class="chart-card chart-card--clickable" (click)="openChartModal('mhs')">
      <div class="chart-card__title">15 Prodi — Mahasiswa Aktif Terbanyak <span class="expand-hint">⤢</span></div>
      <div class="chart-card__body chart-card__body--bar"><canvas #mhsChart></canvas></div>
    </div>
    <div class="chart-card chart-card--clickable" (click)="openChartModal('dosen')">
      <div class="chart-card__title">15 Prodi — Dosen Tetap Terbanyak <span class="expand-hint">⤢</span></div>
      <div class="chart-card__body chart-card__body--bar"><canvas #dsnChart></canvas></div>
    </div>
  </div>

  <!-- Filter bar -->
  <div class="filter-bar">
    <div class="search-wrap">
      <input class="inp-search" type="text" placeholder="🔍 Cari nama prodi..."
             [(ngModel)]="search" (input)="onSearch()" />
    </div>
    <div class="filter-group">
      <label>Jenjang</label>
      <select [(ngModel)]="filterJenjang" (change)="loadData()">
        <option value="">Semua</option>
        <option value="d1">D1</option>
        <option value="d2">D2</option>
        <option value="d3">D3</option>
        <option value="d4">D4 / Sarjana Terapan</option>
        <option value="s1">S1</option>
        <option value="profesi">Profesi</option>
        <option value="s2">S2</option>
        <option value="s3">S3</option>
      </select>
    </div>
    <div class="filter-info">{{ filtered.length | number }} kelompok</div>
  </div>

  <!-- Table card -->
  <div class="card mt-16">
    <div class="table-toolbar">
      <div class="table-info">
        Menampilkan {{ filtered.length | number }} kelompok prodi
        <span *ngIf="loading" class="loading-dot">…</span>
      </div>
      <div class="toolbar-right" *ngIf="totalPages > 1">
        <button (click)="goPage(1)" [disabled]="page === 1">«</button>
        <button (click)="goPage(page - 1)" [disabled]="page === 1">‹ Prev</button>
        <span class="page-info">Hal {{ page }} / {{ totalPages }}</span>
        <button (click)="goPage(page + 1)" [disabled]="page === totalPages">Next ›</button>
        <button (click)="goPage(totalPages)" [disabled]="page === totalPages">»</button>
      </div>
    </div>

    <div class="loading-overlay" *ngIf="loading"><div class="spinner"></div></div>

    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="no-col">#</th>
            <th class="th-sort" (click)="setSort('nama')">
              Nama Program Studi <span class="si">{{ sortIcon('nama') }}</span>
            </th>
            <th class="th-sort tag-col" (click)="setSort('jenjang')">
              Jenjang <span class="si">{{ sortIcon('jenjang') }}</span>
            </th>
            <th class="th-sort num-col" (click)="setSort('jumlah_pt')">
              Jumlah PT <span class="si">{{ sortIcon('jumlah_pt') }}</span>
            </th>
            <th class="th-sort num-col" (click)="setSort('total_mahasiswa')">
              Mahasiswa Aktif <span class="si">{{ sortIcon('total_mahasiswa') }}</span>
            </th>
            <th class="th-sort num-col" (click)="setSort('total_dosen')">
              Dosen Tetap <span class="si">{{ sortIcon('total_dosen') }}</span>
            </th>
            <th class="th-sort num-col" (click)="setSort('rata_rata')">
              Rata-rata / PT <span class="si">{{ sortIcon('rata_rata') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of paginated; let i = index"
              (click)="openPtModal(r)" style="cursor:pointer">
            <td class="no-col muted">{{ (page - 1) * pageSize + i + 1 }}</td>
            <td class="nama-cell">{{ r.nama }}</td>
            <td class="tag-col">
              <span class="badge-jenjang jenjang-{{ r.jenjang }}">{{ r.jenjang_display }}</span>
            </td>
            <td class="num-col">
              <span class="bar-wrap">
                <span class="bar-fill" [style.width.%]="(r.jumlah_pt / maxPt) * 100"></span>
                <span class="bar-label">{{ r.jumlah_pt }}</span>
              </span>
            </td>
            <td class="num-col">{{ r.total_mahasiswa ? (r.total_mahasiswa | number) : '—' }}</td>
            <td class="num-col">{{ r.total_dosen ? (r.total_dosen | number) : '—' }}</td>
            <td class="num-col muted">
              {{ r.total_mahasiswa && r.jumlah_pt ? ((r.total_mahasiswa / r.jumlah_pt) | number:'1.0-0') : '—' }}
            </td>
          </tr>
          <tr *ngIf="filtered.length === 0 && !loading">
            <td colspan="7" class="empty-row">Tidak ada data yang sesuai filter</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination" *ngIf="totalPages > 1">
      <button (click)="goPage(1)" [disabled]="page === 1">«</button>
      <button (click)="goPage(page - 1)" [disabled]="page === 1">‹ Prev</button>
      <span class="page-info">Hal {{ page }} / {{ totalPages }}</span>
      <button (click)="goPage(page + 1)" [disabled]="page === totalPages">Next ›</button>
      <button (click)="goPage(totalPages)" [disabled]="page === totalPages">»</button>
    </div>
  </div>

<!-- Modal chart besar -->
<div class="cmodal-backdrop" *ngIf="chartModal.open" (click)="closeChartModal()"></div>
<div class="cmodal-box" *ngIf="chartModal.open">
  <div class="cmodal-header">
    <span class="cmodal-title">{{ chartModalTitle() }}</span>
    <button class="cmodal-close" (click)="closeChartModal()">✕</button>
  </div>
  <div class="cmodal-body" [class.cmodal-body--bar]="chartModal.type === 'mhs'">
    <canvas #modalChart></canvas>
  </div>
</div>

<!-- Modal daftar PT -->
<div class="modal-backdrop" *ngIf="ptModal.open" (click)="closePtModal()"></div>
<div class="modal-box" *ngIf="ptModal.open">
  <div class="modal-header">
    <div>
      <div class="modal-title">{{ ptModal.nama }}</div>
      <span class="badge-jenjang jenjang-{{ ptModal.jenjang }}">{{ ptModal.jenjang_display }}</span>
      <span class="modal-count">{{ ptModal.list.length }} PT</span>
    </div>
    <button class="modal-close" (click)="closePtModal()">✕</button>
  </div>
  <div class="modal-loading" *ngIf="ptModal.loading">
    <div class="spinner"></div><span>Memuat...</span>
  </div>
  <div class="modal-body" *ngIf="!ptModal.loading">
    <table class="pt-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Perguruan Tinggi</th>
          <th>Program Studi</th>
          <th class="num-col">Mhs. Aktif</th>
          <th class="num-col">Dosen Tetap</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let p of ptModal.list; let i = index">
          <td class="no-col muted">{{ i + 1 }}</td>
          <td>
            <div class="pt-nama">{{ p.nama_pt }}</div>
            <div class="pt-kode muted">{{ p.kode_pt }}</div>
          </td>
          <td>
            <div class="pt-nama">{{ p.nama_prodi }}</div>
            <div class="pt-kode muted">{{ p.kode_prodi }}</div>
          </td>
          <td class="num-col">{{ p.mahasiswa_aktif ? (p.mahasiswa_aktif | number) : '—' }}</td>
          <td class="num-col">{{ p.dosen_tetap ? (p.dosen_tetap | number) : '—' }}</td>
        </tr>
        <tr *ngIf="ptModal.list.length === 0">
          <td colspan="5" class="empty-row">Tidak ada data</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

</div>
  `,
  styles: [`
    .page-wrap { padding: 1.25rem; max-width: 1400px; margin: 0 auto; }

    .page-header { margin-bottom: 1.5rem; }
    .page-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0; }
    .page-header__sub { color: #64748b; font-size: .875rem; margin: .25rem 0 0; }

    /* Stat grid — same as Dosen */
    .stat-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: .75rem; margin-bottom: 1.25rem;
    }
    @media (min-width: 600px)  { .stat-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 900px)  { .stat-grid { grid-template-columns: repeat(5, 1fr); } }
    .stat-card {
      border-radius: 12px; padding: 1rem 1.25rem;
      display: flex; flex-direction: column; gap: .25rem; color: #fff;
    }
    .stat-card--blue  { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
    .stat-card--light { background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
    .stat-card__main { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
    .stat-card__icon { width: 42px; height: 42px; flex-shrink: 0; opacity: .9; }
    .stat-card__icon--dark { color: #1d4ed8; opacity: 1; }
    .stat-card__icon svg { width: 100%; height: 100%; }
    .stat-card__val  { font-size: 1.75rem; font-weight: 800; line-height: 1; }
    .stat-card__val--ratio { font-size: 1.35rem; }
    .stat-card__val--dark { color: #1e293b; }
    .stat-card__lbl  { font-size: .8rem; opacity: .88; }
    .stat-card__lbl--dark { color: #64748b; opacity: 1; }

    .loading-wrap { display: flex; align-items: center; gap: .75rem; color: #64748b; padding: 2rem; }

    .periode-badge {
      display: inline-flex; align-items: center; gap: .4rem;
      margin-top: .6rem;
      padding: .3rem .75rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 20px;
      font-size: .8rem; color: #1e40af;
    }
    .periode-badge strong { font-weight: 700; }
    .periode-badge__dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: #3b82f6;
      animation: pulse-dot 1.8s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .5; transform: scale(.7); }
    }

    /* ── Search Accordion Prodi (coklat) ── */
    .ps-accordion {
      background: #fff; border-radius: 12px; margin-bottom: 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08);
      border-left: 4px solid #92400e;
    }
    .ps-toggle {
      width: 100%; display: flex; align-items: center; gap: .6rem;
      background: none; border: none; padding: .85rem 1.1rem;
      font-size: .9rem; font-weight: 600; color: #78350f; cursor: pointer;
      text-align: left; border-radius: 12px;
    }
    .ps-toggle:hover { background: rgba(180,83,9,.05); }
    .ps-chevron { margin-left: auto; font-size: .85rem; color: #a16207; transition: transform .2s; }
    .ps-chevron.rotated { transform: rotate(180deg); }
    .ps-body { padding: 0 1.1rem 1.1rem; }
    .ps-fields {
      display: grid; grid-template-columns: 1fr; gap: .75rem; margin-bottom: 1rem;
    }
    @media (min-width: 600px) { .ps-fields { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 900px) { .ps-fields { grid-template-columns: 1fr 1fr auto; } }
    .psf { display: flex; flex-direction: column; gap: .3rem; }
    .psf label { font-size: .78rem; font-weight: 600; color: #78350f; }
    .psf input, .psf select {
      padding: .5rem .75rem; border: 1px solid #d6b58a; border-radius: 8px;
      font-size: .875rem; outline: none; background: #fffbf5;
    }
    .psf input:focus, .psf select:focus { border-color: #92400e; box-shadow: 0 0 0 2px rgba(146,64,14,.12); }
    .psf--action { justify-content: flex-end; flex-direction: row; align-items: flex-end; gap: .5rem; }
    .ps-btn-search {
      padding: .5rem 1.25rem; background: #92400e; color: #fff;
      border: none; border-radius: 8px; font-size: .875rem; font-weight: 600; cursor: pointer;
    }
    .ps-btn-search:hover:not(:disabled) { background: #78350f; }
    .ps-btn-search:disabled { opacity: .5; cursor: not-allowed; }
    .ps-btn-reset {
      padding: .5rem 1rem; background: #f5f0ea; color: #78350f;
      border: 1px solid #d6b58a; border-radius: 8px; font-size: .875rem; cursor: pointer;
    }
    .ps-btn-reset:hover { background: #efe6d8; }

    /* Results */
    .ps-results { margin-top: .5rem; }
    .ps-results__header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: .5rem; margin-bottom: .5rem;
    }
    .ps-actions { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .ps-results__info { font-size: .82rem; color: #92400e; }
    .ps-results__info strong { color: #451a03; }
    .ps-pagination {
      display: flex; align-items: center; gap: .6rem; font-size: .83rem;
    }
    .ps-pagination--bottom { justify-content: center; margin-top: .6rem; }
    .ps-pagination button {
      padding: .3rem .8rem; border: 1px solid #d6b58a;
      border-radius: 8px; background: #fffbf5; cursor: pointer; color: #78350f;
    }
    .ps-pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .ps-pagination button:hover:not(:disabled) { background: #f5ece0; }
    .ps-export-btns { display: flex; gap: .35rem; }
    .ps-exp {
      padding: .28rem .7rem; border-radius: 6px; font-size: .75rem;
      font-weight: 600; cursor: pointer; border: 1px solid;
    }
    .ps-exp--csv  { background: #f0fdf4; color: #166534; border-color: #86efac; }
    .ps-exp--csv:hover  { background: #dcfce7; }
    .ps-exp--xlsx { background: #f0fdf4; color: #15803d; border-color: #4ade80; }
    .ps-exp--xlsx:hover { background: #bbf7d0; }
    .ps-exp--pdf  { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
    .ps-exp--pdf:hover  { background: #fee2e2; }
    .ps-table-wrap { overflow-x: auto; border-radius: 10px; background: rgba(180,83,9,.04); }
    .ps-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
    .ps-table th {
      background: rgba(180,83,9,.08); padding: .55rem .75rem;
      text-align: left; font-weight: 600; color: #6b3410;
      border-bottom: 2px solid rgba(180,83,9,.15); white-space: nowrap;
    }
    .ps-table th.ps-sortable { cursor: pointer; user-select: none; }
    .ps-table th.ps-sortable:hover { background: rgba(180,83,9,.14); color: #451a03; }
    .ps-si { font-size: .72rem; color: #c4956a; margin-left: .2rem; }
    .ps-table td {
      padding: .5rem .75rem; border-bottom: 1px solid rgba(180,83,9,.08);
      color: #1e293b; vertical-align: middle;
    }
    .ps-table tr:hover td { background: rgba(180,83,9,.06); }
    .ps-nama { font-weight: 500; color: #1e293b; }
    .ps-prodi-kode { font-size: .72rem; color: #92400e; font-family: monospace; margin-top: 1px; }
    .ps-pt-nama { font-size: .82rem; color: #1e293b; }
    .ps-pt-kode { font-size: .72rem; color: #64748b; font-family: monospace; margin-top: 1px; }

    /* Charts row — same as Dosen */
    .charts-row { display: grid; gap: .75rem; margin-bottom: .75rem; }
    .charts-row--pie { grid-template-columns: 1fr; }
    .charts-row--bar { grid-template-columns: 1fr; }
    @media (min-width: 600px) {
      .charts-row--pie { grid-template-columns: repeat(2, 1fr); }
      .charts-row--bar { grid-template-columns: repeat(2, 1fr); }
    }
    .chart-card {
      background: #fff; border-radius: 12px;
      padding: 1rem 1.25rem; box-shadow: 0 1px 4px rgba(0,0,0,.07);
    }
    .chart-card__title {
      font-size: .875rem; font-weight: 600; color: #334155; margin-bottom: .75rem;
    }
    .chart-card__body { position: relative; height: 220px; }
    .chart-card__body--pie { height: 200px; display: flex; align-items: center; }
    .chart-card__body--bar { height: auto; overflow-y: auto; }

    .filter-bar {
      display: flex; align-items: center; gap: 12px;
      background: #fff; border-radius: 10px; padding: 12px 16px;
      box-shadow: 0 1px 4px rgba(0,0,0,.08); margin-bottom: 16px; flex-wrap: wrap;
    }
    .search-wrap { flex: 1; min-width: 180px; }
    .inp-search {
      width: 100%; padding: 7px 12px; border: 1px solid #e2e8f0;
      border-radius: 6px; font-size: .9rem; outline: none; box-sizing: border-box;
    }
    .inp-search:focus { border-color: #3b82f6; }
    .filter-group { display: flex; align-items: center; gap: 6px; }
    .filter-group label { font-size: .8rem; color: #64748b; white-space: nowrap; }
    .filter-group select {
      padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px;
      font-size: .85rem; background: #fff; cursor: pointer;
    }
    .filter-info { font-size: .8rem; color: #94a3b8; white-space: nowrap; }

    /* ── Table card — sama dengan PT list ─── */
    .mt-16 { margin-top: 12px; }
    .card {
      background: white; border-radius: 12px; padding: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08); position: relative;
    }

    .table-toolbar {
      display: flex; flex-direction: column; align-items: flex-start;
      gap: 8px; margin-bottom: 10px;
    }
    .table-info { font-size: 12px; color: #888; }
    .loading-dot { color: #999; }
    .toolbar-right {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    }
    .toolbar-right button {
      padding: 3px 10px; border: 1px solid #ddd; border-radius: 6px;
      background: white; cursor: pointer; font-size: 12px;
    }
    .toolbar-right button:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { font-size: 12px; color: #555; white-space: nowrap; }

    .loading-overlay {
      position: absolute; inset: 0; background: rgba(255,255,255,0.75);
      display: flex; align-items: center; justify-content: center; border-radius: 12px; z-index: 2;
    }
    .spinner {
      width: 32px; height: 32px; border: 3px solid #eee;
      border-top-color: #1a237e; border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-table th {
      text-align: left; padding: 8px 10px; background: #f8f9fa;
      font-weight: 600; color: #555; border-bottom: 2px solid #e9ecef; white-space: nowrap;
    }
    .data-table th.th-sort { cursor: pointer; user-select: none; }
    .data-table th.th-sort:hover { background: #eef0f3; color: #1e293b; }
    .si { font-size: .75rem; opacity: .55; margin-left: 3px; }

    .data-table td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    .data-table tr:hover td { background: #dbeafe !important; cursor: pointer; }

    .no-col   { width: 40px; min-width: 40px; text-align: center; }
    .tag-col  { width: 110px; min-width: 100px; }
    .num-col  { width: 110px; min-width: 100px; text-align: right; }
    .muted    { color: #aaa; font-size: 11px; }
    .nama-cell { font-weight: 500; color: #1e293b; }
    .empty-row { text-align: center; padding: 32px; color: #aaa; }

    .bar-wrap  { display: inline-flex; align-items: center; gap: 6px; width: 100%; justify-content: flex-end; }
    .bar-fill  { display: inline-block; height: 8px; border-radius: 4px; background: #1a237e; opacity: .5; min-width: 2px; max-width: 60px; }
    .bar-label { font-weight: 600; color: #333; min-width: 24px; text-align: right; }

    .badge-jenjang {
      display: inline-block; padding: 2px 8px; border-radius: 12px;
      font-size: 11px; font-weight: 600;
    }
    .jenjang-s1      { background: #dbeafe; color: #1d4ed8; }
    .jenjang-s2      { background: #ede9fe; color: #6d28d9; }
    .jenjang-s3      { background: #fae8ff; color: #86198f; }
    .jenjang-d3      { background: #dcfce7; color: #15803d; }
    .jenjang-d4      { background: #d1fae5; color: #065f46; }
    .jenjang-d1, .jenjang-d2 { background: #f0fdf4; color: #166534; }
    .jenjang-profesi { background: #fff7ed; color: #c2410c; }

    .pagination {
      display: flex; align-items: center; justify-content: center;
      gap: 6px; margin-top: 14px; flex-wrap: wrap;
    }
    .pagination button {
      padding: 5px 10px; border: 1px solid #ddd; border-radius: 6px;
      background: white; cursor: pointer; font-size: 12px; color: #333;
    }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .pagination button:not(:disabled):hover { background: #f0f0f0; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 100;
    }
    .modal-box {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      z-index: 101; background: #fff; border-radius: 12px;
      width: min(90vw, 820px); max-height: 80vh;
      display: flex; flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,.2);
    }
    .modal-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      padding: 18px 20px 14px; border-bottom: 1px solid #e2e8f0; gap: 12px;
    }
    .modal-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
    .modal-count { font-size: .8rem; color: #64748b; margin-left: 8px; }
    .modal-close {
      background: none; border: none; font-size: 1.1rem; cursor: pointer;
      color: #94a3b8; padding: 2px 6px; border-radius: 4px; flex-shrink: 0;
    }
    .modal-close:hover { background: #f1f5f9; color: #374151; }
    .modal-loading {
      display: flex; align-items: center; gap: 10px;
      padding: 32px; justify-content: center; color: #64748b;
    }
    .modal-body { overflow-y: auto; flex: 1; }
    .pt-table { width: 100%; border-collapse: collapse; font-size: .85rem; }
    .pt-table thead th {
      background: #f8fafc; padding: 9px 14px; text-align: left;
      font-weight: 600; color: #475569; border-bottom: 1px solid #e2e8f0;
      position: sticky; top: 0;
    }
    .pt-table tbody tr { border-bottom: 1px solid #f1f5f9; }
    .pt-table tbody tr:nth-child(even) { background: #f8fafc; }
    .pt-table tbody tr:hover { background: #e0f2fe; }
    .pt-table td { padding: 8px 14px; vertical-align: middle; }
    .pt-nama { font-weight: 500; color: #1e293b; }
    .pt-kode { font-size: .75rem; }
    .akr-badge {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .3px;
    }
    .akr-unggul      { background: #059669; color: #fff; }
    .akr-baik_sekali { background: #2563eb; color: #fff; }
    .akr-baik        { background: #0891b2; color: #fff; }
    .akr-c           { background: #d97706; color: #fff; }
    .akr-belum       { background: #94a3b8; color: #fff; }
    .exp-warn      { color: #dc2626; font-weight: 600; }

    .chart-card--clickable { cursor: pointer; }
    .chart-card--clickable:hover { border-color: #c7d2f0; background: #f2f4fc; }
    .expand-hint { font-size: 11px; color: #94a3b8; margin-left: 4px; }

    /* Chart modal */
    .cmodal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 200;
    }
    .cmodal-box {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
      z-index: 201; background: #fff; border-radius: 14px;
      width: min(96vw, 1100px); max-height: 92vh;
      display: flex; flex-direction: column;
      box-shadow: 0 12px 48px rgba(0,0,0,.25);
    }
    .cmodal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 22px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;
    }
    .cmodal-title { font-size: 1rem; font-weight: 700; color: #1e293b; }
    .cmodal-close {
      background: none; border: none; font-size: 1.2rem; cursor: pointer;
      color: #94a3b8; padding: 2px 8px; border-radius: 4px;
    }
    .cmodal-close:hover { background: #f1f5f9; color: #374151; }
    .cmodal-body {
      flex: 1; overflow: hidden; padding: 22px;
      position: relative; min-height: 340px;
    }
    .cmodal-body--bar { overflow-y: auto; }

    /* ── Base mobile styles ─── */
    .filter-bar { flex-direction: column; align-items: stretch; gap: 8px; }
    .search-wrap { min-width: 100%; flex: none; }
    .filter-bar select { flex: 1; min-width: 0; }
    .cmodal-box { width: 98vw !important; max-height: 90vh; }
    .cmodal-body { padding: 14px; min-height: 200px; }

    /* ── Tablet ≥ 600px ─── */
    @media (min-width: 600px) {
      .filter-bar { flex-direction: row; flex-wrap: wrap; align-items: center; }
      .search-wrap { min-width: 180px; flex: 1; }
      .table-toolbar { flex-direction: row; align-items: center; }
      .card { padding: 16px; }
      .data-table th, .data-table td { padding: 9px 12px; }
    }

    /* ── Desktop ≥ 1024px ─── */
    @media (min-width: 1024px) {
      .data-table { font-size: 13px; }
      .data-table th, .data-table td { padding: 10px 14px; }
      .cmodal-box { width: min(96vw, 1100px) !important; }
      .cmodal-body { padding: 22px; min-height: 340px; }
      .mt-16 { margin-top: 16px; }
      .card { padding: 20px; }
    }
  `]
})
export class ProgramStudiListComponent implements OnInit, AfterViewChecked {

  @ViewChild('jenjangChart') jenjangChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ptChart')      ptChartRef!:      ElementRef<HTMLCanvasElement>;
  @ViewChild('mhsChart')     mhsChartRef!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('dsnChart')     dsnChartRef!:     ElementRef<HTMLCanvasElement>;
  @ViewChild('modalChart')   modalChartRef!:   ElementRef<HTMLCanvasElement>;

  rows:     ProdiGroup[] = [];
  filtered: ProdiGroup[] = [];
  paginated: ProdiGroup[] = [];

  loading       = false;
  search        = '';
  filterJenjang = '';
  searchTimer: any;

  sortKey: SortKey = 'jumlah_pt';
  sortAsc          = false;

  page       = 1;
  pageSize   = 50;
  totalPages = 1;

  totalPt      = 0;
  totalMhs     = 0;
  totalDsn     = 0;

  get rasioDosenMhs(): string {
    if (!this.totalDsn) return '—';
    return (this.totalMhs / this.totalDsn).toFixed(1);
  }
  maxPt        = 1;
  topNama      = '';
  periodeLabel = '';
  top10Threshold = 0;

  ptModal = {
    open: false, loading: false,
    nama: '', jenjang: '', jenjang_display: '',
    list: [] as any[],
  };

  // Charts
  private chartJenjang: Chart | null = null;
  private chartPt:      Chart | null = null;
  private chartMhs:     Chart | null = null;
  private chartDsn:     Chart | null = null;
  private chartsRendered = false;

  // Chart modal
  chartModal: { open: boolean; type: 'jenjang' | 'akreditasi' | 'mhs' | 'dosen' | '' } = { open: false, type: '' };
  private modalChart: Chart | null = null;
  private modalChartReady = false;

  private akrSummary: { akreditasi: string; label: string; count: number }[] = [];

  private chartData: {
    jLabels: string[]; jData: number[];
    akrLabels: string[]; akrData: number[];
    mLabels: string[]; mData: number[]; mColors: string[];
    mAllLabels: string[]; mAllData: number[]; mAllColors: string[];
    dLabels: string[]; dData: number[]; dColors: string[];
    dAllLabels: string[]; dAllData: number[]; dAllColors: string[];
  } | null = null;

  // ── Search Accordion Prodi ──
  psOpen       = false;
  psSearching  = false;
  psDone       = false;
  psForm       = { nama: '', jenjang: '' };
  psResults: any[] = [];
  psPaginated: any[] = [];
  psTotal      = 0;
  psPage       = 1;
  psTotalPages = 1;
  psPageSize   = 5;
  psSortField  = 'nama_prodi';
  psSortDir    = 'asc';

  togglePs() { this.psOpen = !this.psOpen; }

  runPs(page = 1) {
    if (!this.psForm.nama.trim() && !this.psForm.jenjang) return;
    this.psSearching = true;
    this.psPage = page;
    this.api.getProgramStudiPtList(this.psForm.nama.trim(), this.psForm.jenjang).subscribe({
      next: (res: any[]) => {
        this.psResults    = res;
        this.psTotal      = res.length;
        this.psSearching  = false;
        this.psDone       = true;
        this.applyPsSort();
      },
      error: () => { this.psSearching = false; }
    });
  }

  goPs(p: number) {
    this.psPage = p;
    this.updatePsPaginated();
  }

  resetPs() {
    this.psForm      = { nama: '', jenjang: '' };
    this.psDone      = false;
    this.psResults   = [];
    this.psPaginated = [];
    this.psTotal     = 0;
    this.psPage      = 1;
    this.psSortField = 'nama_prodi';
    this.psSortDir   = 'asc';
  }

  setPsSort(field: string) {
    if (this.psSortField === field) {
      this.psSortDir = this.psSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.psSortField = field;
      this.psSortDir   = 'asc';
    }
    this.psPage = 1;
    this.applyPsSort();
  }

  psSortIcon(field: string): string {
    if (this.psSortField !== field) return '⇅';
    return this.psSortDir === 'asc' ? '▲' : '▼';
  }

  private applyPsSort() {
    const dir = this.psSortDir === 'asc' ? 1 : -1;
    const sorted = [...this.psResults].sort((a, b) => {
      const av = a[this.psSortField] ?? '';
      const bv = b[this.psSortField] ?? '';
      if (typeof av === 'number') return dir * (av - bv);
      return dir * String(av).localeCompare(String(bv), 'id');
    });
    this.psTotalPages = Math.max(1, Math.ceil(sorted.length / this.psPageSize));
    const off = (this.psPage - 1) * this.psPageSize;
    this.psPaginated = sorted.slice(off, off + this.psPageSize);
  }

  private updatePsPaginated() { this.applyPsSort(); }

  exportPs(fmt: 'csv' | 'xlsx' | 'pdf') {
    const rows = this.psResults;
    const headers = ['Nama Prodi', 'Jenjang', 'Akreditasi', 'Perguruan Tinggi', 'Kode PT', 'Mhs. Aktif', 'Dosen Tetap'];
    const data = rows.map(r => [
      r.nama_prodi, r.jenjang, r.akreditasi || '—',
      r.nama_pt, r.kode_pt,
      r.mahasiswa_aktif ?? 0, r.dosen_tetap ?? 0,
    ]);
    const filename = `prodi-${this.psForm.nama || 'semua'}`;

    if (fmt === 'csv') {
      const lines = [headers, ...data].map(row =>
        row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
      );
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      this.downloadBlob(blob, `${filename}.csv`);

    } else if (fmt === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = [30, 10, 14, 36, 10, 12, 12].map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Program Studi');
      XLSX.writeFile(wb, `${filename}.xlsx`);

    } else {
      const rows_html = data.map(row =>
        `<tr>${row.map(v => `<td>${v}</td>`).join('')}</tr>`
      ).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <title>Program Studi — ${this.psForm.nama}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 16px; }
          h2 { font-size: 14px; margin-bottom: 8px; color: #78350f; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #92400e; color: #fff; padding: 6px 8px; text-align: left; font-size: 11px; }
          td { padding: 5px 8px; border-bottom: 1px solid #e7e0d8; font-size: 11px; }
          tr:nth-child(even) td { background: #fdf8f3; }
          @media print { @page { size: landscape; margin: 12mm; } }
        </style></head><body>
        <h2>Program Studi: ${this.psForm.nama}${this.psForm.jenjang ? ' — ' + this.psForm.jenjang.toUpperCase() : ''}</h2>
        <p style="font-size:10px;color:#666;margin-bottom:8px">Total: ${rows.length} program studi</p>
        <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows_html}</tbody></table>
        <script>window.onload=function(){window.print();window.close();}</script>
        </body></html>`;
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    }
  }

  private downloadBlob(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }

  akrClass(akr: string): string {
    if (!akr) return 'akr-belum';
    const valid = new Set(['unggul', 'baik_sekali', 'baik', 'c']);
    const key = akr.toLowerCase().replace(/\s+/g, '_');
    return valid.has(key) ? `akr-${key}` : 'akr-belum';
  }

  constructor(private api: ApiService, private zone: NgZone) {}

  ngOnInit(): void { this.loadData(); }

  ngAfterViewChecked(): void {
    if (!this.chartsRendered && this.chartData && this.jenjangChartRef) {
      this.chartsRendered = true;
      this.zone.runOutsideAngular(() => this.renderCharts());
    }
    if (this.chartModal.open && !this.modalChartReady && this.modalChartRef) {
      this.modalChartReady = true;
      this.zone.runOutsideAngular(() => this.renderModalChart());
    }
  }

  loadData(): void {
    this.loading = true;
    this.page    = 1;
    this.chartsRendered = false;
    [this.chartJenjang, this.chartPt, this.chartMhs, this.chartDsn].forEach(c => c?.destroy());
    this.chartJenjang = this.chartPt = this.chartMhs = this.chartDsn = null;

    let params = new HttpParams();
    if (this.filterJenjang) params = params.set('jenjang', this.filterJenjang);
    if (this.search)        params = params.set('search', this.search);

    this.api.getProgramStudiGrouped(params).subscribe({
      next: (data: any) => {
        this.rows        = data.groups ?? data;
        this.akrSummary  = data.akr_summary ?? [];
        this.periodeLabel = data.periode_label ?? '';
        this.applySort();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.loadData(), 400);
  }

  setSort(key: SortKey): void {
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = key === 'nama' || key === 'jenjang';
    }
    this.applySort();
  }

  sortIcon(key: SortKey): string {
    if (this.sortKey !== key) return '↕';
    return this.sortAsc ? '↑' : '↓';
  }

  applySort(): void {
    const dir = this.sortAsc ? 1 : -1;
    const sorted = [...this.rows].sort((a, b) => {
      switch (this.sortKey) {
        case 'nama':      return dir * a.nama.localeCompare(b.nama);
        case 'jenjang':   return dir * a.jenjang.localeCompare(b.jenjang);
        case 'jumlah_pt': return dir * (a.jumlah_pt - b.jumlah_pt);
        case 'total_mahasiswa': return dir * (a.total_mahasiswa - b.total_mahasiswa);
        case 'total_dosen':    return dir * (a.total_dosen - b.total_dosen);
        case 'rata_rata': {
          const ra = a.jumlah_pt ? a.total_mahasiswa / a.jumlah_pt : 0;
          const rb = b.jumlah_pt ? b.total_mahasiswa / b.jumlah_pt : 0;
          return dir * (ra - rb);
        }
        default: return 0;
      }
    });
    this.filtered = sorted;
    this.computeSummary();
    this.updatePagination();
  }

  computeSummary(): void {
    this.totalPt  = this.filtered.reduce((s, r) => s + r.jumlah_pt, 0);
    this.totalMhs = this.filtered.reduce((s, r) => s + r.total_mahasiswa, 0);
    this.totalDsn = this.filtered.reduce((s, r) => s + r.total_dosen, 0);
    const byPt  = [...this.filtered].sort((a, b) => b.jumlah_pt - a.jumlah_pt);
    this.maxPt   = byPt[0]?.jumlah_pt ?? 1;
    this.topNama = byPt[0]?.nama ?? '';
    this.top10Threshold = byPt[9]?.jumlah_pt ?? 0;
    this.buildChartData();
  }

  private buildChartData(): void {
    // Sebaran jenjang — count prodi groups
    const jMap = new Map<string, number>();
    for (const r of this.filtered) {
      const lbl = r.jenjang_display || r.jenjang.toUpperCase();
      jMap.set(lbl, (jMap.get(lbl) ?? 0) + 1);
    }
    const jLabels = Array.from(jMap.keys());
    const jData   = jLabels.map(k => jMap.get(k)!);

    // Sebaran akreditasi — dari akrSummary backend
    const akrLabels = this.akrSummary.map(r => r.label || 'Belum');
    const akrData   = this.akrSummary.map(r => r.count);

    // Top 15 by total_mahasiswa
    const top15 = [...this.filtered]
      .filter(r => r.total_mahasiswa > 0)
      .sort((a, b) => b.total_mahasiswa - a.total_mahasiswa)
      .slice(0, 15);
    const mData   = top15.map(r => r.total_mahasiswa);
    const mLabels = top15.map(r => `[${r.jenjang_display || r.jenjang.toUpperCase()}] ${r.nama}`);

    // All items for modal bar chart
    const allSorted = [...this.filtered]
      .filter(r => r.total_mahasiswa > 0)
      .sort((a, b) => b.total_mahasiswa - a.total_mahasiswa);
    const mAllData   = allSorted.map(r => r.total_mahasiswa);
    const mAllLabels = allSorted.map(r => `[${r.jenjang_display || r.jenjang.toUpperCase()}] ${r.nama}`);

    // Top 15 by total_dosen descending → lebih banyak = warna lebih gelap
    const top15Dsn = [...this.filtered]
      .filter(r => r.total_dosen > 0)
      .sort((a, b) => b.total_dosen - a.total_dosen)
      .slice(0, 15);
    const dData   = top15Dsn.map(r => r.total_dosen);
    const dLabels = top15Dsn.map(r => `[${r.jenjang_display || r.jenjang.toUpperCase()}] ${r.nama}`);

    const allDsnSorted = [...this.filtered]
      .filter(r => r.total_dosen > 0)
      .sort((a, b) => b.total_dosen - a.total_dosen);
    const dAllData   = allDsnSorted.map(r => r.total_dosen);
    const dAllLabels = allDsnSorted.map(r => `[${r.jenjang_display || r.jenjang.toUpperCase()}] ${r.nama}`);

    this.chartData = {
      jLabels, jData,
      akrLabels, akrData,
      mLabels, mData,
      mColors: this.gradientColors(mData, 213, 55),
      mAllLabels, mAllData,
      mAllColors: this.gradientColors(mAllData, 213, 55),
      dLabels, dData,
      dColors: this.gradientColors(dData, 150, 55),
      dAllLabels, dAllData,
      dAllColors: this.gradientColors(dAllData, 150, 55),
    };

    // Re-render if canvases are already available
    if (this.chartsRendered) {
      this.chartsRendered = false; // will trigger ngAfterViewChecked re-render
    }
  }

  private arcOutsideLabelPlugin(fontSize: number) {
    return {
      id: 'arcOutsideLabel',
      afterDatasetDraw(chart: any) {
        const { ctx } = chart;
        const meta0 = chart.getDatasetMeta(0);
        if (!meta0?.data?.length) return;
        const cx: number = meta0.data[0].x;
        const cy: number = meta0.data[0].y;

        chart.data.datasets.forEach((_: any, di: number) => {
          chart.getDatasetMeta(di).data.forEach((arc: any, i: number) => {
            const value = chart.data.datasets[di].data[i];
            if (!value) return;

            const midAngle = (arc.startAngle + arc.endAngle) / 2;
            const outer    = arc.outerRadius;
            const elbow    = outer + Math.max(10, outer * 0.15);
            const horiz    = 14;
            const right    = Math.cos(midAngle) >= 0;

            const x1 = cx + Math.cos(midAngle) * outer;
            const y1 = cy + Math.sin(midAngle) * outer;
            const x2 = cx + Math.cos(midAngle) * elbow;
            const y2 = cy + Math.sin(midAngle) * elbow;
            const x3 = x2 + (right ? horiz : -horiz);
            const y3 = y2;

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y3);
            ctx.strokeStyle = 'rgba(60,60,60,0.55)';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font      = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = '#222';
            ctx.textAlign = right ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(value), right ? x3 + 3 : x3 - 3, y3);
            ctx.restore();
          });
        });
      }
    };
  }

  private gradientColors(values: number[], hue: number, sat = 55): string[] {
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    return values.map(v => {
      const t = max === min ? 0.5 : (v - min) / (max - min);
      const l = Math.round(75 - t * 38);
      return `hsl(${hue},${sat}%,${l}%)`;
    });
  }

  private renderCharts(): void {
    const d = this.chartData;
    if (!d) return;

    [this.chartJenjang, this.chartPt, this.chartMhs, this.chartDsn].forEach(c => c?.destroy());
    this.chartJenjang = this.chartPt = this.chartMhs = this.chartDsn = null;

    const doughnutOpts = (callbacks: any, padding = 28) => ({
      responsive: true, maintainAspectRatio: false, animation: false as const,
      layout: { padding },
      plugins: {
        legend: { position: 'right' as const, labels: { font: { size: 10 }, padding: 6, boxWidth: 10 } },
        tooltip: { callbacks }
      }
    });

    setTimeout(() => {
      if (!this.jenjangChartRef) return;
      this.chartJenjang = new Chart(this.jenjangChartRef.nativeElement.getContext('2d')!, {
        type: 'doughnut',
        data: {
          labels: d.jLabels,
          datasets: [{ data: d.jData, backgroundColor: this.gradientColors(d.jData, 25, 45), borderWidth: 2 }]
        },
        options: doughnutOpts({ label: (c: any) => ` ${c.label}: ${c.parsed} kelompok` }),
        plugins: [this.arcOutsideLabelPlugin(11)]
      });
    }, 0);

    setTimeout(() => {
      if (!this.ptChartRef) return;
      this.chartPt = new Chart(this.ptChartRef.nativeElement.getContext('2d')!, {
        type: 'doughnut',
        data: {
          labels: d.akrLabels,
          datasets: [{ data: d.akrData, backgroundColor: this.gradientColors(d.akrData, 170, 50), borderWidth: 2 }]
        },
        options: doughnutOpts({ label: (c: any) => ` ${c.label}: ${c.parsed} prodi` }),
        plugins: [this.arcOutsideLabelPlugin(11)]
      });
    }, 50);

    setTimeout(() => {
      if (!this.mhsChartRef) return;
      const wrap = this.mhsChartRef.nativeElement.parentElement!;
      wrap.style.height = Math.max(180, d.mLabels.length * 26) + 'px';
      setTimeout(() => this.renderDsnChart(), 30);
      this.chartMhs = new Chart(this.mhsChartRef.nativeElement.getContext('2d')!, {
        type: 'bar',
        data: {
          labels: d.mLabels,
          datasets: [{ label: 'Mhs Aktif', data: d.mData, backgroundColor: d.mColors, borderRadius: 3 }]
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: (c: any) => ` ${(c.parsed.x as number).toLocaleString('id-ID')} mahasiswa` } }
          },
          scales: {
            x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } },
            y: { ticks: { font: { size: 11 } } }
          }
        }
      });
    }, 100);
  }

  private renderDsnChart(): void {
    const d = this.chartData;
    if (!d || !this.dsnChartRef) return;
    this.chartDsn?.destroy();
    const wrap = this.dsnChartRef.nativeElement.parentElement!;
    wrap.style.height = Math.max(180, d.dLabels.length * 26) + 'px';
    this.chartDsn = new Chart(this.dsnChartRef.nativeElement.getContext('2d')!, {
      type: 'bar',
      data: {
        labels: d.dLabels,
        datasets: [{ label: 'Dosen Tetap', data: d.dData, backgroundColor: d.dColors, borderRadius: 3 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c: any) => ` ${(c.parsed.x as number).toLocaleString('id-ID')} dosen` } }
        },
        scales: {
          x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } },
          y: { ticks: { font: { size: 11 } } }
        }
      }
    });
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
    this.page = Math.min(this.page, this.totalPages);
    const start = (this.page - 1) * this.pageSize;
    this.paginated = this.filtered.slice(start, start + this.pageSize);
  }

  goPage(p: number): void {
    this.page = p;
    this.updatePagination();
  }

  openChartModal(type: 'jenjang' | 'akreditasi' | 'mhs' | 'dosen'): void {
    this.modalChart?.destroy();
    this.modalChart = null;
    this.modalChartReady = false;
    this.chartModal = { open: true, type };
  }

  closeChartModal(): void {
    this.modalChart?.destroy();
    this.modalChart = null;
    this.chartModal = { open: false, type: '' };
  }

  chartModalTitle(): string {
    if (this.chartModal.type === 'jenjang')    return 'Sebaran Jenjang';
    if (this.chartModal.type === 'akreditasi') return 'Sebaran Akreditasi';
    if (this.chartModal.type === 'mhs')        return 'Mahasiswa Aktif per Prodi';
    if (this.chartModal.type === 'dosen')      return 'Dosen Tetap per Prodi';
    return '';
  }

  private hslAdjust(color: string, lFactor: number): string {
    const m = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!m) return color;
    return `hsl(${m[1]},${m[2]}%,${Math.min(96, Math.max(8, Math.round(+m[3] * lFactor)))}%)`;
  }

  private draw3DPie(
    ctx: CanvasRenderingContext2D, W: number, H: number,
    labels: string[], values: number[], colors: string[]
  ): void {
    const total = values.reduce((a, b) => a + b, 0);
    if (!total) return;

    const legendW = Math.min(210, W * 0.27);
    const chartW  = W - legendW - 16;
    const depth   = Math.min(40, H * 0.1);
    const rx      = Math.min(chartW * 0.4, (H - depth - 60) * 0.88);
    const ry      = rx * 0.38;
    const cx      = chartW / 2 + 8;
    const cy      = (H - depth) * 0.46 + 18;

    let a = -Math.PI / 2;
    const slices = values.map((v, i) => {
      const sweep = (v / total) * 2 * Math.PI;
      const sl = { s: a, e: a + sweep, color: colors[i], value: v, label: labels[i] };
      a += sweep;
      return sl;
    });

    // Draw outer side walls — only front-facing portion (sin > 0 → angles [0, π])
    for (const sl of slices) {
      const fs = Math.max(sl.s, 0);
      const fe = Math.min(sl.e, Math.PI);
      if (fe <= fs) continue;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(fs) * rx, cy + Math.sin(fs) * ry);
      ctx.lineTo(cx + Math.cos(fs) * rx, cy + Math.sin(fs) * ry + depth);
      ctx.ellipse(cx, cy + depth, rx, ry, 0, fs, fe, false);
      ctx.lineTo(cx + Math.cos(fe) * rx, cy + Math.sin(fe) * ry);
      ctx.ellipse(cx, cy, rx, ry, 0, fe, fs, true);
      ctx.closePath();
      ctx.fillStyle = this.hslAdjust(sl.color, 0.52);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Draw top faces — back-to-front order
    const sorted = [...slices].sort((a, b) => Math.sin((a.s + a.e) / 2) - Math.sin((b.s + b.e) / 2));
    for (const sl of sorted) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.ellipse(cx, cy, rx, ry, 0, sl.s, sl.e, false);
      ctx.closePath();
      ctx.fillStyle = sl.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Doughnut center hole
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.36, ry * 0.36, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Outside value labels with leader lines
    for (const sl of slices) {
      if (!sl.value) continue;
      if (sl.value / total < 0.03) continue; // skip slices too small to label
      const mid = (sl.s + sl.e) / 2;
      const ex  = cx + Math.cos(mid) * rx;
      const ey  = cy + Math.sin(mid) * ry;
      const ox  = cx + Math.cos(mid) * rx * 1.25;
      const oy  = cy + Math.sin(mid) * ry * 1.25;
      const right  = Math.cos(mid) >= 0;
      const armLen = 20;
      const tx = ox + (right ? armLen : -armLen);
      const ty = oy;

      ctx.save();
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#222';
      ctx.textAlign = right ? 'left' : 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(sl.value), right ? tx + 3 : tx - 3, ty);
      ctx.restore();
    }

    // Legend (right side)
    const legX = chartW + 20;
    let legY = Math.max(20, cy - (slices.length * 26) / 2);
    for (const sl of slices) {
      ctx.fillStyle = sl.color;
      ctx.fillRect(legX, legY, 14, 14);
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(legX, legY, 14, 14);
      ctx.fillStyle = '#222';
      ctx.font = '12.5px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const lbl = sl.label.length > 24 ? sl.label.slice(0, 24) + '…' : sl.label;
      ctx.fillText(`${lbl}: ${sl.value}`, legX + 18, legY + 7);
      legY += 26;
    }
  }

  private draw3DBar(
    ctx: CanvasRenderingContext2D, W: number, H: number,
    labels: string[], values: number[], colors: string[]
  ): void {
    if (!values.length) return;
    const dX = 16, dY = -10;
    const padL = 250, padR = 90, padT = 16, padB = 16;
    const chartW = W - padL - padR;
    const rowH   = Math.max(24, (H - padT - padB) / values.length);
    const barH   = Math.round(rowH * 0.62);
    const maxVal = Math.max(...values, 1);

    values.forEach((val, i) => {
      const bw = (val / maxVal) * chartW;
      const x  = padL;
      const y  = padT + i * rowH + (rowH - barH) / 2;
      const c  = colors[i];

      // Right side face
      ctx.beginPath();
      ctx.moveTo(x + bw,      y);
      ctx.lineTo(x + bw + dX, y + dY);
      ctx.lineTo(x + bw + dX, y + dY + barH);
      ctx.lineTo(x + bw,      y + barH);
      ctx.closePath();
      ctx.fillStyle = this.hslAdjust(c, 0.55);
      ctx.fill();

      // Top face
      ctx.beginPath();
      ctx.moveTo(x,           y);
      ctx.lineTo(x + dX,      y + dY);
      ctx.lineTo(x + bw + dX, y + dY);
      ctx.lineTo(x + bw,      y);
      ctx.closePath();
      ctx.fillStyle = this.hslAdjust(c, 1.28);
      ctx.fill();

      // Front face
      ctx.fillStyle = c;
      ctx.fillRect(x, y, bw, barH);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, bw, barH);

      // Label (left)
      ctx.fillStyle = '#333';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const lbl = labels[i].length > 38 ? labels[i].slice(0, 38) + '…' : labels[i];
      ctx.fillText(lbl, x - 8, y + barH / 2);

      // Value (right)
      ctx.textAlign = 'left';
      ctx.fillText(val.toLocaleString('id-ID'), x + bw + dX + 6, y + dY + barH / 2);
    });

    // Y-axis line
    ctx.beginPath();
    ctx.moveTo(padL, padT - 4);
    ctx.lineTo(padL, padT + values.length * rowH + 4);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private renderModalChart(): void {
    const d = this.chartData;
    if (!d || !this.modalChartRef) return;

    this.modalChart?.destroy();
    this.modalChart = null;

    const canvas = this.modalChartRef.nativeElement;
    const parent = canvas.parentElement!;

    if (this.chartModal.type === 'mhs') {
      parent.style.height = Math.max(320, d.mAllLabels.length * 34 + 50) + 'px';
    } else if (this.chartModal.type === 'dosen') {
      parent.style.height = Math.max(320, d.dAllLabels.length * 34 + 50) + 'px';
    } else {
      parent.style.height = '';
    }

    setTimeout(() => {
      canvas.width  = parent.clientWidth  || 700;
      canvas.height = parent.clientHeight || 420;
      const ctx = canvas.getContext('2d')!;
      if (this.chartModal.type === 'jenjang') {
        this.draw3DPie(ctx, canvas.width, canvas.height, d.jLabels, d.jData,
                       this.gradientColors(d.jData, 25, 45));
      } else if (this.chartModal.type === 'akreditasi') {
        this.draw3DPie(ctx, canvas.width, canvas.height, d.akrLabels, d.akrData,
                       this.gradientColors(d.akrData, 170, 50));
      } else if (this.chartModal.type === 'mhs') {
        this.draw3DBar(ctx, canvas.width, canvas.height, d.mAllLabels, d.mAllData, d.mAllColors);
      } else if (this.chartModal.type === 'dosen') {
        this.draw3DBar(ctx, canvas.width, canvas.height, d.dAllLabels, d.dAllData, d.dAllColors);
      }
    }, 60);
  }

  openPtModal(r: ProdiGroup): void {
    this.ptModal = { open: true, loading: true, nama: r.nama, jenjang: r.jenjang, jenjang_display: r.jenjang_display, list: [] };
    this.api.getProgramStudiPtList(r.nama, r.jenjang).subscribe({
      next: (data) => {
          this.ptModal.list = data.sort((a: any, b: any) => (b.mahasiswa_aktif ?? 0) - (a.mahasiswa_aktif ?? 0));
          this.ptModal.loading = false;
        },
      error: ()     => { this.ptModal.loading = false; },
    });
  }

  closePtModal(): void { this.ptModal.open = false; }

  isExpSoon(tgl: string | null): boolean {
    if (!tgl) return false;
    const diff = (new Date(tgl).getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 90;
  }
}
