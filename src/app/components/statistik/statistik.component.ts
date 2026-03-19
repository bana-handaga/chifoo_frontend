import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-statistik',
  template: `
    <div class="page-wrap">

      <!-- Page header -->
      <div class="page-header">
        <div class="page-header__title">
          <h1>Laporan Performa Perguruan Tinggi</h1>
          <p class="page-header__sub">Analisis data dan performa perguruan tinggi Muhammadiyah &amp; Aisyiyah</p>
        </div>
      </div>

      <div class="loading-wrap" *ngIf="loading && !statistik">
        <div class="loading-bar"><div class="loading-bar-fill"></div></div>
      </div>

      <!-- ══════════════════════════════════════════════
           ACCORDION RINGKASAN
           ══════════════════════════════════════════════ -->
      <div class="sum-accordion">
        <button class="sum-toggle" (click)="summaryOpen = !summaryOpen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               style="width:16px;height:16px;flex-shrink:0">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
          Ringkasan <span class="sum-title-en">(Summary)</span>
          <span class="sum-count" *ngIf="sumTotal > 0">{{ sumTotal | number }} PT</span>
          <span class="sum-chevron" [class.rotated]="summaryOpen">▾</span>
        </button>

        <div class="sum-body" *ngIf="summaryOpen">

          <!-- Search form -->
          <div class="sum-fields">
            <div class="sumf">
              <label>Nama / Singkatan PT</label>
              <input type="text" [(ngModel)]="sumSearch" placeholder="Cari nama, singkatan..."
                     (keyup.enter)="runSumSearch()">
            </div>
            <div class="sumf">
              <label>Jenis</label>
              <select [(ngModel)]="sumJenis">
                <option value="">— Semua —</option>
                <option value="universitas">Universitas</option>
                <option value="institut">Institut</option>
                <option value="sekolah_tinggi">Sekolah Tinggi</option>
                <option value="politeknik">Politeknik</option>
                <option value="akademi">Akademi</option>
              </select>
            </div>
            <div class="sumf">
              <label>Organisasi</label>
              <select [(ngModel)]="sumOrganisasi">
                <option value="">— Semua —</option>
                <option value="muhammadiyah">Muhammadiyah</option>
                <option value="aisyiyah">Aisyiyah</option>
              </select>
            </div>
            <div class="sumf">
              <label>Akreditasi</label>
              <select [(ngModel)]="sumAkreditasi">
                <option value="">— Semua —</option>
                <option value="unggul">Unggul</option>
                <option value="baik_sekali">Baik Sekali</option>
                <option value="baik">Baik</option>
                <option value="belum">Belum</option>
              </select>
            </div>
            <div class="sumf sumf--action">
              <button class="sum-btn-search" (click)="runSumSearch()" [disabled]="sumLoading">
                {{ sumLoading ? 'Mencari...' : 'Cari' }}
              </button>
              <button class="sum-btn-reset" (click)="resetSumSearch()" *ngIf="sumSearchDone">Reset</button>
            </div>
          </div>

          <!-- Toolbar: info + pagination + export -->
          <div class="sum-results-header">
            <div class="sum-info">
              Menampilkan <strong>{{ sumData.length }}</strong> dari <strong>{{ sumTotal | number }}</strong> PT
            </div>
            <div class="sum-actions">
              <div class="sum-pagination" *ngIf="sumTotalPages > 1">
                <button (click)="sumPrev()" [disabled]="sumPage <= 1">‹ Prev</button>
                <span>{{ sumPage }} / {{ sumTotalPages }}</span>
                <button (click)="sumNext()" [disabled]="sumPage >= sumTotalPages">Next ›</button>
              </div>
              <div class="sum-export-btns">
                <button class="sum-exp sum-exp--csv"  (click)="exportSum('csv')">CSV</button>
                <button class="sum-exp sum-exp--xlsx" (click)="exportSum('xlsx')">XLSX</button>
                <button class="sum-exp sum-exp--pdf"  (click)="exportSum('pdf')">PDF</button>
              </div>
            </div>
          </div>

          <!-- PT Table -->
          <div class="sum-table-wrap">
            <table class="sum-table">
              <thead>
                <tr>
                  <th (click)="setSumSort('kode_pt')" class="th-sort">Kode PT <span class="sum-si">{{ sumSortIcon('kode_pt') }}</span></th>
                  <th (click)="setSumSort('nama')" class="th-sort">Nama <span class="sum-si">{{ sumSortIcon('nama') }}</span></th>
                  <th>Wilayah</th>
                  <th>Jenis</th>
                  <th>Organisasi</th>
                  <th (click)="setSumSort('akreditasi_institusi')" class="th-sort">Akreditasi <span class="sum-si">{{ sumSortIcon('akreditasi_institusi') }}</span></th>
                  <th class="sk-col">No. SK</th>
                  <th (click)="setSumSort('tanggal_kadaluarsa_akreditasi')" class="th-sort">Berlaku s/d <span class="sum-si">{{ sumSortIcon('tanggal_kadaluarsa_akreditasi') }}</span></th>
                  <th class="text-center">Prodi</th>
                  <th (click)="setSumSort('mhs_sort')" class="th-sort text-right">Mahasiswa <span class="sum-si">{{ sumSortIcon('mhs_sort') }}</span></th>
                  <th (click)="setSumSort('dosen_sort')" class="th-sort text-right">Dosen <span class="sum-si">{{ sumSortIcon('dosen_sort') }}</span></th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let pt of sumData"
                    [class]="!pt.is_active ? 'row-inactive' : 'row-' + expStatus(pt.tanggal_kadaluarsa_akreditasi)"
                    (click)="goToDetail(pt.id)" style="cursor:pointer">
                  <td><code>{{ pt.kode_pt }}</code></td>
                  <td>
                    <a [routerLink]="['/perguruan-tinggi', pt.id]" class="pt-link">
                      <strong>{{ pt.singkatan }}</strong><br><small>{{ pt.nama }}</small>
                    </a>
                  </td>
                  <td>{{ pt.wilayah_nama || '—' }}</td>
                  <td>{{ pt.jenis | titlecase }}</td>
                  <td><span [class]="'badge ' + (pt.organisasi_induk === 'muhammadiyah' ? 'badge-muh' : 'badge-ais')">
                    {{ pt.organisasi_induk === 'muhammadiyah' ? 'Muhammadiyah' : 'Aisyiyah' }}
                  </span></td>
                  <td><span [class]="'badge badge-' + pt.akreditasi_institusi">{{ fmtAkr(pt.akreditasi_institusi) }}</span></td>
                  <td class="sk-col">{{ pt.nomor_sk_akreditasi || '—' }}</td>
                  <td class="nowrap">
                    <span *ngIf="pt.tanggal_kadaluarsa_akreditasi"
                          [class]="'exp-pill exp-' + expStatus(pt.tanggal_kadaluarsa_akreditasi)">
                      {{ pt.tanggal_kadaluarsa_akreditasi | date:'dd/MM/yyyy' }}
                    </span>
                    <span *ngIf="!pt.tanggal_kadaluarsa_akreditasi" class="no-data">—</span>
                  </td>
                  <td class="text-center">{{ pt.total_prodi }}</td>
                  <td class="text-right">{{ pt.total_mahasiswa | number }}</td>
                  <td class="text-right">{{ pt.total_dosen | number }}</td>
                  <td><span [class]="pt.is_active ? 'badge badge-aktif' : 'badge badge-nonaktif'">
                    {{ pt.is_active ? 'Aktif' : 'Tidak Aktif' }}
                  </span></td>
                </tr>
                <tr *ngIf="sumLoading"><td colspan="12" class="sum-state-cell">Memuat...</td></tr>
                <tr *ngIf="!sumLoading && sumData.length === 0"><td colspan="12" class="sum-state-cell">Tidak ada data</td></tr>
              </tbody>
            </table>
          </div>
          <div class="sum-pagination sum-pagination--bottom" *ngIf="sumTotalPages > 1">
            <button (click)="sumPrev()" [disabled]="sumPage <= 1">‹ Prev</button>
            <span>Hal {{ sumPage }} / {{ sumTotalPages }}</span>
            <button (click)="sumNext()" [disabled]="sumPage >= sumTotalPages">Next ›</button>
          </div>

          <!-- ── TOMBOL GENERATE LAPORAN ─────────────────────────── -->
          <div class="gen-section">
            <div class="gen-divider"></div>
            <div class="gen-header">
              <div>
                <div class="gen-title">Generate Laporan Performa</div>
                <div class="gen-desc">Hitung distribusi prodi, gender, jabatan, pendidikan, status, ikatan kerja dosen, dan tren mahasiswa 7 semester terakhir untuk seluruh PT.</div>
              </div>
              <button class="gen-btn" (click)="generateLaporan()" [disabled]="generating">
                <svg *ngIf="!generating" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
                </svg>
                <svg *ngIf="generating" viewBox="0 0 24 24" fill="currentColor" width="16" height="16"
                     style="animation:spin .8s linear infinite">
                  <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
                </svg>
                {{ generating ? 'Menghitung...' : 'Generate Laporan' }}
              </button>
            </div>

            <!-- Riwayat snapshot -->
            <div class="snap-list" *ngIf="snapshots.length > 0">
              <div class="snap-list-title">Riwayat Laporan</div>
              <div class="snap-items">
                <div class="snap-item" *ngFor="let s of snapshots"
                     [class.snap-item--active]="activeSnap?.id === s.id"
                     (click)="loadSnap(s.id)">
                  <div class="snap-item-date">{{ s.dibuat_pada | date:'dd MMM yyyy HH:mm' }}</div>
                  <div class="snap-item-meta">{{ s.total_pt }} PT<span *ngIf="s.keterangan"> · {{ s.keterangan }}</span></div>
                  <div class="snap-item-arrow">›</div>
                </div>
              </div>
            </div>

            <!-- Hasil snapshot terpilih -->
            <div class="snap-result" *ngIf="activeSnap">
              <div class="snap-result-header">
                <div class="snap-result-title">
                  Laporan {{ activeSnap.dibuat_pada | date:'dd MMM yyyy HH:mm' }}
                  <span class="snap-result-sub">{{ activeSnap.total_pt }} PT</span>
                </div>
                <div class="snap-result-actions">
                  <button class="sum-exp sum-exp--csv"  (click)="exportSnap('csv')">CSV</button>
                  <button class="sum-exp sum-exp--xlsx" (click)="exportSnap('xlsx')">XLSX</button>
                  <button class="sum-exp sum-exp--pdf"  (click)="exportSnap('pdf')">PDF</button>
                </div>
              </div>

              <!-- Search/filter dalam snapshot -->
              <div class="snap-search-row">
                <input type="text" [(ngModel)]="snapFilter" placeholder="Filter nama PT..."
                       class="snap-search-input">
                <span class="snap-search-count">{{ filteredSnap.length }} PT ditampilkan</span>
              </div>

              <div class="snap-table-wrap">
                <table class="snap-table">
                  <thead>
                    <tr>
                      <th>PT</th>
                      <th class="text-center">Prodi</th>
                      <th class="text-center">Dosen</th>
                      <th class="text-center">Pria</th>
                      <th class="text-center">Wanita</th>
                      <th>Jabatan Fungsional</th>
                      <th>Pendidikan</th>
                      <th>Status Dosen</th>
                      <th>Ikatan Kerja</th>
                      <th>Mhs Tren (7 sem)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let r of filteredSnap" (click)="goToDetail(r.pt_id)" style="cursor:pointer">
                      <td>
                        <div class="snap-pt-nama">{{ r.pt_singkatan || r.pt_nama }}</div>
                        <code class="snap-pt-kode">{{ r.pt_kode }}</code>
                      </td>
                      <td class="text-center"><strong>{{ r.total_prodi }}</strong></td>
                      <td class="text-center"><strong>{{ r.total_dosen }}</strong></td>
                      <td class="text-center">{{ r.dosen_pria }}</td>
                      <td class="text-center">{{ r.dosen_wanita }}</td>
                      <td>
                        <div class="dist-chips">
                          <span *ngFor="let kv of toKV(r.dosen_per_jabatan)" class="dist-chip">
                            <span class="chip-key">{{ kv.k || '—' }}</span>
                            <span class="chip-val">{{ kv.v }}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div class="dist-chips">
                          <span *ngFor="let kv of toKV(r.dosen_per_pendidikan)" class="dist-chip">
                            <span class="chip-key">{{ kv.k?.toUpperCase() || '—' }}</span>
                            <span class="chip-val">{{ kv.v }}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div class="dist-chips">
                          <span *ngFor="let kv of toKV(r.dosen_per_status)" class="dist-chip">
                            <span class="chip-key">{{ kv.k || '—' }}</span>
                            <span class="chip-val">{{ kv.v }}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div class="dist-chips">
                          <span *ngFor="let kv of toKV(r.dosen_per_ikatan)" class="dist-chip">
                            <span class="chip-key">{{ kv.k || '—' }}</span>
                            <span class="chip-val">{{ kv.v }}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <div class="tren-mini">
                          <span *ngFor="let t of r.mhs_tren; let last = last" class="tren-dot"
                                [title]="t.periode + ': ' + (t.total | number)">
                            <span class="tren-bar" [style.height.px]="trenHeight(t.total, r.mhs_tren)"></span>
                          </span>
                          <span class="tren-last">{{ lastTren(r.mhs_tren) | number }}</span>
                        </div>
                      </td>
                    </tr>
                    <tr *ngIf="snapLoading"><td colspan="10" class="sum-state-cell">Memuat laporan...</td></tr>
                    <tr *ngIf="!snapLoading && filteredSnap.length === 0 && activeSnap">
                      <td colspan="10" class="sum-state-cell">Tidak ada data</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div><!-- /snap-result -->

          </div><!-- /gen-section -->
        </div><!-- /sum-body -->
      </div><!-- /sum-accordion -->

      <!-- Filter Wilayah accordion -->
      <div class="filter-card" *ngIf="wilayahList.length">
        <div class="filter-header" (click)="filterOpen = !filterOpen">
          <span class="filter-title">
            <svg class="filter-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/></svg>
            Filter Wilayah
            <span class="badge-filter">{{ selectedIds.size }} / {{ wilayahList.length }} dipilih</span>
          </span>
          <span class="chevron">{{ filterOpen ? '▲' : '▼' }}</span>
        </div>
        <div class="filter-body" *ngIf="filterOpen">
          <div class="filter-actions">
            <button (click)="selectAll()">Pilih Semua</button>
            <button (click)="clearAll()">Hapus Semua</button>
          </div>
          <div class="wilayah-grid">
            <label *ngFor="let w of wilayahList" class="wilayah-item" [class.selected]="selectedIds.has(w.id)">
              <input type="checkbox" [checked]="selectedIds.has(w.id)" (change)="toggleWilayah(w.id)">
              <span class="w-nama">{{ w.nama }}</span>
            </label>
          </div>
        </div>
      </div>

      <ng-container *ngIf="statistik && !loading">
        <!-- Stat cards -->
        <div class="stat-grid">
          <div class="stat-card stat-card--blue">
            <div class="stat-card__icon">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
            </div>
            <div class="stat-card__val">{{ statistik.total_pt | number }}</div>
            <div class="stat-card__lbl">Total Perguruan Tinggi</div>
            <div class="stat-card__sub">{{ statistik.total_muhammadiyah }} Muhammadiyah · {{ statistik.total_aisyiyah }} Aisyiyah</div>
          </div>
          <div class="stat-card stat-card--light">
            <div class="stat-card__icon stat-card__icon--dark">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
            </div>
            <div class="stat-card__val stat-card__val--dark">{{ statistik.total_prodi | number }}</div>
            <div class="stat-card__lbl stat-card__lbl--dark">Program Studi Aktif</div>
          </div>
          <div class="stat-card stat-card--light">
            <div class="stat-card__icon stat-card__icon--dark">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            </div>
            <div class="stat-card__val stat-card__val--dark">{{ statistik.total_mahasiswa | number }}</div>
            <div class="stat-card__lbl stat-card__lbl--dark">Total Mahasiswa</div>
          </div>
          <div class="stat-card stat-card--light">
            <div class="stat-card__icon stat-card__icon--dark">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/><circle cx="18" cy="18" r="5" fill="#22c55e"/><path d="M17 20.5l-2-2 .7-.7 1.3 1.3 2.8-2.8.7.7z" fill="white"/></svg>
            </div>
            <div class="stat-card__val stat-card__val--dark">{{ statistik.total_dosen | number }}</div>
            <div class="stat-card__lbl stat-card__lbl--dark">Dosen Tetap</div>
            <div class="stat-card__sub stat-card__sub--dark" *ngIf="statistik.tahun_dosen">data {{ statistik.tahun_dosen }}</div>
          </div>
        </div>

        <!-- Bar charts -->
        <div class="charts-row charts-row--bar">
          <div class="chart-card">
            <div class="chart-card__title">Distribusi Jenis PT</div>
            <div class="chart-list">
              <div class="chart-bar-item" *ngFor="let item of statistik.per_jenis">
                <div class="bar-label">{{ item.jenis | titlecase }}</div>
                <div class="bar-track"><div class="bar-fill" [style.width.%]="(item.total/statistik.total_pt*100)"></div></div>
                <div class="bar-val">{{ item.total }}</div>
              </div>
            </div>
          </div>
          <div class="chart-card">
            <div class="chart-card__title">Status Akreditasi Institusi</div>
            <div class="chart-list">
              <div class="chart-bar-item" *ngFor="let item of statistik.per_akreditasi">
                <div class="bar-label">{{ fmtAkr(item.akreditasi_institusi) }}</div>
                <div class="bar-track"><div class="bar-fill bar-fill--green" [style.width.%]="(item.total/statistik.total_pt*100)"></div></div>
                <div class="bar-val">{{ item.total }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sebaran Wilayah -->
        <div class="chart-card">
          <div class="chart-card__title">Sebaran per Wilayah</div>
          <div class="table-wrapper">
            <table class="data-table">
              <thead><tr><th>Wilayah</th><th>Provinsi</th><th class="col-num">Jumlah PT</th><th>Distribusi</th></tr></thead>
              <tbody>
                <tr *ngFor="let w of statistik.per_wilayah">
                  <td>{{ w.wilayah__nama }}</td>
                  <td class="col-prov">{{ w.wilayah__provinsi }}</td>
                  <td class="col-num"><strong>{{ w.total }}</strong></td>
                  <td class="col-bar"><div class="bar-track sm"><div class="bar-fill" [style.width.%]="(w.total/statistik.total_pt*100)"></div></div></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ng-container>

    </div>
  `,
  styles: [`
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slide { from { transform: translateX(-100%); } to { transform: translateX(300%); } }

    .page-wrap { max-width: 1400px; margin: 0 auto; padding: 24px 20px 40px; }
    .page-header { margin-bottom: 24px; }
    .page-header__title h1 { font-size: 22px; font-weight: 700; color: #1a237e; margin: 0 0 4px; }
    .page-header__sub { color: #64748b; font-size: 13px; margin: 0; }
    .loading-wrap { margin-bottom: 16px; }
    .loading-bar { height: 3px; background: #e8eaf6; border-radius: 2px; overflow: hidden; }
    .loading-bar-fill { height: 100%; width: 40%; background: #1a237e; animation: slide 1s ease-in-out infinite alternate; }

    /* ── Ringkasan accordion ── */
    .sum-accordion {
      background: #fff; border-radius: 12px; margin-bottom: 1rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.08); border-left: 4px solid #1d4ed8;
    }
    .sum-toggle {
      width: 100%; display: flex; align-items: center; gap: .6rem;
      background: none; border: none; padding: .85rem 1.1rem;
      font-size: .9rem; font-weight: 600; color: #1e3a8a; cursor: pointer; text-align: left; border-radius: 12px;
    }
    .sum-toggle:hover { background: rgba(59,130,246,.05); }
    .sum-title-en { font-weight: 400; color: #64748b; font-size: .82rem; }
    .sum-count { margin-left: .4rem; font-size: .75rem; font-weight: 600; padding: 2px 9px; background: #dbeafe; color: #1e40af; border-radius: 20px; }
    .sum-chevron { margin-left: auto; font-size: .85rem; color: #2563eb; transition: transform .2s; }
    .sum-chevron.rotated { transform: rotate(180deg); }
    .sum-body { padding: 0 1.1rem 1.1rem; border-top: 1px solid #e8eaf6; }

    /* Search form */
    .sum-fields { display: grid; grid-template-columns: 1fr; gap: .75rem; margin-bottom: .75rem; padding-top: .9rem; }
    @media (min-width: 600px)  { .sum-fields { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1024px) { .sum-fields { grid-template-columns: repeat(5,1fr); } }
    .sumf { display: flex; flex-direction: column; gap: .3rem; }
    .sumf label { font-size: .78rem; font-weight: 600; color: #1e40af; }
    .sumf input, .sumf select {
      padding: .5rem .75rem; border: 1px solid #93c5fd; border-radius: 8px;
      font-size: .875rem; outline: none; background: #eff6ff; color: #1e293b;
    }
    .sumf input:focus, .sumf select:focus { border-color: #1d4ed8; box-shadow: 0 0 0 2px rgba(29,78,216,.12); }
    .sumf--action { justify-content: flex-end; flex-direction: row; align-items: flex-end; gap: .5rem; }
    .sum-btn-search { padding: .5rem 1.25rem; background: #1d4ed8; color: #fff; border: none; border-radius: 8px; font-size: .875rem; font-weight: 600; cursor: pointer; }
    .sum-btn-search:hover:not(:disabled) { background: #1e3a8a; }
    .sum-btn-search:disabled { opacity: .5; cursor: not-allowed; }
    .sum-btn-reset { padding: .5rem 1rem; background: #eff6ff; color: #1e40af; border: 1px solid #93c5fd; border-radius: 8px; font-size: .875rem; cursor: pointer; }
    .sum-btn-reset:hover { background: #dbeafe; }

    /* Results header */
    .sum-results-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; margin-bottom: .5rem; }
    .sum-info { font-size: .82rem; color: #1e40af; }
    .sum-info strong { color: #1e3a8a; }
    .sum-actions { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .sum-pagination { display: flex; align-items: center; gap: .6rem; font-size: .83rem; }
    .sum-pagination--bottom { justify-content: center; margin-top: .6rem; }
    .sum-pagination span { color: #555; white-space: nowrap; }
    .sum-pagination button { padding: .3rem .8rem; border: 1px solid #93c5fd; border-radius: 8px; background: #eff6ff; cursor: pointer; color: #1e40af; }
    .sum-pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .sum-pagination button:hover:not(:disabled) { background: #dbeafe; }
    .sum-export-btns { display: flex; gap: .35rem; }
    .sum-exp { padding: .28rem .7rem; border-radius: 6px; font-size: .75rem; font-weight: 600; cursor: pointer; border: 1px solid; }
    .sum-exp--csv  { background: #f0fdf4; color: #166534; border-color: #86efac; }
    .sum-exp--csv:hover  { background: #dcfce7; }
    .sum-exp--xlsx { background: #f0fdf4; color: #15803d; border-color: #4ade80; }
    .sum-exp--xlsx:hover { background: #bbf7d0; }
    .sum-exp--pdf  { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
    .sum-exp--pdf:hover  { background: #fee2e2; }

    /* PT Table */
    .sum-table-wrap { overflow-x: auto; border-radius: 10px; background: rgba(59,130,246,.03); }
    .sum-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
    .sum-table th { background: rgba(59,130,246,.08); padding: .55rem .75rem; text-align: left; font-weight: 600; color: #1e40af; border-bottom: 2px solid rgba(59,130,246,.15); white-space: nowrap; }
    .sum-table th.th-sort { cursor: pointer; user-select: none; }
    .sum-table th.th-sort:hover { background: rgba(59,130,246,.14); }
    .sum-si { font-size: .72rem; color: #93c5fd; margin-left: .2rem; }
    .sum-table td { padding: .5rem .75rem; border-bottom: 1px solid rgba(59,130,246,.08); color: #1e293b; vertical-align: middle; }
    .sum-table tr:last-child td { border-bottom: none; }
    .sum-table tr.row-yellow td { background: #fffbec; }
    .sum-table tr.row-red    td { background: #fff4f4; }
    .sum-table tr.row-inactive td { background: #fff0f0; }
    .sum-table tr:hover td { background: #dbeafe !important; }
    .sum-state-cell { text-align: center; padding: 24px; color: #94a3b8; font-size: 13px; }

    /* ── Generate Laporan section ── */
    .gen-section { margin-top: 1.25rem; }
    .gen-divider { height: 1px; background: #e8eaf6; margin-bottom: 1rem; }
    .gen-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .gen-title { font-size: .95rem; font-weight: 700; color: #1e3a8a; margin-bottom: .25rem; }
    .gen-desc  { font-size: .8rem; color: #64748b; max-width: 560px; line-height: 1.5; }
    .gen-btn {
      display: flex; align-items: center; gap: .5rem;
      padding: .6rem 1.4rem; background: linear-gradient(135deg,#1d4ed8,#1e3a8a);
      color: #fff; border: none; border-radius: 10px; font-size: .88rem; font-weight: 600;
      cursor: pointer; white-space: nowrap; box-shadow: 0 2px 8px rgba(29,78,216,.35);
      transition: filter .15s;
    }
    .gen-btn:hover:not(:disabled) { filter: brightness(1.1); }
    .gen-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* Snapshot list */
    .snap-list { margin-bottom: .75rem; }
    .snap-list-title { font-size: .78rem; font-weight: 600; color: #1e40af; margin-bottom: .4rem; }
    .snap-items { display: flex; flex-wrap: wrap; gap: .4rem; }
    .snap-item {
      display: flex; align-items: center; gap: .6rem; padding: .4rem .85rem;
      border: 1px solid #bfdbfe; border-radius: 8px; cursor: pointer;
      background: #eff6ff; font-size: .8rem; transition: background .12s;
    }
    .snap-item:hover { background: #dbeafe; }
    .snap-item--active { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
    .snap-item--active .snap-item-meta { color: #bfdbfe; }
    .snap-item-date { font-weight: 600; }
    .snap-item-meta { font-size: .72rem; color: #64748b; }
    .snap-item-arrow { opacity: .5; }

    /* Snapshot result table */
    .snap-result { margin-top: .75rem; }
    .snap-result-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; margin-bottom: .6rem; }
    .snap-result-title { font-size: .88rem; font-weight: 700; color: #1e3a8a; display: flex; align-items: center; gap: .5rem; }
    .snap-result-sub { font-size: .75rem; font-weight: 400; color: #64748b; }
    .snap-result-actions { display: flex; gap: .35rem; }
    .snap-search-row { display: flex; align-items: center; gap: .75rem; margin-bottom: .5rem; }
    .snap-search-input { flex: 1; max-width: 280px; padding: .4rem .75rem; border: 1px solid #93c5fd; border-radius: 8px; font-size: .85rem; background: #eff6ff; outline: none; }
    .snap-search-input:focus { border-color: #1d4ed8; }
    .snap-search-count { font-size: .78rem; color: #94a3b8; }
    .snap-table-wrap { overflow-x: auto; border-radius: 10px; }
    .snap-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
    .snap-table th { background: #f0f4ff; padding: .5rem .65rem; text-align: left; font-weight: 600; color: #1e40af; border-bottom: 2px solid #c7d2fe; white-space: nowrap; }
    .snap-table td { padding: .45rem .65rem; border-bottom: 1px solid #e8eaf6; vertical-align: middle; }
    .snap-table tr:last-child td { border-bottom: none; }
    .snap-table tr:hover td { background: #f0f4ff; }
    .snap-pt-nama { font-weight: 600; color: #1e293b; }
    .snap-pt-kode { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: .7rem; color: #64748b; }
    .dist-chips { display: flex; flex-wrap: wrap; gap: 3px; }
    .dist-chip { display: inline-flex; align-items: center; gap: 3px; background: #f1f5f9; border-radius: 10px; padding: 1px 6px; font-size: .7rem; }
    .chip-key { color: #475569; }
    .chip-val { font-weight: 700; color: #1e40af; }
    .tren-mini { display: flex; align-items: flex-end; gap: 2px; height: 28px; }
    .tren-dot { display: flex; align-items: flex-end; width: 6px; }
    .tren-bar { width: 6px; background: #3b82f6; border-radius: 2px 2px 0 0; min-height: 2px; }
    .tren-last { font-size: .7rem; font-weight: 600; color: #1e40af; margin-left: 4px; align-self: center; }

    /* Shared badge / table */
    .pt-link { text-decoration: none; color: inherit; }
    .pt-link:hover strong { color: #1a237e; text-decoration: underline; }
    small { color: #888; font-size: 11px; }
    code { background: #f0f0f0; padding: 2px 5px; border-radius: 4px; font-size: 10px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
    .badge-muh { background: #e3f2fd; color: #1565c0; }
    .badge-ais { background: #fce4ec; color: #c62828; }
    .badge-unggul { background: #e6f4ea; color: #137333; }
    .badge-baik_sekali { background: #e8f5e9; color: #2e7d32; }
    .badge-baik { background: #fff8e1; color: #f57f17; }
    .badge-belum { background: #f1f3f4; color: #5f6368; }
    .badge-aktif { background: #e6f4ea; color: #137333; }
    .badge-nonaktif { background: #fce8e6; color: #c5221f; }
    .text-center { text-align: center; }
    .text-right  { text-align: right; }
    .nowrap { white-space: nowrap; }
    .sk-col { display: none; }
    .no-data { color: #bbb; }
    .exp-pill { display: inline-block; padding: 3px 8px; border-radius: 6px; font-weight: 700; color: #111; font-size: 12px; white-space: nowrap; }
    .exp-green  { background: #d4edda; }
    .exp-yellow { background: #fff3cd; }
    .exp-red    { background: #f8d7da; }

    /* Filter card */
    .filter-card { background: #fff; border: 1px solid #e8eaf6; border-radius: 14px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .filter-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; cursor: pointer; user-select: none; transition: background .15s; }
    .filter-header:hover { background: #f5f7ff; }
    .filter-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #334155; }
    .filter-icon { width: 18px; height: 18px; color: #1a237e; }
    .badge-filter { font-size: 11px; font-weight: 600; padding: 2px 8px; background: #e8eaf6; color: #1a237e; border-radius: 20px; }
    .chevron { font-size: 11px; color: #94a3b8; }
    .filter-body { padding: 14px 20px 18px; border-top: 1px solid #f0f4f8; }
    .filter-actions { display: flex; gap: 8px; margin-bottom: 12px; }
    .filter-actions button { padding: 4px 14px; font-size: 12px; border: 1px solid #1a237e; border-radius: 6px; cursor: pointer; background: #fff; color: #1a237e; transition: all .15s; }
    .filter-actions button:hover { background: #1a237e; color: #fff; }
    .wilayah-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: 6px; max-height: 240px; overflow-y: auto; }
    .wilayah-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; cursor: pointer; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 500; color: #334155; transition: background .12s, border-color .12s; }
    .wilayah-item:hover { background: #f0f4ff; }
    .wilayah-item.selected { background: #e8eaf6; border-color: #9fa8da; }
    .wilayah-item input[type=checkbox] { flex-shrink: 0; cursor: pointer; }

    /* Stat grid */
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 16px; margin-bottom: 20px; }
    .stat-card { border-radius: 14px; padding: 20px 22px; box-shadow: 0 1px 4px rgba(0,0,0,.07); display: flex; flex-direction: column; gap: 4px; }
    .stat-card--blue  { background: #1a237e; }
    .stat-card--light { background: #fff; border: 1px solid #e8eaf6; }
    .stat-card__icon { width: 32px; height: 32px; margin-bottom: 6px; }
    .stat-card__icon svg { width: 100%; height: 100%; }
    .stat-card--blue .stat-card__icon { color: #c5cae9; }
    .stat-card__icon--dark { color: #1a237e; }
    .stat-card__val { font-size: 28px; font-weight: 700; line-height: 1.1; }
    .stat-card--blue .stat-card__val { color: #fff; }
    .stat-card__val--dark { color: #1a237e; }
    .stat-card__lbl { font-size: 12px; font-weight: 600; }
    .stat-card--blue .stat-card__lbl { color: #c5cae9; }
    .stat-card__lbl--dark { color: #64748b; }
    .stat-card__sub { font-size: 11px; margin-top: 2px; color: #9fa8da; }
    .stat-card__sub--dark { color: #94a3b8; }

    /* Chart / bar */
    .chart-card { background: #fff; border: 1px solid #e8eaf6; border-radius: 14px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
    .chart-card__title { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 16px; }
    .charts-row { display: grid; gap: 16px; margin-bottom: 20px; }
    .charts-row--bar { grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); }
    .charts-row .chart-card { margin-bottom: 0; }
    .chart-list { display: flex; flex-direction: column; gap: 10px; }
    .chart-bar-item { display: flex; align-items: center; gap: 8px; }
    .bar-label { width: 110px; font-size: 12px; color: #555; flex-shrink: 0; }
    .bar-track { flex: 1; height: 8px; background: #f0f0f0; border-radius: 4px; overflow: hidden; }
    .bar-track.sm { height: 6px; }
    .bar-fill { height: 100%; background: #1a237e; border-radius: 4px; transition: width .5s; }
    .bar-fill--green { background: #137333; }
    .bar-val { width: 28px; text-align: right; font-size: 12px; font-weight: 600; color: #333; }
    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .data-table th { text-align: left; padding: 8px 10px; background: #f8f9fa; font-weight: 600; color: #555; border-bottom: 2px solid #e9ecef; white-space: nowrap; }
    .data-table td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .col-num { text-align: right; }
    .col-prov { color: #64748b; font-size: 12px; }
    .col-bar { min-width: 100px; }
    @media (min-width: 600px) { .sk-col { display: table-cell; font-size: 11px; } }
  `]
})
export class StatistikComponent implements OnInit {
  statistik: any;
  loading = true;
  wilayahList: any[] = [];
  selectedIds = new Set<number>();
  filterOpen = false;

