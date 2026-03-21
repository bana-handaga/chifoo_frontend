import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
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
           ACCORDION 1: GENERATE LAPORAN
           ══════════════════════════════════════════════ -->
      <div class="sum-accordion sum-accordion--gen">
        <button class="sum-toggle" (click)="genOpen = !genOpen">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;flex-shrink:0">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
          </svg>
          Generate Laporan
          <span class="sum-count" *ngIf="snapshots.length > 0">{{ snapshots.length }} riwayat</span>
          <span class="sum-chevron" [class.rotated]="genOpen">▾</span>
        </button>

        <div class="sum-body" *ngIf="genOpen">
          <div class="gen-header" style="padding-top:.9rem;padding-bottom:.75rem">
            <div>
              <div class="gen-title">Generate Laporan Performa</div>
              <div class="gen-desc">Hitung distribusi prodi, gender, jabatan, pendidikan, status, ikatan kerja dosen, dan tren mahasiswa 7 semester terakhir untuk seluruh PT.</div>
            </div>
            <button *ngIf="isAdmin" class="gen-btn" (click)="generateLaporan()" [disabled]="generating">
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

          <!-- Riwayat snapshot — tabel berpaginasi -->
          <div class="snap-list" *ngIf="snapshots.length > 0">
            <div class="snap-rule-note">
              <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13" style="flex-shrink:0;margin-top:1px">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <span>Laporan digenerate <strong>satu kali per pekan</strong> (Senin–Minggu). Generate ulang dalam pekan yang sama akan <strong>menimpa</strong> laporan sebelumnya. Laporan dari pekan berbeda tetap tersimpan.</span>
            </div>
            <div class="snap-list-header">
              <span class="snap-list-title">Riwayat Laporan</span>
              <span class="snap-list-info">{{ snapshots.length }} laporan tersimpan</span>
              <div class="snap-list-nav">
                <button (click)="snapPage = snapPage - 1" [disabled]="snapPage <= 1">‹</button>
                <span>{{ snapPage }} / {{ snapTotalPages }}</span>
                <button (click)="snapPage = snapPage + 1" [disabled]="snapPage >= snapTotalPages">›</button>
              </div>
            </div>
            <div class="snap-hist-wrap">
            <table class="snap-hist-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th class="text-center">PT Aktif</th>
                  <th class="text-center">PT Non-Aktif</th>
                  <th>Keterangan</th>
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let s of snapPagedItems"
                    [class.snap-hist-active]="activeSnap?.id === s.id"
                    (click)="loadSnap(s.id)" style="cursor:pointer">
                  <td class="snap-hist-date">{{ s.dibuat_pada | date:'dd MMM yyyy HH:mm' }}</td>
                  <td class="text-center"><strong>{{ s.total_pt }}</strong></td>
                  <td class="text-center" style="color:#dc2626">{{ s.total_pt_non_aktif || '—' }}</td>
                  <td class="snap-hist-ket">{{ s.keterangan || '—' }}</td>
                  <td class="text-center snap-action-cell" (click)="$event.stopPropagation()">
                    <button class="snap-show-btn" (click)="loadSnap(s.id)"
                            [class.snap-show-btn--active]="activeSnap?.id === s.id"
                            [title]="activeSnap?.id === s.id ? 'Sembunyikan laporan' : 'Tampilkan laporan'">
                      {{ activeSnap?.id === s.id ? 'Sembunyikan' : 'Tampilkan' }}
                    </button>
                    <button *ngIf="isAdmin" class="snap-del-btn" (click)="deleteSnap($event, s.id)" title="Hapus">
                      <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
                <tr *ngIf="snapPagedItems.length === 0">
                  <td colspan="5" class="sum-state-cell">Tidak ada riwayat</td>
                </tr>
              </tbody>
            </table>
            </div>
            <div class="snap-list-nav snap-list-nav--bottom">
              <button (click)="snapPage = snapPage - 1" [disabled]="snapPage <= 1">‹ Sebelumnya</button>
              <span>Halaman {{ snapPage }} dari {{ snapTotalPages }}</span>
              <button (click)="snapPage = snapPage + 1" [disabled]="snapPage >= snapTotalPages">Berikutnya ›</button>
            </div>
          </div>

          <!-- Hasil snapshot terpilih -->
          <div class="snap-result" *ngIf="activeSnap || snapLoading" [class.snap-result--loading]="snapLoading">

            <!-- Loading indicator -->
            <div class="snap-loading-bar" *ngIf="snapLoading">
              <div class="snap-loading-track"><div class="snap-loading-fill"></div></div>
              <span class="snap-loading-text">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" style="animation:spin .8s linear infinite;flex-shrink:0">
                  <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
                </svg>
                Mengambil data laporan...
              </span>
            </div>

            <div class="snap-result-header">
              <div class="snap-result-title">
                Laporan {{ activeSnap.dibuat_pada | date:'dd MMM yyyy HH:mm' }}
                <span class="snap-result-sub">{{ activeSnap.total_pt }} PT</span>
              </div>
            </div>
            <div class="snap-search-row">
              <input type="text" [(ngModel)]="snapFilter" placeholder="Filter nama PT..." class="snap-search-input snap-search-input--full" (ngModelChange)="snapResPage=1">
              <div class="snap-search-sub">
                <label class="snap-toggle-label">
                  <input type="checkbox" [(ngModel)]="showNonAktif" (ngModelChange)="snapResPage=1">
                  Tampilkan PT non-aktif
                </label>
                <span class="snap-search-count">{{ filteredSnap.length }} PT ditampilkan</span>
              </div>
            </div>
            <!-- Navigasi atas -->
            <div class="snap-res-nav">
              <span class="snap-res-info">Halaman {{ snapResPage }} dari {{ snapResTotalPages }}</span>
              <div class="snap-list-nav">
                <button (click)="snapResPage=snapResPage-1" [disabled]="snapResPage<=1">‹</button>
                <span>{{ snapResPage }} / {{ snapResTotalPages }}</span>
                <button (click)="snapResPage=snapResPage+1" [disabled]="snapResPage>=snapResTotalPages">›</button>
              </div>
              <div class="snap-result-actions">
                <button class="sum-exp sum-exp--csv"  (click)="exportSnap('csv')">CSV</button>
                <button class="sum-exp sum-exp--xlsx" (click)="exportSnap('xlsx')">XLSX</button>
                <button class="sum-exp sum-exp--pdf"  (click)="exportSnap('pdf')">PDF</button>
              </div>
            </div>
            <div class="snap-table-wrap">
              <table class="snap-table">
                <thead>
                  <tr>
                    <th rowspan="2" class="th-sort" (click)="setSnapSort('pt_nama')">PT <span class="sum-si">{{snapSortIcon('pt_nama')}}</span></th>
                    <th rowspan="2" class="text-center th-sort" (click)="setSnapSort('pt_organisasi')">Org <span class="sum-si">{{snapSortIcon('pt_organisasi')}}</span></th>
                    <th rowspan="2" class="text-center th-sort" (click)="setSnapSort('pt_jenis')">Jenis <span class="sum-si">{{snapSortIcon('pt_jenis')}}</span></th>
                    <th rowspan="2" class="text-center th-sort" (click)="setSnapSort('pt_akreditasi')">Akreditasi <span class="sum-si">{{snapSortIcon('pt_akreditasi')}}</span></th>
                    <th rowspan="2" class="text-center th-sort" (click)="setSnapSort('pt_aktif')">Status <span class="sum-si">{{snapSortIcon('pt_aktif')}}</span></th>
                    <th colspan="11" class="text-center th-group th-grp-prodi">Prodi</th>
                    <th colspan="3" class="text-center th-group th-grp-dosen">Dosen</th>
                    <th colspan="3" class="text-center th-group th-grp-gender">Gender</th>
                    <th colspan="5" class="text-center th-group th-grp-jabatan">Jabatan Fungsional</th>
                    <th colspan="5" class="text-center th-group th-grp-pend">Pendidikan</th>
                    <th colspan="5" class="text-center th-group th-grp-status">Status Dosen</th>
                    <th colspan="4" class="text-center th-group th-grp-ikatan">Ikatan Kerja</th>
                    <th colspan="7" class="text-center th-group th-grp-mhs">Mhs Aktif (7 Sem)</th>
                  </tr>
                  <tr>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('total_prodi')">Total <span class="sum-si">{{snapSortIcon('total_prodi')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_aktif')">Aktif <span class="sum-si">{{snapSortIcon('prodi_aktif')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_non_aktif')">Non-Aktif <span class="sum-si">{{snapSortIcon('prodi_non_aktif')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_s1')">S1 <span class="sum-si">{{snapSortIcon('prodi_s1')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_s2')">S2 <span class="sum-si">{{snapSortIcon('prodi_s2')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_s3')">S3 <span class="sum-si">{{snapSortIcon('prodi_s3')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_d3')">D3 <span class="sum-si">{{snapSortIcon('prodi_d3')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_d4')">D4 <span class="sum-si">{{snapSortIcon('prodi_d4')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_profesi')">Profesi <span class="sum-si">{{snapSortIcon('prodi_profesi')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_sp1')">Sp-1 <span class="sum-si">{{snapSortIcon('prodi_sp1')}}</span></th>
                    <th class="text-center th-sort grp-prodi" (click)="setSnapSort('prodi_jenjang_lainnya')">Lain <span class="sum-si">{{snapSortIcon('prodi_jenjang_lainnya')}}</span></th>
                    <th class="text-center th-sort grp-dosen" (click)="setSnapSort('total_dosen')">Total <span class="sum-si">{{snapSortIcon('total_dosen')}}</span></th>
                    <th class="text-center th-sort grp-dosen" (click)="setSnapSort('dosen_with_detail')">Lengkap <span class="sum-si">{{snapSortIcon('dosen_with_detail')}}</span></th>
                    <th class="text-center th-sort grp-dosen" (click)="setSnapSort('dosen_no_detail')">Blm Detail <span class="sum-si">{{snapSortIcon('dosen_no_detail')}}</span></th>
                    <th class="text-center th-sort grp-gender" (click)="setSnapSort('dosen_pria')">Pria <span class="sum-si">{{snapSortIcon('dosen_pria')}}</span></th>
                    <th class="text-center th-sort grp-gender" (click)="setSnapSort('dosen_wanita')">Wanita <span class="sum-si">{{snapSortIcon('dosen_wanita')}}</span></th>
                    <th class="text-center th-sort grp-gender" (click)="setSnapSort('dosen_gender_no_info')">No Info <span class="sum-si">{{snapSortIcon('dosen_gender_no_info')}}</span></th>
                    <th class="text-center th-sort grp-jabatan" (click)="setSnapSort('dosen_profesor')">Prof <span class="sum-si">{{snapSortIcon('dosen_profesor')}}</span></th>
                    <th class="text-center th-sort grp-jabatan" (click)="setSnapSort('dosen_lektor_kepala')">LK <span class="sum-si">{{snapSortIcon('dosen_lektor_kepala')}}</span></th>
                    <th class="text-center th-sort grp-jabatan" (click)="setSnapSort('dosen_lektor')">L <span class="sum-si">{{snapSortIcon('dosen_lektor')}}</span></th>
                    <th class="text-center th-sort grp-jabatan" (click)="setSnapSort('dosen_asisten_ahli')">AA <span class="sum-si">{{snapSortIcon('dosen_asisten_ahli')}}</span></th>
                    <th class="text-center th-sort grp-jabatan" (click)="setSnapSort('dosen_jabatan_lainnya')">Lain <span class="sum-si">{{snapSortIcon('dosen_jabatan_lainnya')}}</span></th>
                    <th class="text-center th-sort grp-pend" (click)="setSnapSort('dosen_pend_s3')">S3 <span class="sum-si">{{snapSortIcon('dosen_pend_s3')}}</span></th>
                    <th class="text-center th-sort grp-pend" (click)="setSnapSort('dosen_pend_s2')">S2 <span class="sum-si">{{snapSortIcon('dosen_pend_s2')}}</span></th>
                    <th class="text-center th-sort grp-pend" (click)="setSnapSort('dosen_pend_s1')">S1 <span class="sum-si">{{snapSortIcon('dosen_pend_s1')}}</span></th>
                    <th class="text-center th-sort grp-pend" (click)="setSnapSort('dosen_pend_profesi')">Profesi <span class="sum-si">{{snapSortIcon('dosen_pend_profesi')}}</span></th>
                    <th class="text-center th-sort grp-pend" (click)="setSnapSort('dosen_pend_lainnya')">Lain <span class="sum-si">{{snapSortIcon('dosen_pend_lainnya')}}</span></th>
                    <th class="text-center th-sort grp-status" (click)="setSnapSort('dosen_aktif')">Aktif <span class="sum-si">{{snapSortIcon('dosen_aktif')}}</span></th>
                    <th class="text-center th-sort grp-status" (click)="setSnapSort('dosen_tugas_belajar')">TB <span class="sum-si">{{snapSortIcon('dosen_tugas_belajar')}}</span></th>
                    <th class="text-center th-sort grp-status" (click)="setSnapSort('dosen_ijin_belajar')">IB <span class="sum-si">{{snapSortIcon('dosen_ijin_belajar')}}</span></th>
                    <th class="text-center th-sort grp-status" (click)="setSnapSort('dosen_cuti')">Cuti <span class="sum-si">{{snapSortIcon('dosen_cuti')}}</span></th>
                    <th class="text-center th-sort grp-status" (click)="setSnapSort('dosen_status_lainnya')">Lain <span class="sum-si">{{snapSortIcon('dosen_status_lainnya')}}</span></th>
                    <th class="text-center th-sort grp-ikatan" (click)="setSnapSort('dosen_tetap')">Tetap <span class="sum-si">{{snapSortIcon('dosen_tetap')}}</span></th>
                    <th class="text-center th-sort grp-ikatan" (click)="setSnapSort('dosen_tidak_tetap')">Tdk Tetap <span class="sum-si">{{snapSortIcon('dosen_tidak_tetap')}}</span></th>
                    <th class="text-center th-sort grp-ikatan" (click)="setSnapSort('dosen_dtpk')">DTPK <span class="sum-si">{{snapSortIcon('dosen_dtpk')}}</span></th>
                    <th class="text-center th-sort grp-ikatan" (click)="setSnapSort('dosen_ikatan_lainnya')">Lain <span class="sum-si">{{snapSortIcon('dosen_ikatan_lainnya')}}</span></th>
                    <th *ngFor="let s of snapSemLabels; let i=index"
                        class="text-center sem-lbl th-sort grp-mhs"
                        [class.sem-active]="i+1 === snapActiveSemIdx"
                        [title]="s" (click)="setSnapSort('mhs_sem_'+(i+1))">{{ s | slice:0:10 }} <span class="sum-si">{{snapSortIcon('mhs_sem_'+(i+1))}}</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let r of pagedSnap">
                    <td>
                      <div class="snap-pt-nama">{{ r.pt_singkatan || r.pt_nama }}</div>
                      <code class="snap-pt-kode">{{ r.pt_kode }}</code>
                    </td>
                    <td class="text-center">
                      <span class="org-badge" [class.org-badge--m]="r.pt_organisasi==='muhammadiyah'" [class.org-badge--a]="r.pt_organisasi==='aisyiyah'">
                        {{ r.pt_organisasi === 'muhammadiyah' ? 'M' : r.pt_organisasi === 'aisyiyah' ? 'A' : '—' }}
                      </span>
                    </td>
                    <td class="text-center snap-jenis">{{ fmtJenis(r.pt_jenis) }}</td>
                    <td class="text-center">
                      <span class="akr-badge" [class.akr-badge--a]="r.pt_akreditasi==='A'" [class.akr-badge--b]="r.pt_akreditasi==='B'" [class.akr-badge--c]="r.pt_akreditasi==='C'">
                        {{ r.pt_akreditasi || '—' }}
                      </span>
                    </td>
                    <td class="text-center">
                      <span class="status-dot" [class.status-dot--on]="r.pt_aktif" [class.status-dot--off]="!r.pt_aktif">
                        {{ r.pt_aktif ? 'Aktif' : 'Non-aktif' }}
                      </span>
                    </td>
                    <td class="text-center grp-prodi"><strong>{{ r.total_prodi }}</strong></td>
                    <td class="text-center grp-prodi">{{ r.prodi_aktif || '—' }}</td>
                    <td class="text-center grp-prodi">{{ r.prodi_non_aktif || '—' }}</td>
                    <td class="text-center grp-prodi">{{ r.prodi_s1 || '—' }}</td>
                    <td class="text-center grp-prodi">{{ r.prodi_s2 || '—' }}</td>
                    <td class="text-center grp-prodi">{{ r.prodi_s3 || '—' }}</td>
                    <td class="text-center grp-prodi">{{ r.prodi_d3 || '—' }}</td>
                    <td class="text-center grp-prodi">{{ r.prodi_d4 || '—' }}</td>
                    <td class="text-center grp-prodi">{{ r.prodi_profesi || '—' }}</td>
                    <td class="text-center grp-prodi">{{ r.prodi_sp1 || '—' }}</td>
                    <td class="text-center grp-prodi">{{ r.prodi_jenjang_lainnya || '—' }}</td>
                    <td class="text-center grp-dosen"><strong>{{ r.total_dosen }}</strong></td>
                    <td class="text-center grp-dosen">{{ r.dosen_with_detail }}</td>
                    <td class="text-center grp-dosen">{{ r.dosen_no_detail || '—' }}</td>
                    <td class="text-center grp-gender">{{ r.dosen_pria }}</td>
                    <td class="text-center grp-gender">{{ r.dosen_wanita }}</td>
                    <td class="text-center grp-gender">{{ r.dosen_gender_no_info || '—' }}</td>
                    <td class="text-center grp-jabatan">{{ r.dosen_profesor || '—' }}</td>
                    <td class="text-center grp-jabatan">{{ r.dosen_lektor_kepala || '—' }}</td>
                    <td class="text-center grp-jabatan">{{ r.dosen_lektor || '—' }}</td>
                    <td class="text-center grp-jabatan">{{ r.dosen_asisten_ahli || '—' }}</td>
                    <td class="text-center grp-jabatan">{{ r.dosen_jabatan_lainnya || '—' }}</td>
                    <td class="text-center grp-pend">{{ r.dosen_pend_s3 || '—' }}</td>
                    <td class="text-center grp-pend">{{ r.dosen_pend_s2 || '—' }}</td>
                    <td class="text-center grp-pend">{{ r.dosen_pend_s1 || '—' }}</td>
                    <td class="text-center grp-pend">{{ r.dosen_pend_profesi || '—' }}</td>
                    <td class="text-center grp-pend">{{ r.dosen_pend_lainnya || '—' }}</td>
                    <td class="text-center grp-status">{{ r.dosen_aktif || '—' }}</td>
                    <td class="text-center grp-status">{{ r.dosen_tugas_belajar || '—' }}</td>
                    <td class="text-center grp-status">{{ r.dosen_ijin_belajar || '—' }}</td>
                    <td class="text-center grp-status">{{ r.dosen_cuti || '—' }}</td>
                    <td class="text-center grp-status">{{ r.dosen_status_lainnya || '—' }}</td>
                    <td class="text-center grp-ikatan">{{ r.dosen_tetap || '—' }}</td>
                    <td class="text-center grp-ikatan">{{ r.dosen_tidak_tetap || '—' }}</td>
                    <td class="text-center grp-ikatan">{{ r.dosen_dtpk || '—' }}</td>
                    <td class="text-center grp-ikatan">{{ r.dosen_ikatan_lainnya || '—' }}</td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===1"><strong *ngIf="snapActiveSemIdx===1">{{ r.mhs_sem_1 != null ? (r.mhs_sem_1 | number) : '—' }}</strong><ng-container *ngIf="snapActiveSemIdx!==1">{{ r.mhs_sem_1 != null ? (r.mhs_sem_1 | number) : '—' }}</ng-container></td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===2"><strong *ngIf="snapActiveSemIdx===2">{{ r.mhs_sem_2 != null ? (r.mhs_sem_2 | number) : '—' }}</strong><ng-container *ngIf="snapActiveSemIdx!==2">{{ r.mhs_sem_2 != null ? (r.mhs_sem_2 | number) : '—' }}</ng-container></td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===3"><strong *ngIf="snapActiveSemIdx===3">{{ r.mhs_sem_3 != null ? (r.mhs_sem_3 | number) : '—' }}</strong><ng-container *ngIf="snapActiveSemIdx!==3">{{ r.mhs_sem_3 != null ? (r.mhs_sem_3 | number) : '—' }}</ng-container></td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===4"><strong *ngIf="snapActiveSemIdx===4">{{ r.mhs_sem_4 != null ? (r.mhs_sem_4 | number) : '—' }}</strong><ng-container *ngIf="snapActiveSemIdx!==4">{{ r.mhs_sem_4 != null ? (r.mhs_sem_4 | number) : '—' }}</ng-container></td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===5"><strong *ngIf="snapActiveSemIdx===5">{{ r.mhs_sem_5 != null ? (r.mhs_sem_5 | number) : '—' }}</strong><ng-container *ngIf="snapActiveSemIdx!==5">{{ r.mhs_sem_5 != null ? (r.mhs_sem_5 | number) : '—' }}</ng-container></td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===6"><strong *ngIf="snapActiveSemIdx===6">{{ r.mhs_sem_6 != null ? (r.mhs_sem_6 | number) : '—' }}</strong><ng-container *ngIf="snapActiveSemIdx!==6">{{ r.mhs_sem_6 != null ? (r.mhs_sem_6 | number) : '—' }}</ng-container></td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===7"><strong *ngIf="snapActiveSemIdx===7">{{ r.mhs_sem_7 != null ? (r.mhs_sem_7 | number) : '—' }}</strong><ng-container *ngIf="snapActiveSemIdx!==7">{{ r.mhs_sem_7 != null ? (r.mhs_sem_7 | number) : '—' }}</ng-container></td>
                  </tr>
                  <tr *ngIf="snapLoading"><td colspan="48" class="sum-state-cell">Memuat laporan...</td></tr>
                  <tr *ngIf="!snapLoading && filteredSnap.length === 0 && activeSnap"><td colspan="48" class="sum-state-cell">Tidak ada data</td></tr>
                </tbody>
                <tfoot *ngIf="filteredSnap.length > 0">
                  <tr>
                    <td class="foot-lbl" colspan="5">Total ({{ filteredSnap.length }} PT)</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_aktif | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_non_aktif | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_s1 | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_s2 | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_s3 | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_d3 | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_d4 | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_profesi | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_sp1 | number }}</td>
                    <td class="text-center grp-prodi">{{ snapTotals.prodi_lainnya | number }}</td>
                    <td class="text-center grp-dosen">{{ snapTotals.dosen | number }}</td>
                    <td class="text-center grp-dosen">{{ snapTotals.with_detail | number }}</td>
                    <td class="text-center grp-dosen">{{ snapTotals.no_detail | number }}</td>
                    <td class="text-center grp-gender">{{ snapTotals.pria | number }}</td>
                    <td class="text-center grp-gender">{{ snapTotals.wanita | number }}</td>
                    <td class="text-center grp-gender">{{ snapTotals.gender_no_info | number }}</td>
                    <td class="text-center grp-jabatan">{{ snapTotals.profesor | number }}</td>
                    <td class="text-center grp-jabatan">{{ snapTotals.lektor_kepala | number }}</td>
                    <td class="text-center grp-jabatan">{{ snapTotals.lektor | number }}</td>
                    <td class="text-center grp-jabatan">{{ snapTotals.asisten_ahli | number }}</td>
                    <td class="text-center grp-jabatan">{{ snapTotals.jab_lainnya | number }}</td>
                    <td class="text-center grp-pend">{{ snapTotals.pend_s3 | number }}</td>
                    <td class="text-center grp-pend">{{ snapTotals.pend_s2 | number }}</td>
                    <td class="text-center grp-pend">{{ snapTotals.pend_s1 | number }}</td>
                    <td class="text-center grp-pend">{{ snapTotals.pend_profesi | number }}</td>
                    <td class="text-center grp-pend">{{ snapTotals.pend_lainnya | number }}</td>
                    <td class="text-center grp-status">{{ snapTotals.aktif | number }}</td>
                    <td class="text-center grp-status">{{ snapTotals.tugas_belajar | number }}</td>
                    <td class="text-center grp-status">{{ snapTotals.ijin_belajar | number }}</td>
                    <td class="text-center grp-status">{{ snapTotals.cuti | number }}</td>
                    <td class="text-center grp-status">{{ snapTotals.sts_lainnya | number }}</td>
                    <td class="text-center grp-ikatan">{{ snapTotals.tetap | number }}</td>
                    <td class="text-center grp-ikatan">{{ snapTotals.tidak_tetap | number }}</td>
                    <td class="text-center grp-ikatan">{{ snapTotals.dtpk | number }}</td>
                    <td class="text-center grp-ikatan">{{ snapTotals.ik_lainnya | number }}</td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===1">{{ snapTotals.mhs_sem_1 | number }}</td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===2">{{ snapTotals.mhs_sem_2 | number }}</td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===3">{{ snapTotals.mhs_sem_3 | number }}</td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===4">{{ snapTotals.mhs_sem_4 | number }}</td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===5">{{ snapTotals.mhs_sem_5 | number }}</td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===6">{{ snapTotals.mhs_sem_6 | number }}</td>
                    <td class="text-center grp-mhs" [class.sem-active-cell]="snapActiveSemIdx===7">{{ snapTotals.mhs_sem_7 | number }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <!-- Navigasi bawah -->
            <div class="snap-list-nav snap-list-nav--bottom" style="margin-top:.5rem">
              <button (click)="snapResPage=snapResPage-1" [disabled]="snapResPage<=1">‹ Sebelumnya</button>
              <span>Halaman {{ snapResPage }} dari {{ snapResTotalPages }} ({{ filteredSnap.length }} PT)</span>
              <button (click)="snapResPage=snapResPage+1" [disabled]="snapResPage>=snapResTotalPages">Berikutnya ›</button>
            </div>
            <!-- Catatan di bawah tabel -->
            <div class="snap-footnotes">
              <div class="snap-footnote">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style="flex-shrink:0;margin-top:1px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                <span><strong>Kolom "Blm Detail" (Dosen):</strong> Dihitung dari total dosen tetap menurut data agregat PDDikti dikurangi jumlah dosen yang sudah terdata detail jabatan fungsionalnya (hasil scraping PDDikti).</span>
              </div>
              <div class="snap-footnote" *ngIf="activeSnap">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style="flex-shrink:0;margin-top:1px"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
                <span><strong>Cakupan PT:</strong> Snapshot mencakup <strong>{{ activeSnap.total_pt + activeSnap.total_pt_non_aktif }}</strong> PT — <strong>{{ activeSnap.total_pt }}</strong> PT aktif dan <strong>{{ activeSnap.total_pt_non_aktif }}</strong> PT tidak aktif. Tabel defaultnya hanya menampilkan PT aktif; centang "Tampilkan PT non-aktif" untuk melihat semua data.</span>
              </div>
              <div class="snap-footnote snap-footnote--src">
                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style="flex-shrink:0;margin-top:1px"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z"/></svg>
                <span><strong>Sumber data:</strong> <a href="https://pddikti.kemdiktisaintek.go.id/" target="_blank" rel="noopener" class="snap-src-link">pddikti.kemdiktisaintek.go.id</a> — data diambil secara berkala melalui proses scraping otomatis.</span>
              </div>
            </div>
          </div><!-- /snap-result -->
        </div><!-- /gen-body -->
      </div><!-- /accordion generate -->

      <!-- ══════════════════════════════════════════════
           ACCORDION: DOSEN PROFESOR
           ══════════════════════════════════════════════ -->
      <div class="sum-accordion sum-accordion--prof">
        <button class="sum-toggle" (click)="profOpen = !profOpen; profOpen && !profLoaded && loadProf()">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;flex-shrink:0">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 4l5 2.18V11c0 3.5-2.33 6.79-5 7.93C9.33 17.79 7 14.5 7 11V7.18L12 5z"/>
          </svg>
          Dosen Profesor
          <span class="sum-count sum-count--prof" *ngIf="profTotal > 0">{{ profTotal | number }} dosen</span>
          <span class="sum-chevron" [class.rotated]="profOpen">▾</span>
        </button>

        <div class="sum-body" *ngIf="profOpen">
          <div class="gen-header" style="padding-top:.9rem;padding-bottom:.75rem">
            <div>
              <div class="gen-title" style="color:#5b21b6">List Dosen Jabatan Profesor</div>
              <div class="gen-desc">Dosen dengan jabatan fungsional Profesor beserta program studi dan perguruan tinggi tempat bertugas.</div>
            </div>
            <button class="gen-btn gen-btn--prof" (click)="loadProf()" [disabled]="profLoading">
              <svg *ngIf="!profLoading" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <svg *ngIf="profLoading" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="animation:spin .8s linear infinite">
                <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
              </svg>
              {{ profLoading ? 'Memuat...' : 'Refresh' }}
            </button>
          </div>

          <div *ngIf="profLoaded">
            <!-- Search & filter -->
            <div class="dosen-filter-row">
              <input type="text" [(ngModel)]="profFilter" placeholder="Nama dosen..."
                     class="snap-search-input snap-search-input--prof dosen-filter-input"
                     (ngModelChange)="profPage=1; loadProf()">
              <input type="text" [(ngModel)]="profFilterProdi" placeholder="Program Studi..."
                     class="snap-search-input snap-search-input--prof dosen-filter-input"
                     (ngModelChange)="profPage=1; loadProf()">
              <input type="text" [(ngModel)]="profFilterPT" placeholder="Perguruan Tinggi..."
                     class="snap-search-input snap-search-input--prof dosen-filter-input"
                     (ngModelChange)="profPage=1; loadProf()">
              <button class="dosen-filter-reset" *ngIf="profFilter||profFilterPT||profFilterProdi"
                      (click)="profFilter=''; profFilterPT=''; profFilterProdi=''; profPage=1; loadProf()">✕ Reset</button>
              <span class="snap-search-count">{{ profTotal | number }} dosen ditemukan</span>
            </div>

            <!-- Navigasi atas -->
            <div class="snap-res-nav">
              <span class="snap-res-info">Halaman {{ profPage }} dari {{ profTotalPages }}</span>
              <div class="snap-list-nav snap-list-nav--prof">
                <button (click)="profPage=profPage-1; loadProf()" [disabled]="profPage<=1">‹</button>
                <span>{{ profPage }} / {{ profTotalPages }}</span>
                <button (click)="profPage=profPage+1; loadProf()" [disabled]="profPage>=profTotalPages">›</button>
              </div>
              <div class="snap-result-actions">
                <button class="sum-exp sum-exp--csv"  (click)="exportProf('csv')">CSV</button>
                <button class="sum-exp sum-exp--xlsx" (click)="exportProf('xlsx')">XLSX</button>
              </div>
            </div>

            <!-- Tabel -->
            <div class="snap-table-wrap">
              <table class="snap-table prof-table">
                <thead>
                  <tr>
                    <th class="text-center" style="width:36px">#</th>
                    <th class="th-sort" (click)="setProfSort('nama')">Nama <span class="sum-si">{{profSortIcon('nama')}}</span></th>
                    <th class="text-center">NIDN</th>
                    <th class="th-sort" (click)="setProfSort('pendidikan_tertinggi')">Pendidikan <span class="sum-si">{{profSortIcon('pendidikan_tertinggi')}}</span></th>
                    <th class="th-sort" (click)="setProfSort('status')">Status <span class="sum-si">{{profSortIcon('status')}}</span></th>
                    <th class="th-sort" (click)="setProfSort('program_studi_nama')">Program Studi <span class="sum-si">{{profSortIcon('program_studi_nama')}}</span></th>
                    <th class="th-sort" (click)="setProfSort('perguruan_tinggi__nama')">Perguruan Tinggi <span class="sum-si">{{profSortIcon('perguruan_tinggi__nama')}}</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="profLoading">
                    <td colspan="7" class="sum-state-cell">Memuat data...</td>
                  </tr>
                  <tr *ngIf="!profLoading && profRows.length === 0">
                    <td colspan="7" class="sum-state-cell">Tidak ada data</td>
                  </tr>
                  <tr *ngFor="let r of profRows; let i = index" class="prof-row">
                    <td class="text-center" style="color:#6d28d9;font-size:.78rem">{{ (profPage-1)*PROF_PAGE_SIZE + i + 1 }}</td>
                    <td><strong>{{ r.nama }}</strong></td>
                    <td class="text-center"><code>{{ r.nidn || r.nuptk || '—' }}</code></td>
                    <td><span class="prof-pend-badge">{{ r.pendidikan_tertinggi ? r.pendidikan_tertinggi.toUpperCase() : '—' }}</span></td>
                    <td>
                      <span class="prof-status-badge" [class.prof-status--aktif]="r.status==='Aktif'" [class.prof-status--tb]="r.status==='TUGAS BELAJAR'">
                        {{ r.status || '—' }}
                      </span>
                    </td>
                    <td>{{ r.program_studi_nama || '—' }}</td>
                    <td><span class="prof-pt-singkatan">{{ r.pt_singkatan }}</span> {{ r.pt_nama }}</td>
                  </tr>
                </tbody>
                <tfoot *ngIf="profRows.length > 0">
                  <tr>
                    <td colspan="7" style="text-align:right;font-size:.76rem;color:#5b21b6;padding:.5rem .75rem">
                      Total <strong>{{ profTotal | number }}</strong> Profesor dari seluruh PTMA
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Navigasi bawah -->
            <div class="snap-res-nav" style="margin-top:.5rem">
              <span class="snap-res-info">Halaman {{ profPage }} dari {{ profTotalPages }}</span>
              <div class="snap-list-nav snap-list-nav--prof">
                <button (click)="profPage=profPage-1; loadProf()" [disabled]="profPage<=1">‹ Sebelumnya</button>
                <button (click)="profPage=profPage+1; loadProf()" [disabled]="profPage>=profTotalPages">Berikutnya ›</button>
              </div>
            </div>
          </div>

          <div *ngIf="!profLoaded && !profLoading" class="prof-empty-hint">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
            <p>Klik <strong>Refresh</strong> untuk memuat daftar dosen Profesor.</p>
          </div>
        </div>
      </div><!-- /accordion profesor -->

      <!-- ══════════════════════════════════════════════
           ACCORDION: DOSEN S3
           ══════════════════════════════════════════════ -->
      <div class="sum-accordion sum-accordion--s3">
        <button class="sum-toggle" (click)="s3Open = !s3Open; s3Open && !s3Loaded && loadS3()">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;flex-shrink:0">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 12.5L3.5 10.5 12 6l8.5 4.5L12 15.5z"/>
          </svg>
          Dosen Pendidikan S3
          <span class="sum-count sum-count--s3" *ngIf="s3Total > 0">{{ s3Total | number }} dosen</span>
          <span class="sum-chevron" [class.rotated]="s3Open">▾</span>
        </button>

        <div class="sum-body" *ngIf="s3Open">
          <div class="gen-header" style="padding-top:.9rem;padding-bottom:.75rem">
            <div>
              <div class="gen-title" style="color:#92400e">List Dosen Bergelar S3</div>
              <div class="gen-desc">Dosen dengan pendidikan tertinggi S3 (Doktor) beserta program studi dan perguruan tinggi tempat bertugas.</div>
            </div>
            <button class="gen-btn gen-btn--s3" (click)="loadS3()" [disabled]="s3Loading">
              <svg *ngIf="!s3Loading" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <svg *ngIf="s3Loading" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="animation:spin .8s linear infinite">
                <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
              </svg>
              {{ s3Loading ? 'Memuat...' : 'Refresh' }}
            </button>
          </div>

          <div *ngIf="s3Loaded">
            <!-- Search & filter -->
            <div class="dosen-filter-row">
              <input type="text" [(ngModel)]="s3Filter" placeholder="Nama dosen..."
                     class="snap-search-input dosen-filter-input"
                     (ngModelChange)="s3Page=1; loadS3()">
              <input type="text" [(ngModel)]="s3FilterProdi" placeholder="Program Studi..."
                     class="snap-search-input dosen-filter-input"
                     (ngModelChange)="s3Page=1; loadS3()">
              <input type="text" [(ngModel)]="s3FilterPT" placeholder="Perguruan Tinggi..."
                     class="snap-search-input dosen-filter-input"
                     (ngModelChange)="s3Page=1; loadS3()">
              <button class="dosen-filter-reset" *ngIf="s3Filter||s3FilterPT||s3FilterProdi"
                      (click)="s3Filter=''; s3FilterPT=''; s3FilterProdi=''; s3Page=1; loadS3()">✕ Reset</button>
              <span class="snap-search-count">{{ s3Total | number }} dosen ditemukan</span>
            </div>

            <!-- Navigasi atas -->
            <div class="snap-res-nav">
              <span class="snap-res-info">Halaman {{ s3Page }} dari {{ s3TotalPages }}</span>
              <div class="snap-list-nav">
                <button (click)="s3Page=s3Page-1; loadS3()" [disabled]="s3Page<=1">‹</button>
                <span>{{ s3Page }} / {{ s3TotalPages }}</span>
                <button (click)="s3Page=s3Page+1; loadS3()" [disabled]="s3Page>=s3TotalPages">›</button>
              </div>
              <div class="snap-result-actions">
                <button class="sum-exp sum-exp--csv"  (click)="exportS3('csv')">CSV</button>
                <button class="sum-exp sum-exp--xlsx" (click)="exportS3('xlsx')">XLSX</button>
              </div>
            </div>

            <!-- Tabel -->
            <div class="snap-table-wrap">
              <table class="snap-table s3-table">
                <thead>
                  <tr>
                    <th class="text-center" style="width:36px">#</th>
                    <th class="th-sort" (click)="setS3Sort('nama')">Nama <span class="sum-si">{{s3SortIcon('nama')}}</span></th>
                    <th class="text-center">NIDN</th>
                    <th class="th-sort" (click)="setS3Sort('jabatan_fungsional')">Jabatan <span class="sum-si">{{s3SortIcon('jabatan_fungsional')}}</span></th>
                    <th class="th-sort" (click)="setS3Sort('status')">Status <span class="sum-si">{{s3SortIcon('status')}}</span></th>
                    <th class="th-sort" (click)="setS3Sort('program_studi_nama')">Program Studi <span class="sum-si">{{s3SortIcon('program_studi_nama')}}</span></th>
                    <th class="th-sort" (click)="setS3Sort('perguruan_tinggi__nama')">Perguruan Tinggi <span class="sum-si">{{s3SortIcon('perguruan_tinggi__nama')}}</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="s3Loading">
                    <td colspan="7" class="sum-state-cell">Memuat data...</td>
                  </tr>
                  <tr *ngIf="!s3Loading && s3Rows.length === 0">
                    <td colspan="7" class="sum-state-cell">Tidak ada data</td>
                  </tr>
                  <tr *ngFor="let r of s3Rows; let i = index" class="s3-row">
                    <td class="text-center" style="color:#a16207;font-size:.78rem">{{ (s3Page-1)*S3_PAGE_SIZE + i + 1 }}</td>
                    <td><strong>{{ r.nama }}</strong></td>
                    <td class="text-center"><code>{{ r.nidn || r.nuptk || '—' }}</code></td>
                    <td>{{ r.jabatan_fungsional || '—' }}</td>
                    <td>
                      <span class="s3-status-badge" [class.s3-status--aktif]="r.status==='Aktif'" [class.s3-status--tb]="r.status==='TUGAS BELAJAR'">
                        {{ r.status || '—' }}
                      </span>
                    </td>
                    <td>{{ r.program_studi_nama || '—' }}</td>
                    <td><span class="s3-pt-singkatan">{{ r.pt_singkatan }}</span> {{ r.pt_nama }}</td>
                  </tr>
                </tbody>
                <tfoot *ngIf="s3Rows.length > 0">
                  <tr>
                    <td colspan="7" style="text-align:right;font-size:.76rem;color:#92400e;padding:.5rem .75rem">
                      Total <strong>{{ s3Total | number }}</strong> dosen S3 dari seluruh PTMA
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Navigasi bawah -->
            <div class="snap-res-nav" style="margin-top:.5rem">
              <span class="snap-res-info">Halaman {{ s3Page }} dari {{ s3TotalPages }}</span>
              <div class="snap-list-nav">
                <button (click)="s3Page=s3Page-1; loadS3()" [disabled]="s3Page<=1">‹ Sebelumnya</button>
                <button (click)="s3Page=s3Page+1; loadS3()" [disabled]="s3Page>=s3TotalPages">Berikutnya ›</button>
              </div>
            </div>
          </div>

          <div *ngIf="!s3Loaded && !s3Loading" class="s3-empty-hint">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
            <p>Klik <strong>Refresh</strong> untuk memuat daftar dosen S3.</p>
          </div>
        </div>
      </div><!-- /accordion s3 -->

      <!-- ══════════════════════════════════════════════
           ACCORDION: RIWAYAT PENDIDIKAN DOSEN
           ══════════════════════════════════════════════ -->
      <div class="sum-accordion sum-accordion--rpd">
        <button class="sum-toggle" (click)="rpdOpen = !rpdOpen; rpdOpen && !rpdLoaded && loadRpd()">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;flex-shrink:0">
            <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
          </svg>
          Riwayat Pendidikan Dosen
          <span class="sum-count sum-count--rpd" *ngIf="rpdTotal > 0">{{ rpdTotal | number }} record</span>
          <span class="sum-chevron" [class.rotated]="rpdOpen">▾</span>
        </button>

        <div class="sum-body" *ngIf="rpdOpen">
          <div class="gen-header" style="padding-top:.9rem;padding-bottom:.75rem">
            <div>
              <div class="gen-title" style="color:#0f5132">Riwayat Pendidikan Dosen PTMA</div>
              <div class="gen-desc">Data riwayat pendidikan dosen dari S1 hingga S3 — perguruan tinggi asal, gelar, jenjang, dan tahun lulus.</div>
            </div>
            <button class="gen-btn gen-btn--rpd" (click)="loadRpd()" [disabled]="rpdLoading">
              <svg *ngIf="!rpdLoading" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <svg *ngIf="rpdLoading" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" style="animation:spin .8s linear infinite">
                <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/>
              </svg>
              {{ rpdLoading ? 'Memuat...' : 'Refresh' }}
            </button>
          </div>

          <div *ngIf="rpdLoaded">
            <!-- Filter row -->
            <div class="dosen-filter-row">
              <input type="text" [(ngModel)]="rpdFilterNama" placeholder="Nama dosen..."
                     class="snap-search-input snap-search-input--rpd dosen-filter-input"
                     (ngModelChange)="rpdPage=1; loadRpd()">
              <select [(ngModel)]="rpdFilterJenjang" class="snap-search-input snap-search-input--rpd dosen-filter-select"
                      (ngModelChange)="rpdPage=1; loadRpd()">
                <option value="">Semua Jenjang</option>
                <option value="S1">S1</option>
                <option value="S2">S2</option>
                <option value="S3">S3</option>
                <option value="Profesi">Profesi</option>
                <option value="Sp-1">Sp-1</option>
                <option value="Sp-2">Sp-2</option>
                <option value="D4">D4</option>
                <option value="D3">D3</option>
              </select>
              <select [(ngModel)]="rpdFilterLN" class="snap-search-input snap-search-input--rpd dosen-filter-select"
                      (ngModelChange)="rpdPage=1; loadRpd()">
                <option value="">Semua (DN + LN)</option>
                <option value="1">🌏 Luar Negeri saja</option>
                <option value="0">🇮🇩 Dalam Negeri saja</option>
              </select>
              <input type="text" [(ngModel)]="rpdFilterProdi" placeholder="Program Studi (PT dosen)..."
                     class="snap-search-input snap-search-input--rpd dosen-filter-input"
                     (ngModelChange)="rpdPage=1; loadRpd()">
              <input type="text" [(ngModel)]="rpdFilterPTDosen" placeholder="PT tempat bertugas..."
                     class="snap-search-input snap-search-input--rpd dosen-filter-input"
                     (ngModelChange)="rpdPage=1; loadRpd()">
              <input type="text" [(ngModel)]="rpdFilterPTAsal" placeholder="PT asal pendidikan..."
                     class="snap-search-input snap-search-input--rpd dosen-filter-input"
                     (ngModelChange)="rpdPage=1; loadRpd()">
              <button class="dosen-filter-reset"
                      *ngIf="rpdFilterNama||rpdFilterJenjang!=='S3'||rpdFilterLN!=='1'||rpdFilterProdi||rpdFilterPTDosen||rpdFilterPTAsal"
                      (click)="rpdFilterNama='';rpdFilterJenjang='S3';rpdFilterLN='1';rpdFilterProdi='';rpdFilterPTDosen='';rpdFilterPTAsal='';rpdPage=1;loadRpd()">✕ Reset</button>
              <span class="snap-search-count">{{ rpdTotal | number }} record</span>
            </div>

            <!-- Navigasi atas -->
            <div class="snap-res-nav">
              <span class="snap-res-info">Halaman {{ rpdPage }} dari {{ rpdTotalPages }}</span>
              <div class="snap-list-nav snap-list-nav--rpd">
                <button (click)="rpdPage=rpdPage-1; loadRpd()" [disabled]="rpdPage<=1">‹</button>
                <span>{{ rpdPage }} / {{ rpdTotalPages }}</span>
                <button (click)="rpdPage=rpdPage+1; loadRpd()" [disabled]="rpdPage>=rpdTotalPages">›</button>
              </div>
              <div class="snap-result-actions">
                <button class="sum-exp sum-exp--csv"  (click)="exportRpd('csv')">CSV</button>
                <button class="sum-exp sum-exp--xlsx" (click)="exportRpd('xlsx')">XLSX</button>
              </div>
            </div>

            <!-- Tabel -->
            <div class="snap-table-wrap">
              <table class="snap-table rpd-table">
                <thead>
                  <tr>
                    <th class="text-center" style="width:36px">#</th>
                    <th class="th-sort" (click)="setRpdSort('profil_dosen__nama')">Nama Dosen <span class="sum-si">{{rpdSortIcon('profil_dosen__nama')}}</span></th>
                    <th class="text-center">NIDN</th>
                    <th class="th-sort" (click)="setRpdSort('jenjang')">Jenjang <span class="sum-si">{{rpdSortIcon('jenjang')}}</span></th>
                    <th class="th-sort" (click)="setRpdSort('tahun_lulus')">Tahun <span class="sum-si">{{rpdSortIcon('tahun_lulus')}}</span></th>
                    <th>Gelar Akademik</th>
                    <th class="th-sort" (click)="setRpdSort('perguruan_tinggi_asal')">PT Asal Pendidikan <span class="sum-si">{{rpdSortIcon('perguruan_tinggi_asal')}}</span></th>
                    <th class="th-sort" (click)="setRpdSort('profil_dosen__perguruan_tinggi__nama')">PT Tempat Bertugas <span class="sum-si">{{rpdSortIcon('profil_dosen__perguruan_tinggi__nama')}}</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngIf="rpdLoading">
                    <td colspan="8" class="sum-state-cell">Memuat data...</td>
                  </tr>
                  <tr *ngIf="!rpdLoading && rpdRows.length === 0">
                    <td colspan="8" class="sum-state-cell">Tidak ada data</td>
                  </tr>
                  <tr *ngFor="let r of rpdRows; let i = index" class="rpd-row">
                    <td class="text-center" style="color:#0f766e;font-size:.78rem">{{ (rpdPage-1)*RPD_PAGE_SIZE + i + 1 }}</td>
                    <td><strong>{{ r.nama_dosen }}</strong>
                      <div *ngIf="r.jabatan_fungsional" style="font-size:.7rem;color:#64748b">{{ r.jabatan_fungsional }}</div>
                    </td>
                    <td class="text-center"><code>{{ r.nidn || '—' }}</code></td>
                    <td class="text-center"><span class="rpd-jenjang-badge" [class]="'rpd-jenjang--'+r.jenjang?.toLowerCase()">{{ r.jenjang || '—' }}</span></td>
                    <td class="text-center">{{ r.tahun_lulus || '—' }}</td>
                    <td>{{ r.gelar || '—' }}</td>
                    <td>
                      <span *ngIf="r.is_luar_negeri" class="rpd-ln-badge">🌏 LN</span>
                      {{ r.perguruan_tinggi_asal || '—' }}
                    </td>
                    <td><span class="rpd-pt-singkatan">{{ r.pt_singkatan }}</span> {{ r.pt_nama }}</td>
                  </tr>
                </tbody>
                <tfoot *ngIf="rpdRows.length > 0">
                  <tr>
                    <td colspan="8" style="text-align:right;font-size:.76rem;color:#0f5132;padding:.5rem .75rem">
                      Total <strong>{{ rpdTotal | number }}</strong> record riwayat pendidikan
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Navigasi bawah -->
            <div class="snap-res-nav" style="margin-top:.5rem">
              <span class="snap-res-info">Halaman {{ rpdPage }} dari {{ rpdTotalPages }}</span>
              <div class="snap-list-nav snap-list-nav--rpd">
                <button (click)="rpdPage=rpdPage-1; loadRpd()" [disabled]="rpdPage<=1">‹ Sebelumnya</button>
                <button (click)="rpdPage=rpdPage+1; loadRpd()" [disabled]="rpdPage>=rpdTotalPages">Berikutnya ›</button>
              </div>
            </div>
          </div>

          <div *ngIf="!rpdLoaded && !rpdLoading" class="rpd-empty-hint">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/></svg>
            <p>Klik <strong>Refresh</strong> untuk memuat riwayat pendidikan dosen.</p>
          </div>
        </div>
      </div><!-- /accordion riwayat pendidikan -->

      <!-- ══════════════════════════════════════════════
           ACCORDION: DISTRIBUSI PROGRAM STUDI
           ══════════════════════════════════════════════ -->
      <div class="sum-accordion sum-accordion--dist">
        <button class="sum-toggle" (click)="distOpen = !distOpen; distOpen && !distLoaded && loadDist()">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;flex-shrink:0">
            <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/>
          </svg>
          Distribusi Program Studi
          <span class="sum-count" *ngIf="distTotal > 0">{{ distTotal | number }} prodi</span>
          <span class="sum-chevron" [class.rotated]="distOpen">▾</span>
        </button>
        <div class="sum-body" *ngIf="distOpen">
          <!-- Filters -->
          <div class="rpd-filters rpd-filters--inline">
            <select class="pl-f-sm" [(ngModel)]="distFilterJenjang" (change)="distPage=1;loadDist()">
              <option value="">Semua Jenjang</option>
              <option value="S3">S3</option><option value="S2">S2</option><option value="S1">S1</option>
              <option value="D4">D4</option><option value="D3">D3</option><option value="D2">D2</option>
              <option value="D1">D1</option><option value="Profesi">Profesi</option>
            </select>
            <select class="pl-f-sem" [(ngModel)]="distFilterSem" (change)="distPage=1;loadDist()">
              <option value="">Semester (semua)</option>
              <option *ngFor="let s of distSemChoices" [value]="s.tahun_akademik + '|' + s.semester">
                {{ s.tahun_akademik }} {{ s.semester | titlecase }}
              </option>
            </select>
            <button class="rpd-reset" *ngIf="distFilterJenjang || distFilterSem"
                    (click)="distFilterJenjang='';distFilterSem='';distPage=1;loadDist()">✕ Reset</button>
          </div>

          <div *ngIf="distLoading" class="rpd-loading-bar"><div></div></div>

          <ng-container *ngIf="distRows.length > 0 && !distLoading">
            <!-- Nav bar atas -->
            <div class="tbl-nav-bar">
              <div class="tbl-nav-bar__page">
                <button class="tbl-pg-btn" (click)="distPage=1;$event.stopPropagation()" [disabled]="distPage<=1">«</button>
                <button class="tbl-pg-btn" (click)="distPage=distPage-1;$event.stopPropagation()" [disabled]="distPage<=1">‹</button>
                <span class="tbl-pg-info">Hal. <strong>{{ distPage }}</strong> / {{ distTotalPages }} &nbsp;·&nbsp; {{ distTotal | number }} nama prodi</span>
                <button class="tbl-pg-btn" (click)="distPage=distPage+1;$event.stopPropagation()" [disabled]="distPage>=distTotalPages">›</button>
                <button class="tbl-pg-btn" (click)="distPage=distTotalPages;$event.stopPropagation()" [disabled]="distPage>=distTotalPages">»</button>
              </div>
              <div class="tbl-nav-bar__actions">
                <button class="tbl-exp tbl-exp--csv"  (click)="exportDist('csv')">↓ CSV</button>
                <button class="tbl-exp tbl-exp--xlsx" (click)="exportDist('xlsx')">↓ XLSX</button>
              </div>
            </div>

            <!-- Table -->
            <div class="rpd-table-wrap">
              <table class="rpd-table tbl-sortable">
                <thead><tr>
                  <th class="th-no">No.</th>
                  <th class="th-s" (click)="setDistSort('nama')">Nama Program Studi <span class="si">{{ distSortIcon('nama') }}</span></th>
                  <th class="th-s th-r" (click)="setDistSort('jumlah_pt')">Jml PT <span class="si">{{ distSortIcon('jumlah_pt') }}</span></th>
                  <th class="th-s th-r" (click)="setDistSort('total_dosen')">Jml Dosen <span class="si">{{ distSortIcon('total_dosen') }}</span></th>
                  <th class="th-s th-r" (click)="setDistSort('total_mhs')">Mhs Aktif <span class="si">{{ distSortIcon('total_mhs') }}</span></th>
                  <th class="th-r">Rasio Dosen:Mhs</th>
                </tr></thead>
                <tbody>
                  <tr *ngFor="let r of distPagedRows; let i = index">
                    <td class="text-right num small">{{ (distPage - 1) * DIST_PAGE_SIZE + i + 1 }}</td>
                    <td>{{ r.nama }}</td>
                    <td class="text-right num">{{ r.jumlah_pt | number }}</td>
                    <td class="text-right num">{{ r.total_dosen | number }}</td>
                    <td class="text-right num">{{ r.total_mhs != null ? (r.total_mhs | number) : '—' }}</td>
                    <td class="text-right num" [ngClass]="distRasioClass(r)">{{ distRasio(r) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Nav bar bawah -->
            <div class="tbl-nav-bar tbl-nav-bar--bottom">
              <div class="tbl-nav-bar__page">
                <button class="tbl-pg-btn" (click)="distPage=1;$event.stopPropagation()" [disabled]="distPage<=1">«</button>
                <button class="tbl-pg-btn" (click)="distPage=distPage-1;$event.stopPropagation()" [disabled]="distPage<=1">‹</button>
                <span class="tbl-pg-info">Hal. <strong>{{ distPage }}</strong> / {{ distTotalPages }}</span>
                <button class="tbl-pg-btn" (click)="distPage=distPage+1;$event.stopPropagation()" [disabled]="distPage>=distTotalPages">›</button>
                <button class="tbl-pg-btn" (click)="distPage=distTotalPages;$event.stopPropagation()" [disabled]="distPage>=distTotalPages">»</button>
              </div>
            </div>
          </ng-container>

          <div *ngIf="!distLoaded && !distLoading" class="rpd-empty-hint">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
            <p>Klik accordion untuk memuat data distribusi program studi.</p>
          </div>
        </div>
      </div><!-- /accordion distribusi prodi -->

      <!-- ══════════════════════════════════════════════
           ACCORDION: DAFTAR SELURUH PRODI
           ══════════════════════════════════════════════ -->
      <div class="sum-accordion sum-accordion--prodilist">
        <button class="sum-toggle" (click)="prodiListOpen = !prodiListOpen; prodiListOpen && !prodiListLoaded && loadProdiList()">
          <svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;flex-shrink:0">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
          </svg>
          Daftar Seluruh Program Studi
          <span class="sum-count" *ngIf="prodiListTotal > 0">{{ prodiListTotal | number }} prodi</span>
          <span class="sum-chevron" [class.rotated]="prodiListOpen">▾</span>
        </button>
        <div class="sum-body" *ngIf="prodiListOpen">
          <!-- Filters — satu baris horizontal -->
          <div class="rpd-filters rpd-filters--inline">
            <input class="pl-f-nm" type="text" placeholder="Nama prodi..." [(ngModel)]="plFilterNama" (input)="plPage=1;loadProdiList()">
            <input class="pl-f-nm" type="text" placeholder="Nama PT..." [(ngModel)]="plFilterNamaPt" (input)="plPage=1;loadProdiList()">
            <input class="pl-f-sm" type="text" placeholder="Kode PT..." [(ngModel)]="plFilterKodePt" (input)="plPage=1;loadProdiList()">
            <select class="pl-f-sm" [(ngModel)]="plFilterJenjang" (change)="plPage=1;loadProdiList()">
              <option value="">Semua Jenjang</option>
              <option value="S3">S3</option><option value="S2">S2</option><option value="S1">S1</option>
              <option value="D4">D4</option><option value="D3">D3</option><option value="D2">D2</option>
              <option value="D1">D1</option><option value="Profesi">Profesi</option>
            </select>
            <select class="pl-f-sm" [(ngModel)]="plFilterAkreditasi" (change)="plPage=1;loadProdiList()">
              <option value="">Semua Akreditasi</option>
              <option value="unggul">Unggul</option>
              <option value="baik_sekali">Baik Sekali</option>
              <option value="baik">Baik</option>
              <option value="belum">Belum Terakreditasi</option>
            </select>
            <select class="pl-f-sem" [(ngModel)]="plFilterSem" (change)="plPage=1;loadProdiList()">
              <option value="">Semua Semester</option>
              <option *ngFor="let s of plSemChoices" [value]="s.tahun_akademik + '|' + s.semester">
                {{ s.tahun_akademik }} {{ s.semester | titlecase }}
              </option>
            </select>
            <button class="rpd-reset"
                    *ngIf="plFilterNama||plFilterNamaPt||plFilterKodePt||plFilterJenjang||plFilterAkreditasi"
                    (click)="plFilterNama='';plFilterNamaPt='';plFilterKodePt='';plFilterJenjang='';plFilterAkreditasi='';plPage=1;loadProdiList()">
              ✕ Reset</button>
          </div>

          <div *ngIf="prodiListLoading" class="rpd-loading-bar"><div></div></div>

          <ng-container *ngIf="prodiListRows.length > 0 && !prodiListLoading">
            <!-- Nav bar atas -->
            <div class="tbl-nav-bar">
              <div class="tbl-nav-bar__page">
                <button class="tbl-pg-btn" (click)="plPage=1;loadProdiList()" [disabled]="plPage<=1">«</button>
                <button class="tbl-pg-btn" (click)="plPage=plPage-1;loadProdiList()" [disabled]="plPage<=1">‹</button>
                <span class="tbl-pg-info">Hal. <strong>{{ plPage }}</strong> / {{ prodiListTotalPages }} &nbsp;·&nbsp; {{ prodiListTotal | number }} prodi</span>
                <button class="tbl-pg-btn" (click)="plPage=plPage+1;loadProdiList()" [disabled]="plPage>=prodiListTotalPages">›</button>
                <button class="tbl-pg-btn" (click)="plPage=prodiListTotalPages;loadProdiList()" [disabled]="plPage>=prodiListTotalPages">»</button>
              </div>
              <div class="tbl-nav-bar__actions">
                <button class="tbl-exp tbl-exp--csv"  (click)="exportProdiList('csv')">↓ CSV</button>
                <button class="tbl-exp tbl-exp--xlsx" (click)="exportProdiList('xlsx')">↓ XLSX</button>
              </div>
            </div>

            <!-- Table -->
            <div class="rpd-table-wrap">
              <table class="rpd-table tbl-sortable">
                <thead><tr>
                  <th class="th-no">No.</th>
                  <th class="th-s mono-h" (click)="setPlSort('kode_prodi')">Kode Prodi <span class="si">{{ plSortIcon('kode_prodi') }}</span></th>
                  <th class="th-s" (click)="setPlSort('nama')">Program Studi <span class="si">{{ plSortIcon('nama') }}</span></th>
                  <th class="th-s" (click)="setPlSort('jenjang')">Jenjang <span class="si">{{ plSortIcon('jenjang') }}</span></th>
                  <th class="th-s" (click)="setPlSort('akreditasi')">Akreditasi <span class="si">{{ plSortIcon('akreditasi') }}</span></th>
                  <th>No. SK</th>
                  <th class="th-s" (click)="setPlSort('tanggal_kedaluarsa')">Kedaluarsa <span class="si">{{ plSortIcon('tanggal_kedaluarsa') }}</span></th>
                  <th class="th-s th-r" (click)="setPlSort('dosen_tetap')">Dosen <span class="si">{{ plSortIcon('dosen_tetap') }}</span></th>
                  <th class="th-s th-r" (click)="setPlSort('mhs_aktif')">Mhs Aktif <span class="si">{{ plSortIcon('mhs_aktif') }}</span></th>
                  <th class="th-s mono-h" (click)="setPlSort('kode_pt')">Kode PT <span class="si">{{ plSortIcon('kode_pt') }}</span></th>
                  <th class="th-s" (click)="setPlSort('pt_nama')">Perguruan Tinggi <span class="si">{{ plSortIcon('pt_nama') }}</span></th>
                </tr></thead>
                <tbody>
                  <tr *ngFor="let r of prodiListRows; let i = index">
                    <td class="text-right num small">{{ (plPage - 1) * PL_PAGE_SIZE + i + 1 }}</td>
                    <td class="mono">{{ r.kode_prodi }}</td>
                    <td>{{ r.nama }}</td>
                    <td><span class="jenjang-badge">{{ r.jenjang }}</span></td>
                    <td><span class="akr-badge akr-badge--{{ r.akreditasi }}">{{ fmtAkr(r.akreditasi) }}</span></td>
                    <td class="mono small">{{ r.no_sk_akreditasi || '—' }}</td>
                    <td>
                      <span *ngIf="r.tanggal_kedaluarsa_akreditasi"
                            [class]="'exp-dot exp-dot--' + expStatus(r.tanggal_kedaluarsa_akreditasi)">
                        {{ r.tanggal_kedaluarsa_akreditasi | date:'dd MMM yyyy':'':'id' }}
                      </span>
                      <span *ngIf="!r.tanggal_kedaluarsa_akreditasi" class="muted">—</span>
                    </td>
                    <td class="text-right num">{{ r.dosen_tetap | number }}</td>
                    <td class="text-right num">{{ r.mhs_aktif != null ? (r.mhs_aktif | number) : '—' }}</td>
                    <td class="mono">{{ r.kode_pt }}</td>
                    <td>{{ r.pt_singkatan || r.pt_nama }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Nav bar bawah -->
            <div class="tbl-nav-bar tbl-nav-bar--bottom">
              <div class="tbl-nav-bar__page">
                <button class="tbl-pg-btn" (click)="plPage=1;loadProdiList()" [disabled]="plPage<=1">«</button>
                <button class="tbl-pg-btn" (click)="plPage=plPage-1;loadProdiList()" [disabled]="plPage<=1">‹</button>
                <span class="tbl-pg-info">Hal. <strong>{{ plPage }}</strong> / {{ prodiListTotalPages }}</span>
                <button class="tbl-pg-btn" (click)="plPage=plPage+1;loadProdiList()" [disabled]="plPage>=prodiListTotalPages">›</button>
                <button class="tbl-pg-btn" (click)="plPage=prodiListTotalPages;loadProdiList()" [disabled]="plPage>=prodiListTotalPages">»</button>
              </div>
            </div>
          </ng-container>

          <div *ngIf="!prodiListLoaded && !prodiListLoading" class="rpd-empty-hint">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
            <p>Klik accordion untuk memuat daftar program studi.</p>
          </div>
        </div>
      </div><!-- /accordion daftar prodi -->

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
            <div class="stat-card__main">
              <div class="stat-card__icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
              </div>
              <div class="stat-card__val">{{ statistik.total_pt | number }}</div>
            </div>
            <div class="stat-card__lbl">Total Perguruan Tinggi</div>
            <div class="stat-card__sub">{{ statistik.total_muhammadiyah }} Muhammadiyah · {{ statistik.total_aisyiyah }} Aisyiyah</div>
          </div>
          <div class="stat-card stat-card--light">
            <div class="stat-card__main">
              <div class="stat-card__icon stat-card__icon--dark">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
              </div>
              <div class="stat-card__val stat-card__val--dark">{{ statistik.total_prodi | number }}</div>
            </div>
            <div class="stat-card__lbl stat-card__lbl--dark">Program Studi Aktif</div>
          </div>
          <div class="stat-card stat-card--light">
            <div class="stat-card__main">
              <div class="stat-card__icon stat-card__icon--dark">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              </div>
              <div class="stat-card__val stat-card__val--dark">{{ statistik.total_mahasiswa | number }}</div>
            </div>
            <div class="stat-card__lbl stat-card__lbl--dark">Total Mahasiswa</div>
          </div>
          <div class="stat-card stat-card--light">
            <div class="stat-card__main">
              <div class="stat-card__icon stat-card__icon--dark">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/><circle cx="18" cy="18" r="5" fill="#22c55e"/><path d="M17 20.5l-2-2 .7-.7 1.3 1.3 2.8-2.8.7.7z" fill="white"/></svg>
              </div>
              <div class="stat-card__val stat-card__val--dark">{{ statistik.total_dosen | number }}</div>
            </div>
            <div class="stat-card__lbl stat-card__lbl--dark">Dosen Tetap</div>
            <div class="stat-card__sub stat-card__sub--dark" *ngIf="statistik.tahun_dosen">data {{ statistik.tahun_dosen }}</div>
            <div class="stat-card__detail" *ngIf="statistik.total_dosen_with_detail">
              <span class="detail-chip detail-chip--on">{{ statistik.total_dosen_with_detail | number }} terdata jabatan</span>
              <span class="detail-chip detail-chip--off">{{ (statistik.total_dosen - statistik.total_dosen_with_detail) | number }} belum detail</span>
            </div>
          </div>
        </div>

        <!-- Bar + Pie charts row -->
        <div class="charts-row charts-row--bar">

          <!-- Pie: Sebaran per Wilayah -->
          <div class="chart-card">
            <div class="chart-card__title">Sebaran per Wilayah</div>
            <div class="pie-wrap">
              <svg viewBox="0 0 100 100" class="pie-svg">
                <circle *ngFor="let s of wilayahPieSegments"
                  cx="50" cy="50" r="40" fill="none"
                  [attr.stroke]="s.color"
                  stroke-width="20"
                  [attr.stroke-dasharray]="s.dash + ' ' + s.gap"
                  [attr.stroke-dashoffset]="s.offset"
                  transform="rotate(-90 50 50)">
                  <title>{{ s.label }}: {{ s.total }} PT ({{ s.pct }}%)</title>
                </circle>
              </svg>
              <div class="pie-legend">
                <div class="pie-legend-item" *ngFor="let s of wilayahPieSegments">
                  <span class="pie-dot" [style.background]="s.color"></span>
                  <span class="pie-lbl">{{ s.label }}</span>
                  <span class="pie-val">{{ s.total }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bar: Distribusi Jenis PT -->
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

          <!-- Bar: Status Akreditasi -->
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

    /* ── Accordion shared ── */
    .sum-accordion {
      background: #fff; border-radius: 12px; margin-bottom: 1rem;
      box-shadow: 0 1px 4px rgba(0,0,0,.08); border-left: 4px solid #1d4ed8;
    }
    .sum-accordion--gen { border-left-color: #059669; }
    .sum-accordion--gen .sum-toggle { color: #065f46; }
    .sum-accordion--gen .sum-toggle:hover { background: rgba(5,150,105,.05); }
    .sum-accordion--gen .sum-chevron { color: #059669; }
    .sum-accordion--gen .sum-count { background: #d1fae5; color: #065f46; }
    .sum-accordion--prof { border-left-color: #7c3aed; }
    .sum-accordion--prof .sum-toggle { color: #5b21b6; }
    .sum-accordion--prof .sum-toggle:hover { background: rgba(124,58,237,.05); }
    .sum-accordion--prof .sum-chevron { color: #7c3aed; }
    .sum-count--prof { background: #ede9fe; color: #5b21b6; }
    .gen-btn--prof { background: linear-gradient(135deg,#7c3aed,#5b21b6); box-shadow: 0 2px 8px rgba(124,58,237,.35); }
    .gen-btn--prof:hover:not(:disabled) { filter: brightness(1.1); }
    .snap-search-input--prof { border-color: #c4b5fd; background: #f5f3ff; }
    .snap-search-input--prof:focus { border-color: #7c3aed; }
    .snap-list-nav--prof button { border-color: #c4b5fd; background: #f5f3ff; color: #5b21b6; }
    .snap-list-nav--prof button:hover:not(:disabled) { background: #ede9fe; }
    .prof-table thead th { background: #f5f3ff; color: #5b21b6; border-bottom: 2px solid #ddd6fe; }
    .prof-row:hover td { background: #f5f3ff !important; }
    .prof-pt-singkatan { font-size:.73rem; font-weight:600; color:#5b21b6; background:#ede9fe; border-radius:4px; padding:1px 5px; margin-right:4px; }
    .prof-pend-badge { font-size:.72rem; font-weight:700; padding:2px 7px; border-radius:10px; background:#ede9fe; color:#5b21b6; }
    .prof-status-badge { font-size:.72rem; padding:2px 7px; border-radius:10px; background:#f1f5f9; color:#475569; }
    .prof-status--aktif { background:#d1fae5; color:#065f46; }
    .prof-status--tb { background:#ede9fe; color:#5b21b6; }
    .prof-empty-hint { display:flex; flex-direction:column; align-items:center; gap:.75rem; padding:2.5rem 1rem; color:#7c3aed; opacity:.6; text-align:center; }
    .sum-accordion--s3 { border-left-color: #92400e; }
    .sum-accordion--s3 .sum-toggle { color: #78350f; }
    .sum-accordion--s3 .sum-toggle:hover { background: rgba(146,64,14,.05); }
    .sum-accordion--s3 .sum-chevron { color: #92400e; }
    .sum-count--s3 { background: #fef3c7; color: #92400e; }
    .gen-btn--s3 { background: #92400e; }
    .gen-btn--s3:hover:not(:disabled) { background: #78350f; }
    .s3-table thead th { background: #fef3c7; color: #78350f; border-bottom: 2px solid #fde68a; }
    .s3-row:hover { background: #fffbeb; }
    .s3-pt-singkatan { font-size:.73rem; font-weight:600; color:#92400e; background:#fef3c7; border-radius:4px; padding:1px 5px; margin-right:4px; }
    .s3-status-badge { font-size:.72rem; padding:2px 7px; border-radius:10px; background:#f1f5f9; color:#475569; }
    .s3-status--aktif { background:#d1fae5; color:#065f46; }
    .s3-status--tb { background:#fef3c7; color:#92400e; }
    .s3-empty-hint { display:flex; flex-direction:column; align-items:center; gap:.75rem; padding:2.5rem 1rem; color:#a16207; opacity:.6; text-align:center; }
    .sum-accordion--rpd { border-left-color: #0d9488; }
    .sum-accordion--rpd .sum-toggle { color: #0f5132; }
    .sum-accordion--rpd .sum-toggle:hover { background: rgba(13,148,136,.05); }
    .sum-accordion--rpd .sum-chevron { color: #0d9488; }
    .sum-count--rpd { background: #ccfbf1; color: #0f5132; }
    .sum-accordion--dist{border-left-color:#0284c7}
    .sum-accordion--dist .sum-toggle{color:#0c4a6e}
    .sum-accordion--dist .sum-toggle:hover{background:rgba(2,132,199,.05)}
    .sum-accordion--dist .sum-chevron{color:#0284c7}
    .sum-accordion--prodilist{border-left-color:#7c3aed}
    .sum-accordion--prodilist .sum-toggle{color:#4c1d95}
    .sum-accordion--prodilist .sum-toggle:hover{background:rgba(124,58,237,.05)}
    .sum-accordion--prodilist .sum-chevron{color:#7c3aed}
    .dist-summary{display:flex;flex-wrap:wrap;gap:.5rem;margin:.75rem 0}
    .dist-chip{display:flex;align-items:center;gap:.4rem;padding:.3rem .75rem;background:#eff6ff;border-radius:20px;border:1px solid #bfdbfe}
    .dist-chip__jenjang{font-size:.78rem;font-weight:700;color:#1e40af}
    .dist-chip__count{font-size:.75rem;color:#475569}
    .dist-chip__mhs{font-size:.75rem;color:#0284c7;font-weight:600}
    .akr-badge{display:inline-block;font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:10px}
    .akr-badge--unggul{background:#d1fae5;color:#065f46}
    .akr-badge--baik_sekali{background:#dbeafe;color:#1e40af}
    .akr-badge--baik{background:#e0f2fe;color:#0369a1}
    .akr-badge--belum{background:#f1f5f9;color:#64748b}
    .mono{font-family:monospace;font-size:.8rem}
    .small{font-size:.75rem}
    .jenjang-badge{font-size:.72rem;font-weight:700;padding:2px 7px;border-radius:10px;background:#e2e8f0;color:#334155}
    .exp-dot--red{color:#dc2626;font-weight:600}
    .exp-dot--yellow{color:#d97706;font-weight:600}
    .exp-dot--green{color:#16a34a}
    .rasio--red{background:#fee2e2;color:#991b1b;font-weight:600;border-radius:4px;padding:1px 5px}
    .rasio--orange{background:#ffedd5;color:#9a3412;font-weight:600;border-radius:4px;padding:1px 5px}
    .rasio--yellow{background:#fef9c3;color:#854d0e;font-weight:600;border-radius:4px;padding:1px 5px}
    .rasio--green{background:#dcfce7;color:#166534;font-weight:600;border-radius:4px;padding:1px 5px}
    .gen-btn--rpd { background: linear-gradient(135deg,#0d9488,#0f5132); box-shadow: 0 2px 8px rgba(13,148,136,.35); }
    .gen-btn--rpd:hover:not(:disabled) { filter: brightness(1.1); }
    .snap-search-input--rpd { border-color: #99f6e4; background: #f0fdfa; }
    .snap-search-input--rpd:focus { border-color: #0d9488; }
    .dosen-filter-select { appearance: auto; cursor: pointer; }
    .snap-list-nav--rpd button { border-color: #99f6e4; background: #f0fdfa; color: #0f5132; }
    .snap-list-nav--rpd button:hover:not(:disabled) { background: #ccfbf1; }
    .rpd-table thead th { background: #f0fdfa; color: #0f5132; border-bottom: 2px solid #99f6e4; }
    .rpd-row:hover td { background: #f0fdfa !important; }
    .rpd-pt-singkatan { font-size:.73rem; font-weight:600; color:#0f5132; background:#ccfbf1; border-radius:4px; padding:1px 5px; margin-right:4px; }
    .rpd-jenjang-badge { font-size:.72rem; font-weight:700; padding:2px 8px; border-radius:10px; background:#e2e8f0; color:#334155; }
    .rpd-jenjang--s3 { background:#c7d2fe; color:#3730a3; }
    .rpd-jenjang--s2 { background:#bbf7d0; color:#14532d; }
    .rpd-jenjang--s1 { background:#bfdbfe; color:#1e3a8a; }
    .rpd-jenjang--profesi { background:#fde68a; color:#78350f; }
    .rpd-jenjang--sp-1,.rpd-jenjang--sp-2 { background:#e9d5ff; color:#5b21b6; }
    .rpd-jenjang--d4,.rpd-jenjang--d3 { background:#fed7aa; color:#7c2d12; }
    .rpd-empty-hint{display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:2.5rem 1rem;color:#0d9488;opacity:.6;text-align:center}
    .rpd-filters{display:flex;flex-wrap:wrap;gap:.5rem;padding:.9rem 0 .5rem}
    .rpd-filters--inline{flex-wrap:nowrap;overflow-x:auto;padding-bottom:.35rem}
    .rpd-filters input,.rpd-filters select{padding:.4rem .7rem;border:1px solid #cbd5e1;border-radius:8px;font-size:.83rem;outline:none;background:#f8fafc;min-width:0}
    .rpd-filters input:focus,.rpd-filters select:focus{border-color:#7c3aed}
    .pl-f-nm{flex:2 1 130px;max-width:180px}
    .pl-f-sm{flex:1 1 100px;max-width:130px}
    .pl-f-sem{flex:1 1 140px;max-width:170px}
    @media (max-width: 640px) {
      .rpd-filters--inline { flex-direction:column; overflow-x:visible; }
      .rpd-filters--inline input, .rpd-filters--inline select { max-width:none; width:100%; flex:none; }
      .rpd-filters--inline .rpd-reset { width:100%; text-align:center; }
    }
    .th-no{width:2.5rem;text-align:right;white-space:nowrap}
    .rpd-reset{padding:.4rem .9rem;border:1px solid #fca5a5;background:#fef2f2;color:#dc2626;border-radius:8px;font-size:.8rem;cursor:pointer}
    .rpd-loading-bar{height:3px;background:#e8eaf6;border-radius:2px;overflow:hidden;margin:.5rem 0}
    .rpd-loading-bar>div{height:100%;width:40%;background:#7c3aed;animation:slide 1s ease-in-out infinite alternate}
    .rpd-table-wrap{overflow-x:auto;border-radius:10px}
    .rpd-table{width:100%;border-collapse:collapse;font-size:.81rem}
    .rpd-table th{background:#f0fdfa;color:#0f5132;border-bottom:2px solid #99f6e4;padding:.5rem .7rem;text-align:left;font-weight:600;white-space:nowrap}
    .rpd-table td{padding:.45rem .7rem;border-bottom:1px solid #e8eaf6;vertical-align:middle}
    .rpd-table tr:last-child td{border-bottom:none}
    .rpd-table tr:hover td{background:#f0f9ff}
    .rpd-nav{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin-top:.6rem;font-size:.8rem;color:#475569}
    .rpd-nav button{padding:.3rem .75rem;border:1px solid #cbd5e1;border-radius:7px;background:#f8fafc;color:#334155;cursor:pointer;font-size:.8rem}
    .rpd-nav button:disabled{opacity:.4;cursor:not-allowed}
    .rpd-nav button:hover:not(:disabled){background:#e2e8f0}
    .rpd-export{background:#f0fdf4;color:#166534;border-color:#86efac;margin-left:auto}
    .rpd-export:hover:not(:disabled){background:#dcfce7}
    .tbl-nav-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.4rem;margin:.6rem 0 .3rem;padding:.35rem .1rem}
    .tbl-nav-bar--bottom{margin:.3rem 0 .1rem}
    .tbl-nav-bar__page{display:flex;align-items:center;gap:.3rem}
    .tbl-nav-bar__actions{display:flex;gap:.35rem}
    .tbl-pg-btn{padding:.28rem .6rem;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;color:#334155;cursor:pointer;font-size:.82rem;line-height:1}
    .tbl-pg-btn:disabled{opacity:.35;cursor:not-allowed}
    .tbl-pg-btn:hover:not(:disabled){background:#e2e8f0}
    .tbl-pg-info{font-size:.8rem;color:#475569;padding:0 .25rem}
    .tbl-exp{padding:.28rem .7rem;border-radius:6px;font-size:.75rem;font-weight:600;cursor:pointer;border:1px solid}
    .tbl-exp--csv{background:#f0fdf4;color:#166534;border-color:#86efac}
    .tbl-exp--csv:hover{background:#dcfce7}
    .tbl-exp--xlsx{background:#f0fff4;color:#15803d;border-color:#4ade80}
    .tbl-exp--xlsx:hover{background:#bbf7d0}
    .tbl-sortable th.th-s{cursor:pointer;user-select:none;white-space:nowrap}
    .tbl-sortable th.th-s:hover{background:#e0f2fe}
    .rpd-table th.th-r{text-align:right}
    .si{font-size:.7rem;color:#94a3b8;margin-left:.15rem}
    .num{font-variant-numeric:tabular-nums}
    .muted{color:#94a3b8}
    .mono-h{font-family:monospace;font-size:.8rem}
    .rpd-ln-badge { display:inline-block; font-size:.68rem; font-weight:700; padding:1px 6px; border-radius:8px; background:#dbeafe; color:#1e40af; margin-right:4px; vertical-align:middle; white-space:nowrap; }
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
    .sum-table tfoot td { background: rgba(59,130,246,.1); border-top: 2px solid rgba(59,130,246,.2); font-weight: 700; color: #1e40af; padding: .5rem .75rem; font-size: .82rem; }
    .foot-lbl { color: #1e3a8a; font-style: italic; }

    /* ── Generate Laporan section ── */
    .gen-section { margin-top: 1rem; margin-bottom: 1.25rem; }
    .gen-divider { height: 1px; background: #e8eaf6; margin-bottom: 1rem; }
    .gen-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
    .gen-title { font-size: .95rem; font-weight: 700; color: #1e3a8a; margin-bottom: .25rem; }
    .gen-desc  { font-size: .8rem; color: #64748b; max-width: 560px; line-height: 1.5; }
    .gen-rule  { display:flex; align-items:flex-start; gap:.35rem; margin-top:.45rem; font-size:.76rem; color:#475569; line-height:1.5; max-width:560px; flex-wrap:wrap; }
    .gen-rule-warn { display:block; width:100%; color:#b45309; font-size:.74rem; margin-top:.15rem; }
    .gen-btn {
      display: flex; align-items: center; gap: .5rem;
      padding: .6rem 1.4rem; background: linear-gradient(135deg,#1d4ed8,#1e3a8a);
      color: #fff; border: none; border-radius: 10px; font-size: .88rem; font-weight: 600;
      cursor: pointer; white-space: nowrap; box-shadow: 0 2px 8px rgba(29,78,216,.35);
      transition: filter .15s;
    }
    .gen-btn:hover:not(:disabled) { filter: brightness(1.1); }
    .gen-btn:disabled { opacity: .6; cursor: not-allowed; }

    /* Riwayat snapshot — tabel */
    .snap-list { margin-bottom: .75rem; }
    .snap-rule-note { display:flex; align-items:flex-start; gap:.4rem; padding:.5rem .75rem; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; font-size:.75rem; color:#78350f; line-height:1.5; margin-bottom:.5rem; }
    .snap-list-header { display: flex; align-items: center; gap: .75rem; margin-bottom: .4rem; flex-wrap: wrap; }
    .snap-list-title { font-size: .82rem; font-weight: 700; color: #1e40af; }
    .snap-list-info { font-size: .75rem; color: #94a3b8; }
    .snap-list-nav { display: flex; align-items: center; gap: .4rem; margin-left: auto; font-size: .78rem; color: #475569; }
    .snap-list-nav button { padding: .2rem .65rem; border: 1px solid #93c5fd; border-radius: 6px; background: #eff6ff; color: #1e40af; cursor: pointer; font-size: .8rem; }
    .snap-list-nav button:disabled { opacity: .4; cursor: not-allowed; }
    .snap-list-nav button:hover:not(:disabled) { background: #dbeafe; }
    .snap-list-nav--bottom { justify-content: center; margin-top: .4rem; }
    .snap-list-nav--bottom button { padding: .3rem .9rem; }
    .snap-hist-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 8px; border: 1px solid #e0e7ff; }
    .snap-hist-table { width: 100%; border-collapse: collapse; font-size: .82rem; margin-bottom: 0; min-width: 480px; }
    .snap-hist-table th { background: #f0f4ff; padding: .45rem .75rem; text-align: left; font-weight: 600; color: #1e40af; border-bottom: 2px solid #c7d2fe; white-space: nowrap; font-size: .78rem; }
    .snap-hist-table td { padding: .45rem .75rem; border-bottom: 1px solid #e8eaf6; color: #1e293b; vertical-align: middle; }
    .snap-hist-table tr:last-child td { border-bottom: none; }
    .snap-hist-table tr:hover td { background: #eff6ff; }
    .snap-hist-active td { background: #dbeafe !important; }
    .snap-hist-date { font-weight: 600; white-space: nowrap; }
    .snap-hist-ket { font-size: .78rem; color: #64748b; }
    .snap-del-btn {
      display: flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 6px; border: 1px solid #fca5a5;
      background: #fff0f0; cursor: pointer; color: #dc2626;
      padding: 0; transition: background .12s; flex-shrink: 0; margin: auto;
    }
    .snap-del-btn:hover { background: #fee2e2; }
    .snap-action-cell { display: flex; align-items: center; justify-content: center; gap: 5px; }
    .snap-show-btn {
      padding: 3px 10px; font-size: .75rem; font-weight: 600; border-radius: 6px; cursor: pointer;
      border: 1px solid #a5b4fc; background: #eef2ff; color: #3730a3; white-space: nowrap; transition: background .12s;
    }
    .snap-show-btn:hover { background: #c7d2fe; }
    .snap-show-btn--active { background: #3730a3; color: #fff; border-color: #3730a3; }
    .snap-show-btn--active:hover { background: #312e81; }
    @media (max-width: 600px) {
      .snap-hist-table th, .snap-hist-table td { padding: .35rem .5rem; font-size: .75rem; }
      .snap-hist-ket { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .snap-show-btn { padding: 2px 7px; font-size: .7rem; }
    }

    /* Snapshot result table */
    .snap-result { margin-top: .75rem; position: relative; background: #fff; border: 1px solid #e8eaf6; border-left: 4px solid #1d4ed8; border-radius: 12px; padding: .75rem .9rem 1rem; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .snap-result--loading { pointer-events: none; }
    .snap-result--loading .snap-result-header,
    .snap-result--loading .snap-res-nav,
    .snap-result--loading .snap-search-row,
    .snap-result--loading .snap-table-wrap,
    .snap-result--loading .snap-list-nav { opacity: .35; }
    .snap-loading-bar {
      display: flex; flex-direction: column; gap: .4rem;
      padding: .6rem .75rem; background: #eff6ff; border: 1px solid #bfdbfe;
      border-radius: 8px; margin-bottom: .6rem;
    }
    .snap-loading-track { height: 4px; background: #dbeafe; border-radius: 2px; overflow: hidden; }
    .snap-loading-fill {
      height: 100%; width: 40%; background: #1d4ed8; border-radius: 2px;
      animation: snap-slide 1.2s ease-in-out infinite;
    }
    .snap-loading-text { display: flex; align-items: center; gap: .4rem; font-size: .8rem; font-weight: 600; color: #1e40af; }
    @keyframes snap-slide {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }
    .snap-result-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: .5rem; margin-bottom: .6rem; }
    .snap-result-title { font-size: .88rem; font-weight: 700; color: #1e3a8a; display: flex; align-items: center; gap: .5rem; }
    .snap-result-sub { font-size: .75rem; font-weight: 400; color: #64748b; }
    .snap-result-actions { display: flex; gap: .35rem; }
    .snap-res-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: .4rem; }
    .snap-res-info { font-size: .75rem; color: #64748b; }
    .snap-search-row { display: flex; flex-direction: column; gap: .4rem; margin-bottom: .5rem; }
    .snap-search-input { flex: 1; max-width: 280px; padding: .4rem .75rem; border: 1px solid #93c5fd; border-radius: 8px; font-size: .85rem; background: #eff6ff; outline: none; }
    .snap-search-input--full { max-width: 100%; width: 100%; flex: none; }
    .snap-search-sub { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .snap-search-input:focus { border-color: #1d4ed8; }
    .dosen-filter-row { display:flex; flex-wrap:nowrap; align-items:center; gap:.5rem; margin-bottom:.5rem; }
    .dosen-filter-input { flex:1; min-width:0; max-width:260px; }
    .dosen-filter-reset { padding:.35rem .8rem; border:1px solid #fca5a5; border-radius:8px; background:#fff0f0; color:#dc2626; font-size:.78rem; cursor:pointer; white-space:nowrap; flex-shrink:0; }
    @media (max-width: 640px) {
      .dosen-filter-row { flex-direction:column; align-items:stretch; }
      .dosen-filter-input { max-width:none; width:100%; }
      .dosen-filter-reset { width:100%; text-align:center; }
    }
    .dosen-filter-reset:hover { background:#fee2e2; }
    .snap-search-count { font-size: .78rem; color: #94a3b8; }
    .snap-table-wrap { overflow-x: auto; border-radius: 10px; }
    .snap-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
    .snap-table th { background: #f0f4ff; padding: .4rem .5rem; text-align: left; font-weight: 600; color: #1e40af; border-bottom: 2px solid #c7d2fe; white-space: nowrap; font-size: .72rem; }
    .snap-table th.th-sort { cursor: pointer; user-select: none; }
    .snap-table th.th-sort:hover { background: #e0e7ff; }
    .th-group { background: #e0e7ff; color: #3730a3; border-bottom: 2px solid #a5b4fc; font-size: .7rem; letter-spacing: .02em; }
    .sem-lbl { font-size: .65rem; max-width: 60px; overflow: hidden; text-overflow: ellipsis; }
    .tren-cell { min-width: 80px; }
    .snap-table td { padding: .45rem .65rem; border-bottom: 1px solid #e8eaf6; vertical-align: middle; }
    .snap-table tr:last-child td { border-bottom: none; }
    .snap-table tr:hover td { background: #f0f4ff; }
    .snap-table tfoot td { background: #eef2ff; border-top: 2px solid #c7d2fe; font-weight: 700; color: #1e40af; padding: .5rem .65rem; font-size: .78rem; }
    .snap-pt-nama { font-weight: 600; color: #1e293b; }
    .snap-pt-kode { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: .7rem; color: #64748b; }
    .org-badge { display:inline-block; width:20px; height:20px; line-height:20px; border-radius:50%; font-size:.7rem; font-weight:700; text-align:center; }
    .org-badge--m { background:#dbeafe; color:#1d4ed8; }
    .org-badge--a { background:#fce7f3; color:#be185d; }
    .snap-jenis { font-size:.72rem; color:#475569; white-space:nowrap; }
    .akr-badge { display:inline-block; padding:1px 6px; border-radius:4px; font-size:.72rem; font-weight:700; background:#f1f5f9; color:#475569; }
    .akr-badge--a { background:#dcfce7; color:#15803d; }
    .akr-badge--b { background:#dbeafe; color:#1d4ed8; }
    .akr-badge--c { background:#fef9c3; color:#a16207; }
    .status-dot { display:inline-block; padding:1px 6px; border-radius:4px; font-size:.7rem; font-weight:600; }
    .status-dot--on  { background:#dcfce7; color:#15803d; }
    .status-dot--off { background:#fee2e2; color:#dc2626; }
    .dist-chips { display: flex; flex-wrap: wrap; gap: 3px; }
    .dist-chip { display: inline-flex; align-items: center; gap: 3px; background: #f1f5f9; border-radius: 10px; padding: 1px 6px; font-size: .7rem; }
    .chip-key { color: #475569; }
    .chip-val { font-weight: 700; color: #1e40af; }
    .tren-mini { display: flex; align-items: flex-end; gap: 2px; height: 28px; }
    .tren-dot { display: flex; align-items: flex-end; width: 6px; }
    .tren-bar { width: 6px; background: #3b82f6; border-radius: 2px 2px 0 0; min-height: 2px; }
    .tren-last { font-size: .7rem; font-weight: 600; color: #1e40af; margin-left: 4px; align-self: center; }

    /* Snap toggle & footnotes */
    .snap-toggle-label { display: flex; align-items: center; gap: .35rem; font-size: .78rem; color: #475569; cursor: pointer; user-select: none; white-space: nowrap; }
    .snap-toggle-label input[type=checkbox] { cursor: pointer; accent-color: #1d4ed8; }
    .snap-footnotes { margin-top: .75rem; display: flex; flex-direction: column; gap: .35rem; }
    .snap-footnote { display: flex; align-items: flex-start; gap: .4rem; font-size: .73rem; color: #64748b; line-height: 1.55; padding: .35rem .6rem; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
    .snap-footnote--src { background: #eff6ff; border-color: #bfdbfe; color: #1e40af; }
    .snap-src-link { color: #1d4ed8; font-weight: 600; text-decoration: none; }
    .snap-src-link:hover { text-decoration: underline; }

    /* Group header colors */
    .th-grp-prodi{background:rgba(99,102,241,.15)!important;color:#3730a3!important;border-bottom-color:rgba(99,102,241,.3)!important}
    .th-grp-dosen{background:rgba(16,185,129,.12)!important;color:#065f46!important;border-bottom-color:rgba(16,185,129,.3)!important}
    .th-grp-gender{background:rgba(244,63,94,.12)!important;color:#9f1239!important;border-bottom-color:rgba(244,63,94,.3)!important}
    .th-grp-jabatan{background:rgba(139,92,246,.12)!important;color:#5b21b6!important;border-bottom-color:rgba(139,92,246,.3)!important}
    .th-grp-pend{background:rgba(245,158,11,.12)!important;color:#92400e!important;border-bottom-color:rgba(245,158,11,.3)!important}
    .th-grp-status{background:rgba(6,182,212,.12)!important;color:#155e75!important;border-bottom-color:rgba(6,182,212,.3)!important}
    .th-grp-ikatan{background:rgba(236,72,153,.1)!important;color:#831843!important;border-bottom-color:rgba(236,72,153,.3)!important}
    .th-grp-mhs{background:rgba(251,146,60,.1)!important;color:#7c2d12!important;border-bottom-color:rgba(251,146,60,.3)!important}
    /* Sub-header & body */
    .snap-table th.grp-prodi,.snap-table td.grp-prodi{background-color:rgba(99,102,241,.04)}
    .snap-table th.grp-dosen,.snap-table td.grp-dosen{background-color:rgba(16,185,129,.04)}
    .snap-table th.grp-gender,.snap-table td.grp-gender{background-color:rgba(244,63,94,.04)}
    .snap-table th.grp-jabatan,.snap-table td.grp-jabatan{background-color:rgba(139,92,246,.04)}
    .snap-table th.grp-pend,.snap-table td.grp-pend{background-color:rgba(245,158,11,.04)}
    .snap-table th.grp-status,.snap-table td.grp-status{background-color:rgba(6,182,212,.04)}
    .snap-table th.grp-ikatan,.snap-table td.grp-ikatan{background-color:rgba(236,72,153,.04)}
    .snap-table th.grp-mhs,.snap-table td.grp-mhs{background-color:rgba(251,146,60,.04)}
    .snap-table tr:hover td.grp-prodi,.snap-table tr:hover td.grp-dosen,.snap-table tr:hover td.grp-gender,
    .snap-table tr:hover td.grp-jabatan,.snap-table tr:hover td.grp-pend,.snap-table tr:hover td.grp-status,
    .snap-table tr:hover td.grp-ikatan,.snap-table tr:hover td.grp-mhs{background-color:#f0f4ff}
    /* Tfoot */
    .snap-table tfoot td.grp-prodi{background:rgba(99,102,241,.1)}
    .snap-table tfoot td.grp-dosen{background:rgba(16,185,129,.1)}
    .snap-table tfoot td.grp-gender{background:rgba(244,63,94,.1)}
    .snap-table tfoot td.grp-jabatan{background:rgba(139,92,246,.1)}
    .snap-table tfoot td.grp-pend{background:rgba(245,158,11,.1)}
    .snap-table tfoot td.grp-status{background:rgba(6,182,212,.1)}
    .snap-table tfoot td.grp-ikatan{background:rgba(236,72,153,.1)}
    .snap-table tfoot td.grp-mhs{background:rgba(251,146,60,.1)}
    /* Active semester highlight */
    .snap-table th.sem-active{background:#fef08a!important;color:#713f12!important;border-bottom:2px solid #f59e0b!important;font-weight:700}
    .snap-table td.sem-active-cell{background:#fefce8!important;color:#78350f}
    .snap-table tr:hover td.sem-active-cell{background:#fef9c3!important}
    .snap-table tfoot td.sem-active-cell{background:#fde68a!important;font-weight:700}

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
    .filter-card { background: #fff; border: 1px solid #e8eaf6; border-left: 4px solid #7c3aed; border-radius: 14px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
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
    .stat-card { border-radius: 14px; padding: 20px 22px; box-shadow: 0 1px 4px rgba(0,0,0,.07); display: flex; flex-direction: column; gap: 4px; border-left: 4px solid transparent; }
    .stat-card--blue  { background: #1a237e; border-left-color: #7c83e8; }
    .stat-card--light { background: #fff; border: 1px solid #e8eaf6; border-left: 4px solid #1d4ed8; }
    .stat-card__main  { display: flex; flex-direction: row; align-items: center; gap: 12px; margin-bottom: 2px; }
    .stat-card__icon { width: 42px; height: 42px; flex-shrink: 0; }
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
    .stat-card__detail { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
    .detail-chip { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 10px; font-weight: 600; white-space: nowrap; }
    .detail-chip--on  { background: rgba(34,197,94,.15); color: #15803d; }
    .detail-chip--off { background: rgba(148,163,184,.15); color: #64748b; }

    /* Chart / bar */
    .chart-card { background: #fff; border: 1px solid #e8eaf6; border-left: 4px solid #059669; border-radius: 14px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
    .chart-card__title { font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 16px; }
    .charts-row { display: grid; gap: 16px; margin-bottom: 20px; }
    .charts-row--bar { grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); }

    /* Pie chart */
    .pie-wrap { display: flex; align-items: flex-start; gap: 14px; flex-wrap: wrap; }
    .pie-svg { width: 110px; height: 110px; flex-shrink: 0; }
    .pie-legend { flex: 1; min-width: 120px; display: flex; flex-direction: column; gap: 4px; max-height: 190px; overflow-y: auto; }
    .pie-legend-item { display: flex; align-items: center; gap: 6px; font-size: .75rem; }
    .pie-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .pie-lbl { flex: 1; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pie-val { font-weight: 700; color: #1e40af; }
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


  // Dosen S3 accordion
  s3Open    = false;
  s3Loaded  = false;
  s3Loading = false;
  s3Rows:   any[] = [];
  s3Total   = 0;
  s3Page    = 1;
  s3Filter      = '';
  s3FilterPT    = '';
  s3FilterProdi = '';
  s3SortKey = 'nama';
  s3SortAsc = true;
  readonly S3_PAGE_SIZE = 50;

  get s3TotalPages() { return Math.max(1, Math.ceil(this.s3Total / this.S3_PAGE_SIZE)); }

  loadS3() {
    this.s3Loading = true;
    const params: any = { pendidikan: 's3', page: this.s3Page, page_size: this.S3_PAGE_SIZE };
    if (this.s3Filter.trim())      params.nama       = this.s3Filter.trim();
    if (this.s3FilterPT.trim())    params.pt_nama    = this.s3FilterPT.trim();
    if (this.s3FilterProdi.trim()) params.prodi_nama = this.s3FilterProdi.trim();
    params.ordering = (this.s3SortAsc ? '' : '-') + this.s3SortKey;
    this.api.dosenSearch(params).subscribe({
      next: (d: any) => {
        this.s3Rows    = d.results || [];
        this.s3Total   = d.total   || 0;
        this.s3Loaded  = true;
        this.s3Loading = false;
      },
      error: () => { this.s3Loading = false; }
    });
  }

  setS3Sort(key: string) {
    if (this.s3SortKey === key) this.s3SortAsc = !this.s3SortAsc;
    else { this.s3SortKey = key; this.s3SortAsc = true; }
    this.s3Page = 1;
    this.loadS3();
  }

  s3SortIcon(key: string): string {
    if (this.s3SortKey !== key) return '⇅';
    return this.s3SortAsc ? '↑' : '↓';
  }

  exportS3(fmt: 'csv' | 'xlsx') {
    // Ambil semua data tanpa paginasi untuk export
    const s3ExportParams: any = { pendidikan: 's3', page: 1, page_size: 99999 };
    if (this.s3Filter.trim())      s3ExportParams.nama       = this.s3Filter.trim();
    if (this.s3FilterPT.trim())    s3ExportParams.pt_nama    = this.s3FilterPT.trim();
    if (this.s3FilterProdi.trim()) s3ExportParams.prodi_nama = this.s3FilterProdi.trim();
    this.api.dosenSearch(s3ExportParams).subscribe({
      next: (d: any) => {
        const rows = d.results || [];
        const hdrs = ['No','Nama','NIDN/NUPTK','Jabatan','Status','Program Studi','Perguruan Tinggi'];
        const body = rows.map((r: any, i: number) => [
          i + 1, r.nama, r.nidn || r.nuptk || '',
          r.jabatan_fungsional || '', r.status || '',
          r.program_studi_nama || '', r.pt_nama,
        ]);
        this._doExport(fmt, hdrs, body, 'dosen-s3');
      }
    });
  }

  // Riwayat Pendidikan accordion
  rpdOpen         = false;
  rpdLoaded       = false;
  rpdLoading      = false;
  rpdRows:        any[] = [];
  rpdTotal        = 0;
  rpdPage         = 1;
  rpdFilterNama    = '';
  rpdFilterJenjang = 'S3';
  rpdFilterProdi   = '';
  rpdFilterPTDosen = '';
  rpdFilterPTAsal  = '';
  rpdFilterLN      = '1';  // '' = semua, '1' = luar negeri, '0' = dalam negeri
  rpdSortKey      = 'profil_dosen__nama';
  rpdSortAsc      = true;
  readonly RPD_PAGE_SIZE = 50;

  get rpdTotalPages() { return Math.max(1, Math.ceil(this.rpdTotal / this.RPD_PAGE_SIZE)); }

  loadRpd() {
    this.rpdLoading = true;
    const params: any = { page: this.rpdPage, page_size: this.RPD_PAGE_SIZE };
    if (this.rpdFilterNama.trim())    params.nama_dosen  = this.rpdFilterNama.trim();
    if (this.rpdFilterJenjang.trim()) params.jenjang     = this.rpdFilterJenjang.trim();
    if (this.rpdFilterProdi.trim())   params.prodi_dosen = this.rpdFilterProdi.trim();
    if (this.rpdFilterPTDosen.trim()) params.pt_dosen    = this.rpdFilterPTDosen.trim();
    if (this.rpdFilterPTAsal.trim())  params.pt_asal     = this.rpdFilterPTAsal.trim();
    if (this.rpdFilterLN !== '')      params.luar_negeri = this.rpdFilterLN;
    params.ordering = (this.rpdSortAsc ? '' : '-') + this.rpdSortKey;
    this.api.riwayatPendidikanSearch(params).subscribe({
      next: (d: any) => {
        this.rpdRows    = d.results || [];
        this.rpdTotal   = d.total   || 0;
        this.rpdLoaded  = true;
        this.rpdLoading = false;
      },
      error: () => { this.rpdLoading = false; }
    });
  }

  setRpdSort(key: string) {
    if (this.rpdSortKey === key) this.rpdSortAsc = !this.rpdSortAsc;
    else { this.rpdSortKey = key; this.rpdSortAsc = true; }
    this.rpdPage = 1;
    this.loadRpd();
  }

  rpdSortIcon(key: string): string {
    if (this.rpdSortKey !== key) return '⇅';
    return this.rpdSortAsc ? '↑' : '↓';
  }

  exportRpd(fmt: 'csv' | 'xlsx') {
    const p: any = { page: 1, page_size: 99999 };
    if (this.rpdFilterNama.trim())    p.nama_dosen  = this.rpdFilterNama.trim();
    if (this.rpdFilterJenjang.trim()) p.jenjang     = this.rpdFilterJenjang.trim();
    if (this.rpdFilterProdi.trim())   p.prodi_dosen = this.rpdFilterProdi.trim();
    if (this.rpdFilterPTDosen.trim()) p.pt_dosen    = this.rpdFilterPTDosen.trim();
    if (this.rpdFilterPTAsal.trim())  p.pt_asal     = this.rpdFilterPTAsal.trim();
    if (this.rpdFilterLN !== '')      p.luar_negeri = this.rpdFilterLN;
    this.api.riwayatPendidikanSearch(p).subscribe({
      next: (d: any) => {
        const rows = d.results || [];
        const hdrs = ['No','Nama Dosen','NIDN','Jabatan','Jenjang','Tahun','Gelar Akademik','PT Asal Pendidikan','PT Tempat Bertugas'];
        const body = rows.map((r: any, i: number) => [
          i + 1, r.nama_dosen, r.nidn || '',
          r.jabatan_fungsional || '', r.jenjang || '', r.tahun_lulus || '',
          r.gelar || '', r.perguruan_tinggi_asal || '', r.pt_nama,
        ]);
        this._doExport(fmt, hdrs, body, 'riwayat-pendidikan-dosen');
      }
    });
  }

  // ── Distribusi Program Studi accordion ──────────────────────────
  distOpen          = false;
  distLoaded        = false;
  distLoading       = false;
  distRows:         any[] = [];
  distTotal         = 0;
  distPage          = 1;
  distSortKey       = 'total_mhs';
  distSortAsc       = false;
  distFilterSem     = '';
  distFilterJenjang = '';
  distSemChoices:   any[] = [];
  readonly DIST_PAGE_SIZE = 5;

  get distTotalPages() { return Math.max(1, Math.ceil(this.distTotal / this.DIST_PAGE_SIZE)); }

  get distPagedRows(): any[] {
    const k = this.distSortKey, asc = this.distSortAsc;
    const sorted = [...this.distRows].sort((a, b) => {
      const va = a[k] ?? '', vb = b[k] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return asc ? va - vb : vb - va;
      return asc ? String(va).localeCompare(String(vb), 'id') : String(vb).localeCompare(String(va), 'id');
    });
    const start = (this.distPage - 1) * this.DIST_PAGE_SIZE;
    return sorted.slice(start, start + this.DIST_PAGE_SIZE);
  }

  setDistSort(key: string) {
    if (this.distSortKey === key) this.distSortAsc = !this.distSortAsc;
    else { this.distSortKey = key; this.distSortAsc = true; }
    this.distPage = 1;
  }

  distSortIcon(key: string): string {
    if (this.distSortKey !== key) return '⇅';
    return this.distSortAsc ? '↑' : '↓';
  }

  loadDist() {
    this.distLoading = true;
    const params: any = {};
    if (this.distFilterJenjang) params.jenjang = this.distFilterJenjang;
    if (this.distFilterSem) {
      const [ta, sem] = this.distFilterSem.split('|');
      params.ta = ta; params.sem = sem;
    }
    this.api.getProdiDistribusi(params).subscribe({
      next: (d: any) => {
        // Isi pilihan semester dan set default hanya saat pertama kali load
        if (!this.distLoaded) {
          this.distSemChoices = d.sem_choices || [];
          if (d.selected_ta && d.selected_sem) {
            this.distFilterSem = d.selected_ta + '|' + d.selected_sem;
          }
        }
        this.distRows    = d.results || [];
        this.distTotal   = d.total   || this.distRows.length;
        this.distPage    = 1;
        this.distLoaded  = true;
        this.distLoading = false;
      },
      error: () => { this.distLoading = false; }
    });
  }

  distRasio(r: any): string {
    if (r.total_mhs == null || !r.total_dosen) return '—';
    return '1:' + (r.total_mhs / r.total_dosen).toFixed(1);
  }

  distRasioClass(r: any): string {
    if (r.total_mhs == null || !r.total_dosen) return '';
    const ratio = r.total_mhs / r.total_dosen;
    if (ratio > 40) return 'rasio--red';
    if (ratio > 30) return 'rasio--orange';
    if (ratio > 20) return 'rasio--yellow';
    return 'rasio--green';
  }

  exportDist(fmt: 'csv' | 'xlsx') {
    const k = this.distSortKey, asc = this.distSortAsc;
    const sorted = [...this.distRows].sort((a, b) => {
      const va = a[k] ?? '', vb = b[k] ?? '';
      if (typeof va === 'number' && typeof vb === 'number') return asc ? va - vb : vb - va;
      return asc ? String(va).localeCompare(String(vb), 'id') : String(vb).localeCompare(String(va), 'id');
    });
    const hdrs = ['No', 'Nama Program Studi', 'Jumlah PT', 'Jml Dosen', 'Mhs Aktif', 'Rasio Dosen:Mhs'];
    const body = sorted.map((r: any, i: number) => [
      i + 1, r.nama, r.jumlah_pt, r.total_dosen || 0, r.total_mhs ?? '', this.distRasio(r),
    ]);
    this._doExport(fmt, hdrs, body, 'distribusi-prodi');
  }

  // ── Daftar Seluruh Prodi accordion ──────────────────────────────
  prodiListOpen    = false;
  prodiListLoaded  = false;
  prodiListLoading = false;
  prodiListRows:   any[] = [];
  prodiListTotal   = 0;
  plPage           = 1;
  plSortKey        = 'nama';
  plSortAsc        = true;
  plFilterNama     = '';
  plFilterNamaPt   = '';
  plFilterKodePt   = '';
  plFilterJenjang  = '';
  plFilterAkreditasi = '';
  plFilterSem      = '';
  plSemChoices:    any[] = [];
  plSemLoaded      = false;
  readonly PL_PAGE_SIZE = 5;

  get prodiListTotalPages() { return Math.max(1, Math.ceil(this.prodiListTotal / this.PL_PAGE_SIZE)); }

  setPlSort(key: string) {
    if (this.plSortKey === key) this.plSortAsc = !this.plSortAsc;
    else { this.plSortKey = key; this.plSortAsc = true; }
    this.plPage = 1;
    this.loadProdiList();
  }

  plSortIcon(key: string): string {
    if (this.plSortKey !== key) return '⇅';
    return this.plSortAsc ? '↑' : '↓';
  }

  private _plParams(): any {
    const p: any = {};
    if (this.plFilterNama)       p.nama       = this.plFilterNama.trim();
    if (this.plFilterNamaPt)     p.nama_pt    = this.plFilterNamaPt.trim();
    if (this.plFilterKodePt)     p.kode_pt    = this.plFilterKodePt.trim();
    if (this.plFilterJenjang)    p.jenjang    = this.plFilterJenjang;
    if (this.plFilterAkreditasi) p.akreditasi = this.plFilterAkreditasi;
    if (this.plFilterSem) {
      const [ta, sem] = this.plFilterSem.split('|');
      if (ta && sem) { p.ta = ta; p.sem = sem; }
    }
    p.sort = this.plSortKey;
    p.dir  = this.plSortAsc ? 'asc' : 'desc';
    return p;
  }

  loadProdiList() {
    this.prodiListLoading = true;
    const params = { ...this._plParams(), page: this.plPage, page_size: this.PL_PAGE_SIZE };
    this.api.getProdiDaftar(params).subscribe({
      next: (d: any) => {
        if (!this.plSemLoaded) {
          this.plSemChoices = d.sem_choices || [];
          if (d.selected_ta && d.selected_sem) {
            this.plFilterSem = d.selected_ta + '|' + d.selected_sem;
          }
          this.plSemLoaded = true;
        }
        this.prodiListRows    = d.results || [];
        this.prodiListTotal   = d.total   || 0;
        this.prodiListLoaded  = true;
        this.prodiListLoading = false;
      },
      error: () => { this.prodiListLoading = false; }
    });
  }

  exportProdiList(fmt: 'csv' | 'xlsx') {
    const params = { ...this._plParams(), page: 1, page_size: 99999 };
    this.api.getProdiDaftar(params).subscribe({
      next: (d: any) => {
        const rows = d.results || [];
        const hdrs = ['No','Kode Prodi','Program Studi','Jenjang','Akreditasi','No. SK Akreditasi','Kedaluarsa Akreditasi','Dosen','Mhs Aktif','Kode PT','Perguruan Tinggi'];
        const body = rows.map((r: any, i: number) => [
          i + 1, r.kode_prodi, r.nama,
          r.jenjang, r.akreditasi, r.no_sk_akreditasi || '',
          r.tanggal_kedaluarsa_akreditasi || '', r.dosen_tetap || 0,
          r.mhs_aktif ?? '', r.kode_pt, r.pt_nama,
        ]);
        this._doExport(fmt, hdrs, body, 'daftar-prodi');
      }
    });
  }

  // Profesor accordion
  profOpen    = false;
  profLoaded  = false;
  profLoading = false;
  profRows:   any[] = [];
  profTotal   = 0;
  profPage    = 1;
  profFilter      = '';
  profFilterPT    = '';
  profFilterProdi = '';
  profSortKey = 'nama';
  profSortAsc = true;
  readonly PROF_PAGE_SIZE = 50;

  get profTotalPages() { return Math.max(1, Math.ceil(this.profTotal / this.PROF_PAGE_SIZE)); }

  loadProf() {
    this.profLoading = true;
    const params: any = { jabatan: 'Profesor', page: this.profPage, page_size: this.PROF_PAGE_SIZE };
    if (this.profFilter.trim())      params.nama       = this.profFilter.trim();
    if (this.profFilterPT.trim())    params.pt_nama    = this.profFilterPT.trim();
    if (this.profFilterProdi.trim()) params.prodi_nama = this.profFilterProdi.trim();
    params.ordering = (this.profSortAsc ? '' : '-') + this.profSortKey;
    this.api.dosenSearch(params).subscribe({
      next: (d: any) => {
        this.profRows    = d.results || [];
        this.profTotal   = d.total   || 0;
        this.profLoaded  = true;
        this.profLoading = false;
      },
      error: () => { this.profLoading = false; }
    });
  }

  setProfSort(key: string) {
    if (this.profSortKey === key) this.profSortAsc = !this.profSortAsc;
    else { this.profSortKey = key; this.profSortAsc = true; }
    this.profPage = 1;
    this.loadProf();
  }

  profSortIcon(key: string): string {
    if (this.profSortKey !== key) return '⇅';
    return this.profSortAsc ? '↑' : '↓';
  }

  exportProf(fmt: 'csv' | 'xlsx') {
    const profExportParams: any = { jabatan: 'Profesor', page: 1, page_size: 99999 };
    if (this.profFilter.trim())      profExportParams.nama       = this.profFilter.trim();
    if (this.profFilterPT.trim())    profExportParams.pt_nama    = this.profFilterPT.trim();
    if (this.profFilterProdi.trim()) profExportParams.prodi_nama = this.profFilterProdi.trim();
    this.api.dosenSearch(profExportParams).subscribe({
      next: (d: any) => {
        const rows = d.results || [];
        const hdrs = ['No','Nama','NIDN/NUPTK','Pendidikan','Status','Program Studi','Perguruan Tinggi'];
        const body = rows.map((r: any, i: number) => [
          i + 1, r.nama, r.nidn || r.nuptk || '',
          r.pendidikan_tertinggi ? r.pendidikan_tertinggi.toUpperCase() : '',
          r.status || '', r.program_studi_nama || '', r.pt_nama,
        ]);
        this._doExport(fmt, hdrs, body, 'dosen-profesor');
      }
    });
  }

  // Generate laporan accordion
  genOpen = false;
  generating = false;
  snapshots: any[] = [];
  activeSnap: any = null;
  snapLoading = false;
  snapFilter = '';
  snapSortKey = 'pt_nama';
  snapSortAsc = true;
  snapActiveSemIdx = 0;      // 1-7: which mhs_sem_X is the active period; 0 = unknown
  activePeriodeLabel = '';   // e.g. "2025/2026 Ganjil"
  snapPage = 1;
  snapResPage = 1;
  showNonAktif = false;
  private readonly SNAP_PAGE_SIZE = 5;

  get snapTotalPages() { return Math.max(1, Math.ceil(this.snapshots.length / this.SNAP_PAGE_SIZE)); }

  get thisWeekSnap(): any {
    const now = new Date();
    const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); mon.setHours(0,0,0,0);
    return this.snapshots.find(s => new Date(s.dibuat_pada) >= mon) || null;
  }
  get snapPagedItems() {
    const start = (this.snapPage - 1) * this.SNAP_PAGE_SIZE;
    return this.snapshots.slice(start, start + this.SNAP_PAGE_SIZE);
  }
  get snapResTotalPages() { return Math.max(1, Math.ceil(this.filteredSnap.length / this.SNAP_PAGE_SIZE)); }
  get pagedSnap() {
    const start = (this.snapResPage - 1) * this.SNAP_PAGE_SIZE;
    return this.filteredSnap.slice(start, start + this.SNAP_PAGE_SIZE);
  }

  private debounceTimer: any;

  currentUser: any = null;
  get isAdmin(): boolean { return this.currentUser?.role === 'superadmin'; }

  constructor(private api: ApiService, private router: Router, private auth: AuthService) {}

  ngOnInit() {
    this.auth.currentUser$.subscribe(u => this.currentUser = u);
    this.api.getWilayahList().subscribe({
      next: (d: any) => {
        const list = Array.isArray(d) ? d : (d.results || []);
        this.wilayahList = list.sort((a: any, b: any) => a.nama.localeCompare(b.nama));
        this.wilayahList.forEach((w: any) => this.selectedIds.add(w.id));
        this.selectedIds = new Set(this.selectedIds);
      }
    });
    this.api.getPeriodeAktif().subscribe({
      next: (p: any) => {
        if (p?.tahun && p?.semester) {
          const ta = p.semester === 'genap'
            ? `${p.tahun - 1}/${p.tahun}`
            : `${p.tahun}/${p.tahun + 1}`;
          this.activePeriodeLabel = `${ta} ${p.semester.charAt(0).toUpperCase() + p.semester.slice(1)}`;
        }
      }
    });
    this.loadStatistik();
    this.loadSnapshots();
  }

  // ── Generate Laporan ──────────────────────────────
  loadSnapshots() {
    this.api.getSnapshotList().subscribe({ next: (d: any) => { this.snapshots = Array.isArray(d) ? d : (d.results || []); }, error: () => {} });
  }

  generateLaporan() {
    this.generating = true;
    this.api.generateSnapshot().subscribe({
      next: (snap: any) => {
        this.generating = false;
        // Hapus snapshot minggu ini dari list lokal (sudah ditimpa di backend)
        const now = new Date();
        const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); mon.setHours(0,0,0,0);
        this.snapshots = this.snapshots.filter(s => new Date(s.dibuat_pada) < mon);
        this.snapshots = [snap, ...this.snapshots].slice(0, 50);
        this.snapPage = 1;
        this.activeSnap = snap;
        this._applyActiveSemSort(snap);
      },
      error: () => { this.generating = false; alert('Gagal generate laporan, coba lagi.'); }
    });
  }

  deleteSnap(event: MouseEvent, id: number) {
    event.stopPropagation();
    if (!confirm('Hapus riwayat laporan ini?')) return;
    this.api.deleteSnapshot(id).subscribe({
      next: () => {
        this.snapshots = this.snapshots.filter(s => s.id !== id);
        if (this.activeSnap?.id === id) this.activeSnap = null;
        if (this.snapPage > this.snapTotalPages) this.snapPage = this.snapTotalPages;
      },
      error: () => alert('Gagal menghapus riwayat.')
    });
  }

  loadSnap(id: number) {
    if (this.activeSnap?.id === id) { this.activeSnap = null; return; }
    this.snapLoading = true;
    this.api.getSnapshotDetail(id).subscribe({
      next: (d: any) => {
        this.activeSnap = d;
        this.snapLoading = false;
        this.snapResPage = 1;
        this._applyActiveSemSort(d);
      },
      error: () => this.snapLoading = false
    });
  }

  private _applyActiveSemSort(d: any) {
    const row = (d.per_pt || [])[0];
    if (!row || !this.activePeriodeLabel) return;
    for (let i = 1; i <= 7; i++) {
      if (row[`mhs_label_${i}`] === this.activePeriodeLabel) {
        this.snapActiveSemIdx = i;
        this.snapSortKey = `mhs_sem_${i}`;
        this.snapSortAsc = false;
        return;
      }
    }
    // Fallback: sort by most recent sem (sem_7) descending
    this.snapActiveSemIdx = 7;
    this.snapSortKey = 'mhs_sem_7';
    this.snapSortAsc = false;
  }

  get filteredSnap(): any[] {
    if (!this.activeSnap?.per_pt) return [];
    const q = this.snapFilter.toLowerCase().trim();
    let rows = this.activeSnap.per_pt.filter((r: any) => {
      if (!this.showNonAktif && !r.pt_aktif) return false;
      if (!q) return true;
      return (r.pt_nama||'').toLowerCase().includes(q) ||
             (r.pt_singkatan||'').toLowerCase().includes(q) ||
             (r.pt_kode||'').toLowerCase().includes(q);
    });

    const key = this.snapSortKey;
    const asc = this.snapSortAsc ? 1 : -1;
    rows.sort((a: any, b: any) => {
      const av = a[key] ?? 0, bv = b[key] ?? 0;
      if (typeof av === 'string') return asc * av.localeCompare(bv);
      return asc * (av - bv);
    });
    return rows;
  }

  setSnapSort(key: string) {
    this.snapSortAsc = this.snapSortKey === key ? !this.snapSortAsc : true;
    this.snapSortKey = key;
    this.snapResPage = 1;
  }

  snapSortIcon(key: string): string {
    if (this.snapSortKey !== key) return '↕';
    return this.snapSortAsc ? '↑' : '↓';
  }

  get snapTotals() {
    const rows = this.filteredSnap;
    const sum = (f: string) => rows.reduce((a: number, r: any) => a + (r[f] || 0), 0);
    return {
      prodi: sum('total_prodi'),
      prodi_aktif: sum('prodi_aktif'), prodi_non_aktif: sum('prodi_non_aktif'),
      prodi_s1: sum('prodi_s1'), prodi_s2: sum('prodi_s2'), prodi_s3: sum('prodi_s3'),
      prodi_d3: sum('prodi_d3'), prodi_d4: sum('prodi_d4'),
      prodi_profesi: sum('prodi_profesi'), prodi_sp1: sum('prodi_sp1'),
      prodi_lainnya: sum('prodi_jenjang_lainnya'),
      dosen: sum('total_dosen'), with_detail: sum('dosen_with_detail'), no_detail: sum('dosen_no_detail'),
      pria: sum('dosen_pria'), wanita: sum('dosen_wanita'), gender_no_info: sum('dosen_gender_no_info'),
      profesor: sum('dosen_profesor'), lektor_kepala: sum('dosen_lektor_kepala'),
      lektor: sum('dosen_lektor'), asisten_ahli: sum('dosen_asisten_ahli'),
      jab_lainnya: sum('dosen_jabatan_lainnya'),
      pend_s3: sum('dosen_pend_s3'), pend_s2: sum('dosen_pend_s2'),
      pend_s1: sum('dosen_pend_s1'), pend_profesi: sum('dosen_pend_profesi'),
      pend_lainnya: sum('dosen_pend_lainnya'),
      aktif: sum('dosen_aktif'), tugas_belajar: sum('dosen_tugas_belajar'),
      ijin_belajar: sum('dosen_ijin_belajar'), cuti: sum('dosen_cuti'),
      sts_lainnya: sum('dosen_status_lainnya'),
      tetap: sum('dosen_tetap'), tidak_tetap: sum('dosen_tidak_tetap'),
      dtpk: sum('dosen_dtpk'), ik_lainnya: sum('dosen_ikatan_lainnya'),
      mhs_sem_1: sum('mhs_sem_1'), mhs_sem_2: sum('mhs_sem_2'),
      mhs_sem_3: sum('mhs_sem_3'), mhs_sem_4: sum('mhs_sem_4'),
      mhs_sem_5: sum('mhs_sem_5'), mhs_sem_6: sum('mhs_sem_6'),
      mhs_sem_7: sum('mhs_sem_7'),
    };
  }

  get snapSemLabels(): string[] {
    const r = this.filteredSnap[0];
    if (!r) return ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6','Sem 7'];
    return [1,2,3,4,5,6,7].map(i => r[`mhs_label_${i}`] || `Sem ${i}`);
  }

  trenH(val: number, r: any): number {
    const max = Math.max(r.mhs_sem_1,r.mhs_sem_2,r.mhs_sem_3,r.mhs_sem_4,r.mhs_sem_5,r.mhs_sem_6,r.mhs_sem_7, 1);
    return Math.max(2, Math.round((val / max) * 24));
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
    const lbls = this.snapSemLabels;
    const hdrs = [
      'Kode PT','Singkatan','Nama',
      'Total Prodi','S1','S2','S3','D3','D4','Profesi','Sp-1','Prodi Lainnya',
      'Total Dosen','Pria','Wanita','No Info Gender',
      'Profesor','Lektor Kepala','Lektor','Asisten Ahli','Jabatan Lainnya',
      'Pend S3','Pend S2','Pend S1','Pend Profesi','Pend Lainnya',
      'Aktif','Tugas Belajar','Ijin Belajar','Cuti','Status Lainnya',
      'Tetap','Tidak Tetap','DTPK','Ikatan Lainnya',
      ...lbls,
    ];
    const body = rows.map((r: any) => [
      r.pt_kode, r.pt_singkatan, r.pt_nama,
      r.total_prodi, r.prodi_s1, r.prodi_s2, r.prodi_s3, r.prodi_d3, r.prodi_d4, r.prodi_profesi, r.prodi_sp1, r.prodi_jenjang_lainnya,
      r.total_dosen, r.dosen_pria, r.dosen_wanita, r.dosen_gender_no_info,
      r.dosen_profesor, r.dosen_lektor_kepala, r.dosen_lektor, r.dosen_asisten_ahli, r.dosen_jabatan_lainnya,
      r.dosen_pend_s3, r.dosen_pend_s2, r.dosen_pend_s1, r.dosen_pend_profesi, r.dosen_pend_lainnya,
      r.dosen_aktif, r.dosen_tugas_belajar, r.dosen_ijin_belajar, r.dosen_cuti, r.dosen_status_lainnya,
      r.dosen_tetap, r.dosen_tidak_tetap, r.dosen_dtpk, r.dosen_ikatan_lainnya,
      r.mhs_sem_1, r.mhs_sem_2, r.mhs_sem_3, r.mhs_sem_4, r.mhs_sem_5, r.mhs_sem_6, r.mhs_sem_7,
    ]);
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

  fmtJenis(j: string): string {
    const m: any = { universitas:'Univ', institut:'Inst', sekolah_tinggi:'ST', politeknik:'Poli', akademi:'Akd', akademi_komunitas:'AK' };
    return m[j] || (j || '—');
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

  private readonly PIE_COLORS = [
    '#1a237e','#1d4ed8','#0ea5e9','#06b6d4','#10b981',
    '#84cc16','#f59e0b','#ef4444','#8b5cf6','#ec4899',
    '#6366f1','#14b8a6','#f97316','#64748b','#a855f7',
  ];

  get wilayahPieSegments(): any[] {
    if (!this.statistik?.per_wilayah?.length) return [];
    const total = this.statistik.total_pt || 1;
    const C = 2 * Math.PI * 40;
    let acc = 0;
    return this.statistik.per_wilayah.map((w: any, i: number) => {
      const dash = (w.total / total) * C;
      const seg = {
        dash,
        gap: C - dash,
        offset: C - acc,
        color: this.PIE_COLORS[i % this.PIE_COLORS.length],
        label: w.wilayah__nama,
        total: w.total,
        pct: Math.round((w.total / total) * 100),
      };
      acc += dash;
      return seg;
    });
  }
}