  // Ringkasan PT list
  summaryOpen = false;
  sumData: any[] = [];
  sumPage = 1;
  sumTotal = 0;
  sumLoading = false;
  sumSearchDone = false;
  sumSearch = '';
  sumJenis = '';
  sumOrganisasi = '';
  sumAkreditasi = '';
  sumSortKey = 'mhs_sort';
  sumSortAsc = false;
  private readonly SUM_PAGE_SIZE = 5;

  // Generate laporan
  generating = false;
  snapshots: any[] = [];
  activeSnap: any = null;
  snapLoading = false;
  snapFilter = '';

  private debounceTimer: any;

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.getWilayahList().subscribe({
      next: (d: any) => {
        const list = Array.isArray(d) ? d : (d.results || []);
        this.wilayahList = list.sort((a: any, b: any) => a.nama.localeCompare(b.nama));
        this.wilayahList.forEach((w: any) => this.selectedIds.add(w.id));
        this.selectedIds = new Set(this.selectedIds);
      }
    });
    this.loadStatistik();
    this.loadSummary();
    this.loadSnapshots();
  }

  // ── PT table ──────────────────────────────────────
  get sumTotalPages() { return Math.max(1, Math.ceil(this.sumTotal / this.SUM_PAGE_SIZE)); }

  runSumSearch() { this.sumSearchDone = true; this.sumPage = 1; this.loadSummary(); }

  resetSumSearch() {
    this.sumSearch = ''; this.sumJenis = ''; this.sumOrganisasi = ''; this.sumAkreditasi = '';
    this.sumSearchDone = false; this.sumPage = 1; this.loadSummary();
  }

  setSumSort(key: string) {
    this.sumSortAsc = this.sumSortKey === key ? !this.sumSortAsc : true;
    this.sumSortKey = key; this.sumPage = 1; this.loadSummary();
  }

  sumSortIcon(key: string) { return this.sumSortKey !== key ? '↕' : this.sumSortAsc ? '↑' : '↓'; }

  loadSummary() {
    this.sumLoading = true;
    const params: any = { page: this.sumPage, page_size: this.SUM_PAGE_SIZE, ordering: (this.sumSortAsc ? '' : '-') + this.sumSortKey };
    if (this.sumSearch)     params['search']               = this.sumSearch;
    if (this.sumJenis)      params['jenis']                = this.sumJenis;
    if (this.sumOrganisasi) params['organisasi_induk']     = this.sumOrganisasi;
    if (this.sumAkreditasi) params['akreditasi_institusi'] = this.sumAkreditasi;
    this.api.getPerguruanTinggiList(params).subscribe({
      next: (res: any) => { this.sumData = res.results || res; this.sumTotal = res.count || this.sumData.length; this.sumLoading = false; },
      error: () => this.sumLoading = false
    });
  }

  sumNext() { if (this.sumPage < this.sumTotalPages) { this.sumPage++; this.loadSummary(); } }
  sumPrev() { if (this.sumPage > 1) { this.sumPage--; this.loadSummary(); } }

  exportSum(fmt: 'csv'|'xlsx'|'pdf') {
    const params: any = { page: 1, page_size: 500, ordering: (this.sumSortAsc?'':'-')+this.sumSortKey };
    if (this.sumSearch)     params['search']               = this.sumSearch;
    if (this.sumJenis)      params['jenis']                = this.sumJenis;
    if (this.sumOrganisasi) params['organisasi_induk']     = this.sumOrganisasi;
    if (this.sumAkreditasi) params['akreditasi_institusi'] = this.sumAkreditasi;
    this.api.getPerguruanTinggiList(params).subscribe({ next: (res: any) => {
      const rows = (res.results || res) as any[];
      const hdrs = ['Kode PT','Singkatan','Nama','Jenis','Organisasi','Wilayah','Akreditasi','No.SK','Berlaku s/d','Prodi','Mahasiswa','Dosen','Status'];
      const body = rows.map((p: any) => [p.kode_pt,p.singkatan,p.nama,(p.jenis||'').replace('_',' '),p.organisasi_induk,p.wilayah_nama||'',this.fmtAkr(p.akreditasi_institusi),p.nomor_sk_akreditasi||'',p.tanggal_kadaluarsa_akreditasi||'',p.total_prodi??'',p.total_mahasiswa??'',p.total_dosen??'',p.is_active?'Aktif':'Tidak Aktif']);
      this._doExport(fmt, hdrs, body, 'ringkasan-pt');
    }});
  }

  // ── Generate Laporan ──────────────────────────────
  loadSnapshots() {
    this.api.getSnapshotList().subscribe({ next: (d: any) => this.snapshots = d, error: () => {} });
  }

  generateLaporan() {
    this.generating = true;
    this.api.generateSnapshot().subscribe({
      next: (snap: any) => {
        this.generating = false;
        this.snapshots = [snap, ...this.snapshots].slice(0, 10);
        this.activeSnap = snap;
      },
      error: () => { this.generating = false; alert('Gagal generate laporan, coba lagi.'); }
    });
  }

  loadSnap(id: number) {
    if (this.activeSnap?.id === id) { this.activeSnap = null; return; }
    this.snapLoading = true;
    this.api.getSnapshotDetail(id).subscribe({
      next: (d: any) => { this.activeSnap = d; this.snapLoading = false; },
      error: () => this.snapLoading = false
    });
  }

  get filteredSnap(): any[] {
    if (!this.activeSnap?.per_pt) return [];
    const q = this.snapFilter.toLowerCase().trim();
    if (!q) return this.activeSnap.per_pt;
    return this.activeSnap.per_pt.filter((r: any) =>
      (r.pt_nama||'').toLowerCase().includes(q) || (r.pt_singkatan||'').toLowerCase().includes(q) || (r.pt_kode||'').toLowerCase().includes(q)
    );
  }

  toKV(obj: any): { k: string; v: number }[] {
    if (!obj) return [];
    return Object.entries(obj).filter(([, v]) => (v as number) > 0).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([k, v]) => ({ k, v: v as number }));
  }

  trenHeight(val: number, tren: any[]): number {
    const max = Math.max(...tren.map((t: any) => t.total), 1);
    return Math.max(2, Math.round((val / max) * 24));
  }

  lastTren(tren: any[]): number {
    if (!tren?.length) return 0;
    return tren[tren.length - 1]?.total || 0;
  }

  exportSnap(fmt: 'csv'|'xlsx'|'pdf') {
    if (!this.activeSnap?.per_pt) return;
    const rows = this.filteredSnap;
    const hdrs = ['Kode PT','Singkatan','Nama','Total Prodi','Total Dosen','Pria','Wanita','Profesor','Lektor Kepala','Lektor','Asisten Ahli','S3','S2','S1','Status Aktif','Tugas Belajar','Tetap','Tidak Tetap','Mhs Sem Terakhir'];
    const body = rows.map((r: any) => {
      const jab = r.dosen_per_jabatan || {};
      const pend = r.dosen_per_pendidikan || {};
      const sts = r.dosen_per_status || {};
      const ikt = r.dosen_per_ikatan || {};
      return [r.pt_kode,r.pt_singkatan,r.pt_nama,r.total_prodi,r.total_dosen,r.dosen_pria,r.dosen_wanita,jab['Profesor']||0,jab['Lektor Kepala']||0,jab['Lektor']||0,jab['Asisten Ahli']||0,pend['s3']||0,pend['s2']||0,pend['s1']||0,sts['Aktif']||0,sts['TUGAS BELAJAR']||0,ikt['tetap']||0,ikt['tidak_tetap']||0,this.lastTren(r.mhs_tren)];
    });
    const ts = (this.activeSnap.dibuat_pada||'').slice(0,10);
    this._doExport(fmt, hdrs, body, `laporan-performa-${ts}`);
  }

  private _doExport(fmt: string, headers: string[], body: any[][], filename: string) {
    const ts = new Date().toISOString().slice(0,10);
    if (fmt === 'csv') {
      const lines = [headers,...body].map(r=>r.map((c:any)=>`"${String(c??'').replace(/"/g,'""')}"`).join(','));
      const blob = new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});
      const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`${filename}-${ts}.csv`; a.click();
    } else if (fmt === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headers,...body]);
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Laporan');
      XLSX.writeFile(wb,`${filename}-${ts}.xlsx`);
    } else {
      const html=`<html><head><title>${filename}</title><style>body{font-family:sans-serif;font-size:10px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:3px 5px}th{background:#eff6ff;color:#1e40af}</style></head><body><h3>${filename}</h3><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${body.map(r=>`<tr>${r.map((c:any)=>`<td>${c??''}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
      const w=window.open('','_blank')!; w.document.write(html); w.document.close(); w.print();
    }
  }

  goToDetail(id: number) { this.router.navigate(['/perguruan-tinggi', id]); }

  expStatus(tgl: string): string {
    if (!tgl) return '';
    const diff = (new Date(tgl).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff < 60 ? 'red' : diff < 90 ? 'yellow' : 'green';
  }

  // ── Statistik / filter wilayah ──────────────────────
  toggleWilayah(id: number) {
    const next = new Set(this.selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds = next; this.scheduleReload();
  }
  selectAll() { this.selectedIds = new Set(this.wilayahList.map((w: any) => w.id)); this.scheduleReload(); }
  clearAll()  { this.selectedIds = new Set(); this.scheduleReload(); }

  private scheduleReload() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.loadStatistik(), 300);
  }

  loadStatistik() {
    this.loading = true;
    const allSelected = this.selectedIds.size === this.wilayahList.length || this.selectedIds.size === 0;
    const ids = allSelected ? [] : Array.from(this.selectedIds);
    this.api.getStatistikPT(ids).subscribe({
      next: d => { this.statistik = d; this.loading = false; },
      error: () => this.loading = false
    });
  }

  fmtAkr(v: string) { return ({unggul:'Unggul',baik_sekali:'Baik Sekali',baik:'Baik',belum:'Belum'} as any)[v]||v; }
}
