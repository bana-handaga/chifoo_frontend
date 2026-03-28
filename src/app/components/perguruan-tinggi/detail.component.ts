import { Component, OnInit, AfterViewChecked, ElementRef, ViewChild, NgZone } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ProgramStudi } from '../../models';
import * as XLSX from 'xlsx';
import {
  Chart, LineController, LineElement, PointElement,
  BarController, BarElement,
  ArcElement, DoughnutController,
  LinearScale, CategoryScale, Tooltip, Legend, Filler
} from 'chart.js';

Chart.register(LineController, LineElement, PointElement, BarController, BarElement, ArcElement, DoughnutController, LinearScale, CategoryScale, Tooltip, Legend, Filler);

@Component({
  selector: 'app-pt-detail',
  template: `
    <div class="page" *ngIf="pt">
      <div class="breadcrumb"><a routerLink="/perguruan-tinggi">Perguruan Tinggi</a> / {{ pt.singkatan }}</div>
      <div class="detail-header card mb-16">
        <div class="header-main">
          <div class="pt-logo" *ngIf="pt.logo"><img [src]="pt.logo" alt="logo"></div>
          <div class="pt-logo placeholder" *ngIf="!pt.logo">🏫</div>
          <div class="pt-info">
            <h1>{{ pt.nama }}</h1>
            <div class="pt-meta">
              <span>{{ pt.kode_pt }}</span> ·
              <span>{{ pt.jenis | titlecase }}</span> ·
              <span [class]="'badge badge-' + pt.organisasi_induk">{{ pt.organisasi_induk | titlecase }}</span> ·
              <span [class]="'badge badge-akr-' + pt.akreditasi_institusi">{{ formatAkreditasi(pt.akreditasi_institusi) }}</span>
            </div>
            <div class="pt-akreditasi-detail" *ngIf="pt.nomor_sk_akreditasi || pt.tanggal_kadaluarsa_akreditasi">
              <span *ngIf="pt.nomor_sk_akreditasi" class="akr-item">
                <span class="akr-lbl">No. SK</span>
                <span class="akr-val">{{ pt.nomor_sk_akreditasi }}</span>
              </span>
              <span *ngIf="pt.tanggal_kadaluarsa_akreditasi" class="akr-item">
                <span class="akr-lbl">Berlaku s/d</span>
                <span [class]="'exp-pill exp-' + expStatus(pt.tanggal_kadaluarsa_akreditasi)">
                  {{ pt.tanggal_kadaluarsa_akreditasi | date:'dd MMM yyyy' }}
                </span>
              </span>
            </div>
            <div class="pt-address">📍 {{ pt.alamat }}, {{ pt.kota }}, {{ pt.provinsi }}</div>
            <div class="pt-contacts">
              <a *ngIf="pt.website" [href]="pt.website" target="_blank">🌐 {{ pt.website }}</a>
              <span *ngIf="pt.email">📧 {{ pt.email }}</span>
              <span *ngIf="pt.telepon">📞 {{ pt.telepon }}</span>
            </div>
          </div>
        </div>
        <div class="header-footer">
          <button class="btn-download-pdf" (click)="downloadPtPdf()">
            <svg viewBox="0 0 24 24" fill="currentColor" style="width:15px;height:15px">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 17.5v-5h1.25c.69 0 1.25.56 1.25 1.25v2.5c0 .69-.56 1.25-1.25 1.25H8.5zm1.25-4h-.25v3h.25c.14 0 .25-.11.25-.25v-2.5c0-.14-.11-.25-.25-.25zm2.25 4v-5H13v.5h-1v1.5h.75v.5H12v1.5h1v.5h-1.75v.5zm3-2.5h-.75v2.5h-1v-5H15c.69 0 1.25.56 1.25 1.25v1.25c0 .69-.56 1.25-1.25 1zm0-1.5c.14 0 .25.11.25.25v1.25c0 .14-.11.25-.25.25h-.75v-1.75h.75z"/>
            </svg>
            Download Profil PT (PDF)
          </button>
        </div>
      </div>

      <div class="tabs-wrapper">
        <div class="tabs">
          <button [class.active]="tab==='prodi'" (click)="setTab('prodi')">Program Studi ({{ filteredProgramStudi.length }}<span *ngIf="filterProdiJenjang || filterProdiAkreditasi || filterProdiExp">/{{ pt.program_studi?.length }}</span>)</button>
          <button [class.active]="tab==='mahasiswa'" (click)="setTab('mahasiswa')">Data Mahasiswa</button>
          <button [class.active]="tab==='dosen'" (click)="setTab('dosen')">Data Dosen</button>
        </div>
      </div>

      <!-- Tab: Program Studi -->
      <div class="card" *ngIf="tab==='prodi'">
        <div class="periode-label" *ngIf="pt.periode_aktif_label">
          Mahasiswa aktif: <strong>{{ pt.periode_aktif_label }}</strong>
        </div>

        <!-- Notifikasi akreditasi kedaluarsa -->
        <div *ngIf="prodiExpRed.length > 0 || prodiExpYellow.length > 0" class="akr-expiry-notices">
          <div *ngIf="prodiExpRed.length > 0" class="akr-expiry-item akr-red" style="cursor:pointer"
               (click)="setProdiExpFilter('less_7m')">
            <span class="akr-expiry-icon">&#9888;</span>
            <span class="akr-expiry-text">
              <strong>{{ prodiExpRed.length }} prodi</strong> akreditasinya kedaluarsa dalam <strong>kurang dari 7 bulan</strong>
            </span>
            <span class="akr-expiry-action">Lihat →</span>
          </div>
          <div *ngIf="prodiExpYellow.length > 0" class="akr-expiry-item akr-yellow" style="cursor:pointer"
               (click)="setProdiExpFilter('less_12m')">
            <span class="akr-expiry-icon">&#9888;</span>
            <span class="akr-expiry-text">
              <strong>{{ prodiExpYellow.length }} prodi</strong> akreditasinya kedaluarsa dalam <strong>7 – 12 bulan</strong>
            </span>
            <span class="akr-expiry-action">Lihat →</span>
          </div>
        </div>

        <!-- Filter toolbar -->
        <div class="prodi-filter-bar">
          <div class="filter-group">
            <label class="filter-label">Jenjang:</label>
            <select [(ngModel)]="filterProdiJenjang" class="filter-select">
              <option value="">Semua</option>
              <option *ngFor="let j of prodiJenjangOptions" [value]="j">{{ j }}</option>
            </select>
            <span class="filter-reset" *ngIf="filterProdiJenjang" (click)="filterProdiJenjang=''">✕</span>
          </div>
          <div class="filter-group">
            <label class="filter-label">Akreditasi:</label>
            <select [(ngModel)]="filterProdiAkreditasi" class="filter-select">
              <option value="">Semua</option>
              <option *ngFor="let a of prodiAkreditasiOptions" [value]="a">{{ a }}</option>
            </select>
            <span class="filter-reset" *ngIf="filterProdiAkreditasi" (click)="filterProdiAkreditasi=''">✕</span>
          </div>
          <div class="filter-group">
            <label class="filter-label">Kedaluarsa:</label>
            <select [(ngModel)]="filterProdiExp" class="filter-select filter-select-exp">
              <option value="">Semua</option>
              <option value="less_12m">Kurang dari 12 bulan</option>
              <option value="less_7m">Kurang dari 7 bulan</option>
            </select>
            <span class="filter-reset" *ngIf="filterProdiExp" (click)="filterProdiExp=''">✕</span>
          </div>
        </div>

        <!-- Chart row -->
        <div class="prodi-charts-row">
          <div class="prodi-chart-card">
            <div class="prodi-chart-title">Sebaran Jenjang</div>
            <div class="prodi-chart-wrap"><canvas #prodiJenjangChart></canvas></div>
          </div>
          <div class="prodi-chart-card">
            <div class="prodi-chart-title">Sebaran Akreditasi</div>
            <div class="prodi-chart-wrap"><canvas #prodiAkrChart></canvas></div>
          </div>
          <div class="prodi-chart-card prodi-chart-card--wide">
            <div class="prodi-chart-title">Mahasiswa Aktif per Prodi</div>
            <div class="prodi-chart-wrap prodi-chart-wrap--bar"><canvas #prodiMhsChart></canvas></div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="th-sort" (click)="setProdiSort('nama')">Nama Prodi <span class="si">{{ prodiSi('nama') }}</span></th>
                <th>Perguruan Tinggi</th>
                <th class="th-sort" (click)="setProdiSort('jenjang')">Jenjang <span class="si">{{ prodiSi('jenjang') }}</span></th>
                <th class="th-sort" (click)="setProdiSort('akreditasi')">Akreditasi <span class="si">{{ prodiSi('akreditasi') }}</span></th>
                <th>No. SK</th>
                <th class="th-sort" (click)="setProdiSort('tanggal_kedaluarsa_akreditasi')">Berlaku s/d <span class="si">{{ prodiSi('tanggal_kedaluarsa_akreditasi') }}</span></th>
                <th class="text-right th-sort" (click)="setProdiSort('mahasiswa_aktif_periode')">Mhs Aktif <span class="si">{{ prodiSi('mahasiswa_aktif_periode') }}</span></th>
                <th class="text-right th-sort" (click)="setProdiSort('dosen_tetap_periode')">Dosen Tetap <span class="si">{{ prodiSi('dosen_tetap_periode') }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let p of filteredProgramStudi" class="prodi-row" (click)="openProdiModal(p)">
                <td>
                  {{ p.nama }}<br>
                  <code class="prodi-kode">{{ p.kode_prodi }}</code>
                </td>
                <td>
                  <div class="dsc-pt-nama">{{ pt.singkatan || pt.nama }}</div>
                  <code class="prodi-kode">{{ pt.kode_pt }}</code>
                </td>
                <td>{{ p.jenjang_display }}</td>
                <td>
                  <span class="badge">{{ p.akreditasi_display }}</span>
                  <button *ngIf="isLoggedIn" class="btn-akr-update" title="Update akreditasi dari BAN-PT"
                          (click)="openAkrModal(p)">✎</button>
                </td>
                <td class="sk-col">
                  <span *ngIf="p.no_sk_akreditasi">{{ p.no_sk_akreditasi }}</span>
                  <span *ngIf="!p.no_sk_akreditasi" class="no-data">—</span>
                </td>
                <td class="exp-col">
                  <span *ngIf="p.tanggal_kedaluarsa_akreditasi"
                        [class]="'exp-pill exp-' + expStatus(p.tanggal_kedaluarsa_akreditasi)">
                    {{ p.tanggal_kedaluarsa_akreditasi | date:'dd MMM yyyy' }}
                  </span>
                  <span *ngIf="!p.tanggal_kedaluarsa_akreditasi" class="no-data">—</span>
                </td>
                <td class="text-right mhs-col">
                  <span *ngIf="(p.mahasiswa_aktif_periode ?? 0) > 0">{{ p.mahasiswa_aktif_periode | number }}</span>
                  <span *ngIf="!(p.mahasiswa_aktif_periode ?? 0)" class="no-data">—</span>
                </td>
                <td class="text-right">
                  <span *ngIf="(p.dosen_tetap_periode ?? 0) > 0">{{ p.dosen_tetap_periode | number }}</span>
                  <span *ngIf="!(p.dosen_tetap_periode ?? 0)" class="no-data">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Modal Update Akreditasi -->
      <div class="modal-overlay" *ngIf="akrModal.open" (click)="closeAkrModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <span>Update Akreditasi — <strong>{{ akrModal.prodi?.nama }}</strong></span>
            <button class="modal-close" (click)="closeAkrModal()">✕</button>
          </div>
          <div class="modal-body">
            <div class="modal-loading" *ngIf="akrModal.loading">Mencari data BAN-PT…</div>
            <div class="modal-empty" *ngIf="!akrModal.loading && !akrModal.results.length">
              Tidak ditemukan data di BAN-PT.
            </div>
            <table class="akr-result-table" *ngIf="!akrModal.loading && akrModal.results.length">
              <thead>
                <tr><th>Kesamaan</th><th>Nama Prodi</th><th>Jenjang</th><th>Peringkat</th><th>No. SK</th><th>Berlaku s/d</th><th></th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of akrModal.results" [class.akr-row-selected]="akrModal.selected === r">
                  <td>
                    <div class="sim-bar-wrap">
                      <div class="sim-bar" [style.width.%]="r.similarity"
                           [class.sim-high]="r.similarity >= 70"
                           [class.sim-med]="r.similarity >= 45 && r.similarity < 70"
                           [class.sim-low]="r.similarity < 45"></div>
                      <span class="sim-pct">{{ r.similarity }}%</span>
                    </div>
                    <div class="sim-namapt">{{ r.nama_pt }}</div>
                  </td>
                  <td>{{ r.nama_prodi }}</td>
                  <td>{{ r.jenjang }}</td>
                  <td><strong>{{ r.peringkat }}</strong></td>
                  <td class="sk-col">{{ r.nomor_sk }}</td>
                  <td>{{ r.tgl_expired || '—' }}</td>
                  <td><button class="btn-pilih" (click)="akrModal.selected = r">Pilih</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="modal-footer" *ngIf="akrModal.selected">
            <span class="akr-selected-info">
              Pilihan: <strong>{{ akrModal.selected.peringkat }}</strong> · {{ akrModal.selected.nomor_sk }}
            </span>
            <button class="btn-simpan" [disabled]="akrModal.saving" (click)="simpanAkreditasi()">
              {{ akrModal.saving ? 'Menyimpan…' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Profil Prodi -->
      <div class="modal-overlay" *ngIf="prodiModal.open" (click)="closeProdiModal()">
        <div class="modal-box pmodal-box" (click)="$event.stopPropagation()">
          <div class="modal-header pmodal-header">
            <div class="pmodal-title-wrap">
              <span class="pmodal-nama">{{ prodiModal.prodi?.nama }}</span>
              <span class="badge jenjang-badge jenjang-{{ prodiModal.prodi?.jenjang }}">{{ prodiModal.prodi?.jenjang_display }}</span>
              <code class="pmodal-kode">{{ prodiModal.prodi?.kode_prodi }}</code>
            </div>
            <button class="modal-close pmodal-close" (click)="closeProdiModal()">✕</button>
          </div>
          <div class="modal-body pmodal-body">

            <!-- Akreditasi -->
            <div class="pmodal-section">
              <div class="pmodal-sec-title">Akreditasi</div>
              <div class="pmodal-akr-row">
                <span [class]="'badge badge-' + prodiModal.prodi?.akreditasi">{{ prodiModal.prodi?.akreditasi_display }}</span>
                <span class="pmodal-akr-sk" *ngIf="prodiModal.prodi?.no_sk_akreditasi">SK: {{ prodiModal.prodi?.no_sk_akreditasi }}</span>
                <span *ngIf="prodiModal.prodi?.tanggal_kedaluarsa_akreditasi"
                      [class]="'exp-pill exp-' + expStatus(prodiModal.prodi!.tanggal_kedaluarsa_akreditasi!)">
                  Berlaku s/d {{ prodiModal.prodi?.tanggal_kedaluarsa_akreditasi | date:'dd MMM yyyy' }}
                </span>
                <span *ngIf="!prodiModal.prodi?.tanggal_kedaluarsa_akreditasi" class="no-data">Berlaku s/d —</span>
              </div>
            </div>

            <!-- Stat boxes periode aktif -->
            <div class="pmodal-section">
              <div class="pmodal-sec-title">Data Periode Aktif <span class="pmodal-period-lbl" *ngIf="pt?.periode_aktif_label">({{ pt.periode_aktif_label }})</span></div>
              <div class="pmodal-stats">
                <div class="pmodal-stat pmodal-stat--hl">
                  <div class="pmodal-val">{{ (prodiModal.prodi?.mahasiswa_aktif_periode ?? 0) | number }}</div>
                  <div class="pmodal-lbl">Mahasiswa Aktif</div>
                </div>
                <div class="pmodal-stat">
                  <div class="pmodal-val">{{ prodiModal.dosenPeriode?.dosen_tetap ?? 0 | number }}</div>
                  <div class="pmodal-lbl">Dosen Tetap</div>
                </div>
                <div class="pmodal-stat">
                  <div class="pmodal-val">{{ prodiModal.dosenPeriode?.dosen_tidak_tetap ?? 0 | number }}</div>
                  <div class="pmodal-lbl">Dosen Tidak Tetap</div>
                </div>
                <div class="pmodal-stat">
                  <div class="pmodal-val">{{ prodiModal.dosenPeriode?.dosen_s3 ?? 0 | number }}</div>
                  <div class="pmodal-lbl">Dosen S3</div>
                </div>
                <div class="pmodal-stat">
                  <div class="pmodal-val">{{ prodiModal.dosenPeriode?.dosen_s2 ?? 0 | number }}</div>
                  <div class="pmodal-lbl">Dosen S2</div>
                </div>
                <div class="pmodal-stat">
                  <div class="pmodal-val">{{ prodiModal.dosenPeriode?.dosen_guru_besar ?? 0 | number }}</div>
                  <div class="pmodal-lbl">Guru Besar</div>
                </div>
                <div class="pmodal-stat">
                  <div class="pmodal-val">{{ prodiModal.dosenPeriode?.dosen_lektor_kepala ?? 0 | number }}</div>
                  <div class="pmodal-lbl">Lektor Kepala</div>
                </div>
                <div class="pmodal-stat">
                  <div class="pmodal-val">{{ prodiModal.dosenPeriode?.dosen_lektor ?? 0 | number }}</div>
                  <div class="pmodal-lbl">Lektor</div>
                </div>
                <div class="pmodal-stat">
                  <div class="pmodal-val">{{ prodiModal.dosenPeriode?.dosen_asisten_ahli ?? 0 | number }}</div>
                  <div class="pmodal-lbl">Asisten Ahli</div>
                </div>
                <div class="pmodal-stat">
                  <div class="pmodal-val">{{ prodiModal.dosenPeriode?.dosen_bersertifikat ?? 0 | number }}</div>
                  <div class="pmodal-lbl">Bersertifikat</div>
                </div>
              </div>
            </div>

            <!-- Riwayat Mahasiswa — Line Chart -->
            <div class="pmodal-section" *ngIf="prodiModal.mhsData.length">
              <div class="pmodal-sec-title">Tren Mahasiswa Aktif — 12 Semester Terakhir</div>
              <div class="pmodal-chart-wrap">
                <canvas #prodiMhsLineChart></canvas>
              </div>
            </div>

            <!-- Riwayat Dosen -->
            <div class="pmodal-section" *ngIf="prodiModal.dosenData.length">
              <div class="pmodal-sec-title">Riwayat Data Dosen</div>
              <div class="pmodal-tbl-wrap">
                <table class="pmodal-table">
                  <thead>
                    <tr>
                      <th>Periode</th>
                      <th class="num">Tetap</th>
                      <th class="num">Tdk Tetap</th>
                      <th class="num">S3</th>
                      <th class="num">S2</th>
                      <th class="num">S1</th>
                      <th class="num">Guru Besar</th>
                      <th class="num">Lektor Kep.</th>
                      <th class="num">Lektor</th>
                      <th class="num">Asisten Ahli</th>
                      <th class="num">Bersertifikat</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let r of prodiModal.dosenData">
                      <td class="nowrap">{{ r.tahun_akademik }} {{ r.semester | titlecase }}</td>
                      <td class="num bold">{{ r.dosen_tetap | number }}</td>
                      <td class="num">{{ r.dosen_tidak_tetap | number }}</td>
                      <td class="num">{{ r.dosen_s3 | number }}</td>
                      <td class="num">{{ r.dosen_s2 | number }}</td>
                      <td class="num">{{ r.dosen_s1 | number }}</td>
                      <td class="num">{{ r.dosen_guru_besar | number }}</td>
                      <td class="num">{{ r.dosen_lektor_kepala | number }}</td>
                      <td class="num">{{ r.dosen_lektor | number }}</td>
                      <td class="num">{{ r.dosen_asisten_ahli | number }}</td>
                      <td class="num">{{ r.dosen_bersertifikat | number }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div *ngIf="!prodiModal.mhsData.length && !prodiModal.dosenData.length" class="pmodal-nodata">
              Belum ada data mahasiswa atau dosen untuk program studi ini.
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Data Mahasiswa -->
      <div class="card" *ngIf="tab==='mahasiswa'">
        <div class="no-data-msg" *ngIf="!pt.data_mahasiswa?.length">Belum ada data mahasiswa.</div>

        <ng-container *ngIf="pt.data_mahasiswa?.length">
          <!-- Filter Program Studi -->
          <div class="prodi-filter-wrap">
            <div class="prodi-filter-header" (click)="prodiFilterOpen = !prodiFilterOpen">
              <span class="pf-title">Filter Program Studi</span>
              <span class="pf-count">
                {{ selectedProdiMhs.size }}/{{ prodiListMhs.length }} dipilih
              </span>
              <button class="pf-all" (click)="$event.stopPropagation(); selectAllProdiMhs()">Semua</button>
              <button class="pf-none" (click)="$event.stopPropagation(); clearAllProdiMhs()">Hapus</button>
              <div class="mhs-mode-toggle" (click)="$event.stopPropagation()">
                <button class="mhs-mode-btn" [class.active]="mhsMode==='gabung'"
                        (click)="setMhsMode('gabung')">Gabung</button>
                <button class="mhs-mode-btn" [class.active]="mhsMode==='bandingkan'"
                        (click)="setMhsMode('bandingkan')">Bandingkan</button>
              </div>
              <span class="pf-chevron">{{ prodiFilterOpen ? '▲' : '▼' }}</span>
            </div>
            <div class="prodi-checklist" *ngIf="prodiFilterOpen">
              <label *ngFor="let p of prodiListMhs" class="prodi-check-item">
                <input type="checkbox"
                       [checked]="selectedProdiMhs.has(p.id)"
                       (change)="toggleProdiMhs(p.id)">
                <span class="prodi-check-name">{{ p.nama }}</span>
                <span class="prodi-check-jenjang">{{ p.jenjang }}</span>
              </label>
            </div>
          </div>

          <!-- Grafik line -->
          <div class="chart-container">
            <canvas #mhsChart></canvas>
          </div>

        </ng-container>
      </div>

      <!-- Tab: Data Dosen -->
      <div class="card dosen-card" *ngIf="tab==='dosen'">
        <div class="no-data-msg" *ngIf="!pt.data_dosen?.length">Belum ada data dosen.</div>

        <!-- ── Accordion: Cari Dosen (biru) ── -->
        <div class="dsc-accordion" [class.open]="dscOpen">
          <button class="dsc-toggle" (click)="dscOpen = !dscOpen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;flex-shrink:0"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            Cari Dosen — {{ pt.singkatan }}
            <span class="dsc-chevron" [class.rotated]="dscOpen">▾</span>
          </button>

          <div class="dsc-body" *ngIf="dscOpen">
            <div class="dsc-fields">
              <div class="dscf">
                <label>Nama Dosen</label>
                <input type="text" [(ngModel)]="dscForm.nama" placeholder="Ketik nama dosen..." (keyup.enter)="runDscSearch()">
              </div>
              <div class="dscf">
                <label>Jabatan Fungsional</label>
                <select [(ngModel)]="dscForm.jabatan">
                  <option value="">— Semua —</option>
                  <option value="Profesor">Profesor</option>
                  <option value="Lektor Kepala">Lektor Kepala</option>
                  <option value="Lektor">Lektor</option>
                  <option value="Asisten Ahli">Asisten Ahli</option>
                </select>
              </div>
              <div class="dscf">
                <label>Pendidikan</label>
                <select [(ngModel)]="dscForm.pendidikan">
                  <option value="">— Semua —</option>
                  <option value="s3">S3</option>
                  <option value="s2">S2</option>
                  <option value="s1">S1</option>
                  <option value="profesi">Profesi</option>
                </select>
              </div>
              <div class="dscf">
                <label>Status</label>
                <select [(ngModel)]="dscForm.status">
                  <option value="">— Semua —</option>
                  <option value="Aktif">Aktif</option>
                  <option value="TUGAS BELAJAR">Tugas Belajar</option>
                  <option value="IJIN BELAJAR">Ijin Belajar</option>
                  <option value="CUTI">Cuti</option>
                </select>
              </div>
              <div class="dscf dscf--action">
                <button class="dsc-btn-search" (click)="runDscSearch()" [disabled]="dscSearching">
                  {{ dscSearching ? 'Mencari...' : 'Cari' }}
                </button>
                <button class="dsc-btn-reset" (click)="resetDscSearch()" *ngIf="dscDone">Reset</button>
              </div>
            </div>

            <!-- Hasil -->
            <div class="dsc-results" *ngIf="dscDone">
              <div class="dsc-results__header">
                <div class="dsc-results__info">
                  Ditemukan <strong>{{ dscTotal | number }}</strong> dosen
                  <span *ngIf="dscTotalPages > 1"> — halaman {{ dscPage }} / {{ dscTotalPages }}</span>
                </div>
                <div class="dsc-actions">
                  <div class="dsc-pagination" *ngIf="dscTotalPages > 1">
                    <button [disabled]="dscPage===1" (click)="dscGoPage(dscPage-1)">‹ Prev</button>
                    <span>{{ dscPage }} / {{ dscTotalPages }}</span>
                    <button [disabled]="dscPage===dscTotalPages" (click)="dscGoPage(dscPage+1)">Next ›</button>
                  </div>
                  <div class="dsc-export-btns">
                    <button class="dsc-exp dsc-exp--csv"  (click)="exportDsc('csv')">CSV</button>
                    <button class="dsc-exp dsc-exp--xlsx" (click)="exportDsc('xlsx')">XLSX</button>
                  </div>
                </div>
              </div>
              <div class="dsc-table-wrap">
                <table class="dsc-table">
                  <thead>
                    <tr>
                      <th (click)="dscSetSort('nama')" class="dsc-sortable">Nama <span class="dsc-si">{{ dscSortIcon('nama') }}</span></th>
                      <th (click)="dscSetSort('perguruan_tinggi__nama')" class="dsc-sortable">Perguruan Tinggi <span class="dsc-si">{{ dscSortIcon('perguruan_tinggi__nama') }}</span></th>
                      <th (click)="dscSetSort('program_studi_nama')" class="dsc-sortable">Program Studi <span class="dsc-si">{{ dscSortIcon('program_studi_nama') }}</span></th>
                      <th (click)="dscSetSort('jabatan_fungsional')" class="dsc-sortable">Jabatan <span class="dsc-si">{{ dscSortIcon('jabatan_fungsional') }}</span></th>
                      <th (click)="dscSetSort('pendidikan_tertinggi')" class="dsc-sortable">Pend. <span class="dsc-si">{{ dscSortIcon('pendidikan_tertinggi') }}</span></th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let d of dscResults">
                      <td>
                        <div class="dsc-nama">{{ d.nama }}</div>
                        <div class="dsc-sub-id">
                          <span *ngIf="d.nidn">NIDN: {{ d.nidn }}</span>
                          <span *ngIf="d.nuptk">NUPTK: {{ d.nuptk }}</span>
                        </div>
                      </td>
                      <td>
                        <div class="dsc-pt-nama">{{ d.pt_nama }}</div>
                        <div class="dsc-prodi-kode">{{ d.pt_kode }}</div>
                      </td>
                      <td>
                        <div class="dsc-prodi-nama">{{ d.program_studi_nama }}</div>
                        <div class="dsc-prodi-kode">{{ d.kode_prodi }}</div>
                      </td>
                      <td><span [class]="dscJabatanClass(d.jabatan_fungsional)">{{ d.jabatan_fungsional || '—' }}</span></td>
                      <td>{{ d.pendidikan_tertinggi?.toUpperCase() }}</td>
                      <td><span class="dsc-status-chip" [class.aktif]="d.status==='Aktif'">{{ d.status }}</span></td>
                    </tr>
                    <tr *ngIf="!dscResults.length">
                      <td colspan="6" class="dsc-empty">Tidak ada hasil ditemukan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="dsc-pagination dsc-pagination--bottom" *ngIf="dscTotalPages > 1">
                <button [disabled]="dscPage===1" (click)="dscGoPage(dscPage-1)">‹ Prev</button>
                <span>{{ dscPage }} / {{ dscTotalPages }}</span>
                <button [disabled]="dscPage===dscTotalPages" (click)="dscGoPage(dscPage+1)">Next ›</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Accordion per periode -->
        <div class="accordion" *ngFor="let d of pt.data_dosen; let i = index"
             [class.accordion--open]="expandedDosen.has(i)">

          <!-- Accordion header -->
          <button class="accordion__header" (click)="toggleDosen(i)">
            <div class="accordion__title">
              <span class="acc-periode">{{ d.tahun_akademik }}</span>
              <span class="acc-sem-badge">{{ d.semester | titlecase }}</span>
              <span class="acc-prodi-count">{{ d.per_prodi?.length || 0 }} prodi</span>
            </div>
            <div class="accordion__stats">
              <span class="acc-stat"><span class="acc-stat-lbl">Tetap</span><strong>{{ d.dosen_tetap }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">Tdk Tetap</span><strong>{{ d.dosen_tidak_tetap }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">S3</span><strong>{{ d.dosen_s3 }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">S2</span><strong>{{ d.dosen_s2 }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">S1</span><strong>{{ d.dosen_s1 }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">Profesor</span><strong>{{ d.dosen_guru_besar }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">L.Kepala</span><strong>{{ d.dosen_lektor_kepala }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">Lektor</span><strong>{{ d.dosen_lektor }}</strong></span>
              <span class="acc-stat"><span class="acc-stat-lbl">Ast.Ahli</span><strong>{{ d.dosen_asisten_ahli }}</strong></span>
            </div>
            <span class="accordion__chevron">{{ expandedDosen.has(i) ? '▲' : '▼' }}</span>
          </button>

          <!-- Accordion body -->
          <div class="accordion__body" *ngIf="expandedDosen.has(i)">

            <!-- Toolbar: filter jenjang -->
            <div class="acc-toolbar">
              <div class="acc-toolbar__left">
                <label class="filter-label">Jenjang:</label>
                <select [(ngModel)]="filterDosenJenjang" class="filter-select">
                  <option value="">Semua</option>
                  <option *ngFor="let j of dosenJenjangOptions" [value]="j">{{ j }}</option>
                </select>
                <span class="filter-reset" *ngIf="filterDosenJenjang" (click)="filterDosenJenjang=''">✕</span>
                <span class="sub-info-inline" *ngIf="filterDosenJenjang">
                  {{ filteredProdi(d.per_prodi).length }}/{{ d.per_prodi?.length }} prodi
                </span>
              </div>
            </div>

            <!-- Tabel Rincian per Program Studi -->
            <div class="table-wrapper">
              <table class="data-table sub-table">
                <thead>
                  <tr>
                    <th>Perguruan Tinggi</th>
                    <th>Program Studi</th><th>Jenjang</th>
                    <th class="text-right">Tetap</th><th class="text-right">Tdk Tetap</th>
                    <th class="text-right">S3</th><th class="text-right">S2</th><th class="text-right">S1</th>
                    <th class="text-right">Profesor</th><th class="text-right">L.Kepala</th>
                    <th class="text-right">Lektor</th><th class="text-right">Ast.Ahli</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of filteredProdi(d.per_prodi)">
                    <td>
                      {{ p.pt_nama }}<br>
                      <code class="prodi-kode">{{ p.pt_kode }}</code>
                    </td>
                    <td>
                      {{ p.prodi_nama }}<br>
                      <code class="prodi-kode">{{ p.prodi_kode }}</code>
                    </td>
                    <td><span class="badge-jenjang">{{ p.prodi_jenjang }}</span></td>
                    <td class="text-right num-col">{{ p.dosen_tetap }}</td>
                    <td class="text-right num-col">{{ p.dosen_tidak_tetap }}</td>
                    <td class="text-right num-col">{{ p.dosen_s3 }}</td>
                    <td class="text-right num-col">{{ p.dosen_s2 }}</td>
                    <td class="text-right num-col">{{ p.dosen_s1 }}</td>
                    <td class="text-right num-col">{{ p.dosen_guru_besar }}</td>
                    <td class="text-right num-col">{{ p.dosen_lektor_kepala }}</td>
                    <td class="text-right num-col">{{ p.dosen_lektor }}</td>
                    <td class="text-right num-col">{{ p.dosen_asisten_ahli }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div><!-- /accordion__body -->
        </div><!-- /accordion -->
      </div>
    </div>
    <div class="loading-overlay" *ngIf="loading"><div class="spinner"></div></div>
  `,
  styles: [`
    .breadcrumb { font-size: 13px; color: #888; margin-bottom: 16px; }
    .breadcrumb a { color: #1a237e; text-decoration: none; }

    .detail-header { margin-bottom: 16px; }
    .header-main { display: flex; gap: 20px; align-items: flex-start; }
    .header-footer { border-top: 1px solid #f1f5f9; padding-top: 12px; margin-top: 12px; }
    .btn-download-pdf {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 8px 18px; font-size: 13px; font-weight: 600;
      background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5;
      border-radius: 8px; cursor: pointer; transition: background .15s;
    }
    .btn-download-pdf:hover { background: #fee2e2; }
    .pt-logo img { width: 80px; height: 80px; object-fit: contain; border-radius: 8px; border: 1px solid #eee; flex-shrink: 0; }
    .pt-logo.placeholder { font-size: 48px; width: 80px; text-align: center; flex-shrink: 0; }
    .pt-info { flex: 1; min-width: 0; }
    h1 { font-size: 20px; font-weight: 700; color: #1a237e; margin-bottom: 8px; }
    .pt-meta { font-size: 13px; color: #555; margin-bottom: 6px; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .pt-address { font-size: 13px; color: #666; margin-bottom: 6px; }
    .pt-contacts { display: flex; gap: 16px; font-size: 12px; color: #444; flex-wrap: wrap; }
    .pt-contacts a { color: #1a237e; text-decoration: none; }
    .pt-akreditasi-detail { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; }
    .akr-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
    .akr-lbl { color: #888; font-weight: 500; }
    .akr-val { color: #333; font-weight: 600; }
    .exp-pill {
      display: inline-block; padding: 3px 10px; border-radius: 6px;
      font-weight: 700; color: #111; font-size: 12px;
    }
    .exp-green  { background: #d4edda; }
    .exp-yellow { background: #fff3cd; }
    .exp-red    { background: #f8d7da; }

    .card { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .mb-16 { margin-bottom: 16px; }
    .badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; background: #f0f0f0; }
    .badge-muhammadiyah { background: #e3f2fd; color: #1565c0; }
    .badge-aisyiyah { background: #fce4ec; color: #c62828; }
    .badge-akr-unggul { background: #e6f4ea; color: #137333; }
    .badge-akr-baik_sekali { background: #e8f5e9; color: #2e7d32; }
    .badge-akr-baik { background: #fff8e1; color: #f57f17; }

    /* Tabs */
    .tabs-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 12px; }
    .tabs { display: flex; gap: 4px; min-width: max-content; }
    .tabs button {
      padding: 8px 16px; border: 1px solid #ddd; background: white;
      border-radius: 8px 8px 0 0; font-size: 13px; cursor: pointer; white-space: nowrap;
    }
    .tabs button.active { background: #1a237e; color: white; border-color: #1a237e; }

    .periode-label {
      font-size: 12px; color: #666; margin-bottom: 12px;
      padding: 6px 10px; background: #f0f4ff; border-radius: 6px; display: inline-block;
    }
    .btn-akr-update { margin-left: 6px; padding: 1px 5px; font-size: 11px; border: 1px solid #bbb; border-radius: 3px; background: #f8f8f8; color: #555; cursor: pointer; line-height: 1.4; vertical-align: middle; }
    .btn-akr-update:hover { background: #e8f0fe; border-color: #4f86c6; color: #2a5ab5; }
    /* ── Prodi table hover ─── */
    .prodi-row { cursor: pointer; }
    .prodi-row:hover td { background: #dbeafe !important; transition: background 0.15s; }

    /* ── Prodi detail modal ─── */
    .pmodal-box { max-width: 1000px; width: 95vw; max-height: 90vh; }
    .pmodal-header { background: #f4f5fb; border-bottom: 2px solid #1a237e; padding: 14px 18px; }
    .pmodal-title-wrap { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1; }
    .pmodal-nama { font-size: 16px; font-weight: 800; color: #1a237e; }
    .pmodal-kode { background: #e8eaf6; color: #1a237e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .pmodal-close { color: #555; }
    .pmodal-close:hover { color: #1a237e; background: #e8eaf6; }
    .jenjang-badge { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 12px; }
    .jenjang-s1 { background: #dbeafe; color: #1d4ed8; }
    .jenjang-s2 { background: #ede9fe; color: #6d28d9; }
    .jenjang-s3 { background: #fae8ff; color: #86198f; }
    .jenjang-d3 { background: #dcfce7; color: #15803d; }
    .jenjang-d4 { background: #d1fae5; color: #065f46; }
    .jenjang-d1, .jenjang-d2 { background: #f0fdf4; color: #166534; }
    .jenjang-profesi { background: #fff7ed; color: #c2410c; }
    .pmodal-body { padding: 0; }
    .pmodal-section { padding: 14px 18px; border-bottom: 1px solid #f0f0f0; }
    .pmodal-sec-title { font-size: 12px; font-weight: 700; color: #1a237e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .pmodal-period-lbl { font-weight: 400; color: #666; text-transform: none; letter-spacing: 0; }
    .pmodal-akr-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .pmodal-akr-sk { font-size: 12px; color: #555; }
    .pmodal-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .pmodal-stat { background: #f8f9fc; border-radius: 8px; padding: 10px 8px; text-align: center; }
    .pmodal-stat--hl { background: #1a237e; }
    .pmodal-stat--hl .pmodal-val { color: #fff; }
    .pmodal-stat--hl .pmodal-lbl { color: rgba(255,255,255,0.75); }
    .pmodal-val { font-size: 20px; font-weight: 700; color: #1a237e; }
    .pmodal-lbl { font-size: 10px; color: #666; margin-top: 3px; }
    .pmodal-chart-wrap { position: relative; height: 200px; }
    .pmodal-tbl-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .pmodal-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .pmodal-table th { background: #f8f9fa; padding: 7px 10px; text-align: left; border-bottom: 2px solid #e9ecef; white-space: nowrap; font-weight: 600; color: #555; }
    .pmodal-table th.num, .pmodal-table td.num { text-align: right; }
    .pmodal-table td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
    .pmodal-table tr:nth-child(even) td { background: #fafbff; }
    .pmodal-table tr:first-child td { background: #eff6ff; font-weight: 600; }
    .pmodal-table .bold { font-weight: 700; color: #1a237e; }
    .pmodal-nodata { padding: 24px; text-align: center; color: #aaa; font-size: 13px; }

    @media (max-width: 600px) {
      .pmodal-stats { grid-template-columns: repeat(3, 1fr); }
      .pmodal-val { font-size: 16px; }
      .pmodal-chart-wrap { height: 160px; }
    }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .modal-box { background: #fff; border-radius: 10px; width: 92vw; max-width: 860px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 8px 40px rgba(0,0,0,.25); overflow: hidden; }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: #f4f5fb; border-bottom: 1px solid #e2e6f0; font-size: 14px; }
    .modal-close { background: none; border: none; font-size: 16px; cursor: pointer; color: #888; padding: 2px 6px; }
    .modal-close:hover { color: #333; }
    .modal-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
    .modal-loading, .modal-empty { color: #888; font-size: 13px; padding: 20px 0; text-align: center; }
    .akr-result-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .akr-result-table th { background: #f4f5fb; padding: 7px 10px; text-align: left; border-bottom: 2px solid #e2e6f0; white-space: nowrap; }
    .akr-result-table td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
    .akr-result-table tr:hover td { background: #f8f9fc; }
    .akr-row-selected td { background: #eef4ff !important; }
    .btn-pilih { padding: 3px 10px; font-size: 11px; border: 1px solid #4f86c6; border-radius: 4px; background: #fff; color: #4f86c6; cursor: pointer; }
    .btn-pilih:hover { background: #4f86c6; color: #fff; }
    .modal-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid #e2e6f0; background: #fafbff; gap: 12px; }
    .akr-selected-info { font-size: 13px; color: #333; }
    .btn-simpan { padding: 7px 22px; background: #2a9d8f; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-simpan:hover:not(:disabled) { background: #21867a; }
    .btn-simpan:disabled { opacity: .6; cursor: default; }
    .sim-bar-wrap { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
    .sim-bar { height: 6px; border-radius: 3px; min-width: 2px; transition: width .3s; }
    .sim-high { background: #2a9d8f; }
    .sim-med  { background: #f4a261; }
    .sim-low  { background: #e0e0e0; }
    .sim-pct  { font-size: 11px; font-weight: 600; color: #555; white-space: nowrap; }
    .sim-namapt { font-size: 10px; color: #888; }
    .akr-expiry-notices { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .akr-expiry-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; border-radius: 6px; font-size: 13px; border-left: 4px solid; transition: filter .15s; }
    .akr-expiry-item:hover { filter: brightness(.96); }
    .akr-red    { background: #fff0f0; border-color: #e53e3e; color: #7b1a1a; }
    .akr-yellow { background: #fffbea; border-color: #d69e2e; color: #7b5a00; }
    .akr-expiry-icon { font-size: 16px; line-height: 1.4; flex-shrink: 0; }
    .akr-expiry-text { line-height: 1.5; flex: 1; }
    .akr-expiry-action { font-weight: 600; white-space: nowrap; opacity: .7; align-self: center; }
    .prodi-kode { background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 10px; color: #555; }
    .filter-select-exp { background: #fff7ed !important; border-color: #fb923c !important; color: #92400e !important; }
    .prodi-filter-bar { display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .filter-group { display: flex; align-items: center; gap: 6px; }
    .prodi-charts-row { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 18px; }
    .prodi-chart-card { background: #f8f9fc; border: 1px solid #e8eaf0; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; }
    .prodi-chart-card--wide { grid-column: span 1; }
    .prodi-chart-title { font-size: 12px; font-weight: 600; color: #555; margin-bottom: 10px; text-align: center; letter-spacing: 0.3px; }
    .prodi-chart-wrap { position: relative; flex: 1; display: flex; align-items: center; justify-content: center; max-height: 220px; }
    .prodi-chart-wrap--bar { max-height: none; overflow-y: auto; }
    .sk-col   { font-size: 11px; color: #555; max-width: 160px; word-break: break-all; }
    .exp-col  { white-space: nowrap; }
    .mhs-col  { font-weight: 600; color: #1a237e; }
    .aktif-col { font-weight: 700; color: #1a237e; }

    /* Filter prodi mahasiswa */
    .prodi-filter-wrap { border: 1px solid #e2e6f0; border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
    .prodi-filter-header {
      display: flex; align-items: center; gap: 8px; padding: 9px 14px;
      background: #f4f5fb; cursor: pointer; user-select: none;
    }
    .prodi-filter-header:hover { background: #eaecf8; }
    .pf-title { font-size: 13px; font-weight: 600; color: #1a237e; flex: 1; }
    .pf-count { font-size: 12px; color: #666; white-space: nowrap; }
    .pf-all, .pf-none {
      padding: 2px 8px; border-radius: 5px; font-size: 11px; cursor: pointer; border: 1px solid;
    }
    .pf-all  { background: #e8ecf8; color: #1a237e; border-color: #9fa8da; }
    .pf-none { background: #fce8e6; color: #c5221f; border-color: #ef9a9a; }
    .pf-chevron { font-size: 11px; color: #888; }
    .mhs-mode-toggle {
      display: flex; border: 1px solid #9fa8da; border-radius: 6px; overflow: hidden;
    }
    .mhs-mode-btn {
      padding: 2px 10px; font-size: 11px; font-weight: 600; cursor: pointer;
      border: none; background: #f4f5fb; color: #666; transition: background 0.15s, color 0.15s;
    }
    .mhs-mode-btn.active { background: #1a237e; color: #fff; }
    .mhs-mode-btn:not(.active):hover { background: #e8ecf8; color: #1a237e; }
    .prodi-checklist {
      max-height: 220px; overflow-y: auto; padding: 8px 12px;
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 2px;
      border-top: 1px solid #e2e6f0; background: white;
    }
    .prodi-check-item {
      display: flex; align-items: center; gap: 6px; padding: 4px 6px;
      border-radius: 4px; cursor: pointer; font-size: 12px;
    }
    .prodi-check-item:hover { background: #f0f4ff; }
    .prodi-check-item input { flex-shrink: 0; cursor: pointer; accent-color: #1a237e; }
    .prodi-check-name { flex: 1; color: #333; }
    .prodi-check-jenjang { font-size: 10px; color: #999; white-space: nowrap; }
    .no-data  { color: #bbb; font-weight: 400; }
    .tab-note { font-size: 12px; color: #888; margin-bottom: 14px; font-style: italic; }
    .no-data-msg { text-align: center; color: #aaa; font-size: 13px; padding: 24px 0; }

    /* Chart */
    .chart-container {
      position: relative; height: 360px;
      margin-bottom: 20px;
    }

    /* Table */
    .table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { padding: 10px 12px; background: #f8f9fa; text-align: left; font-weight: 600; color: #555; border-bottom: 2px solid #e9ecef; white-space: nowrap; }
    th.th-sort { cursor: pointer; user-select: none; }
    th.th-sort:hover { background: #eef0f3; color: #1e293b; }
    .si { font-size: .75rem; opacity: .55; margin-left: 3px; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .text-right { text-align: right; }

    /* ── Accordion ─────────────────────────────── */
    .dosen-card { padding: 16px; }
    .accordion {
      border: 1px solid #e2e6f0; border-radius: 10px;
      margin-bottom: 10px; overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .accordion--open { border-color: #9fa8da; box-shadow: 0 2px 8px rgba(26,35,126,0.1); }

    .accordion__header {
      width: 100%; display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; background: #f8f9fa; border: none; cursor: pointer;
      text-align: left; transition: background 0.15s;
    }
    .accordion--open .accordion__header { background: #e8ecf8; }
    .accordion__header:hover { background: #eef0f8; }

    .accordion__title { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .acc-periode { font-weight: 700; font-size: 14px; color: #1a237e; }
    .acc-sem-badge {
      padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600;
      background: #1a237e; color: white;
    }
    .acc-prodi-count { font-size: 11px; color: #888; white-space: nowrap; }

    .accordion__stats {
      display: flex; flex-wrap: wrap; gap: 6px 14px; flex: 1;
      justify-content: flex-start; padding: 0 8px;
    }
    .acc-stat { display: flex; flex-direction: column; align-items: center; min-width: 40px; }
    .acc-stat-lbl { font-size: 10px; color: #999; }
    .acc-stat strong { font-size: 13px; color: #1a237e; }
    .accordion__chevron { font-size: 11px; color: #1a237e; flex-shrink: 0; margin-left: auto; }

    /* ── Accordion body ─────────────────────────── */
    .accordion__body { border-top: 1px solid #e2e6f0; }

    /* Toolbar */
    .acc-toolbar {
      display: flex; flex-wrap: wrap; align-items: center;
      gap: 10px 20px; padding: 10px 16px;
      background: #f4f5fb; border-bottom: 1px solid #e2e6f0;
    }
    .acc-toolbar__left { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .acc-toolbar__right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: 1; }
    .filter-label { font-size: 12px; color: #555; font-weight: 500; white-space: nowrap; }
    .filter-select { padding: 5px 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; background: white; }
    .filter-reset {
      font-size: 11px; color: #c5221f; cursor: pointer;
      padding: 3px 7px; border-radius: 5px; background: #fce8e6;
    }
    .filter-reset:hover { background: #fad2cf; }
    .sub-info-inline { font-size: 11px; color: #888; }
    .toggle-label { font-size: 11px; color: #666; font-weight: 500; white-space: nowrap; }
    .ds-toggle {
      padding: 3px 9px; border-radius: 20px; font-size: 11px; font-weight: 500;
      cursor: pointer; border: 1.5px solid var(--ds-color);
      background: white; color: var(--ds-color);
      transition: background 0.15s, color 0.15s;
    }
    .ds-toggle.active { background: var(--ds-color); color: white; }

    /* Chart */
    .acc-chart-wrap { position: relative; padding: 12px 16px; background: #fafbff; }

    /* Sub-accordion (grafik / tabel) */
    .sub-acc { border-top: 1px solid #e2e6f0; }
    .sub-acc__header {
      width: 100%; display: flex; justify-content: space-between; align-items: center;
      padding: 9px 16px; background: #f0f2fa; border: none; cursor: pointer;
      font-size: 13px; font-weight: 600; color: #1a237e; text-align: left;
      transition: background 0.15s;
    }
    .sub-acc__header:hover { background: #e3e7f5; }
    .sub-acc--open .sub-acc__header { background: #dde2f5; }
    .sub-acc__chevron { font-size: 11px; color: #1a237e; }
    .sub-acc__body { background: white; }
    .sub-table th { background: #f0f4ff; font-size: 12px; padding: 8px 12px; }
    .sub-table td { font-size: 12px; padding: 7px 12px; }
    .sub-table tr:hover td { background: rgba(26,35,126,.06); transition: background .15s; }
    .num-col { color: #333; }

    /* ── Dosen Search Accordion (biru) ── */
    .dsc-accordion {
      background: #fff; border-radius: 10px; margin-bottom: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,.07);
      border-left: 4px solid #1d4ed8;
    }
    .dsc-toggle {
      width: 100%; display: flex; align-items: center; gap: .6rem;
      background: none; border: none; padding: .75rem 1rem;
      font-size: .875rem; font-weight: 600; color: #1e3a8a; cursor: pointer;
      text-align: left; border-radius: 10px;
    }
    .dsc-toggle:hover { background: rgba(59,130,246,.05); }
    .dsc-chevron { margin-left: auto; font-size: .82rem; color: #2563eb; transition: transform .2s; }
    .dsc-chevron.rotated { transform: rotate(180deg); }
    .dsc-body { padding: 0 1rem 1rem; }
    .dsc-fields {
      display: grid; grid-template-columns: 1fr; gap: .65rem; margin-bottom: .85rem;
    }
    @media (min-width: 600px)  { .dsc-fields { grid-template-columns: 1fr 1fr; } }
    @media (min-width: 1024px) { .dsc-fields { grid-template-columns: repeat(5, 1fr); } }
    .dscf { display: flex; flex-direction: column; gap: .25rem; }
    .dscf label { font-size: .75rem; font-weight: 600; color: #1e40af; }
    .dscf input, .dscf select {
      padding: .45rem .7rem; border: 1px solid #93c5fd; border-radius: 7px;
      font-size: .82rem; outline: none; background: #eff6ff;
    }
    .dscf input:focus, .dscf select:focus { border-color: #1d4ed8; box-shadow: 0 0 0 2px rgba(29,78,216,.1); }
    .dscf--action { justify-content: flex-end; flex-direction: row; align-items: flex-end; gap: .4rem; }
    .dsc-btn-search {
      padding: .45rem 1.1rem; background: #1d4ed8; color: #fff;
      border: none; border-radius: 7px; font-size: .82rem; font-weight: 600; cursor: pointer;
    }
    .dsc-btn-search:hover:not(:disabled) { background: #1e3a8a; }
    .dsc-btn-search:disabled { opacity: .5; cursor: not-allowed; }
    .dsc-btn-reset {
      padding: .45rem .9rem; background: #eff6ff; color: #1e40af;
      border: 1px solid #93c5fd; border-radius: 7px; font-size: .82rem; cursor: pointer;
    }
    .dsc-btn-reset:hover { background: #dbeafe; }
    .dsc-results { margin-top: .4rem; }
    .dsc-results__header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: .4rem; margin-bottom: .4rem;
    }
    .dsc-actions { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; }
    .dsc-results__info { font-size: .78rem; color: #1e40af; }
    .dsc-results__info strong { color: #1e3a8a; }
    .dsc-pagination {
      display: flex; align-items: center; gap: .5rem; font-size: .78rem;
    }
    .dsc-pagination--bottom { justify-content: center; margin-top: .5rem; }
    .dsc-pagination button {
      padding: .25rem .7rem; border: 1px solid #93c5fd;
      border-radius: 6px; background: #eff6ff; cursor: pointer; color: #1e40af;
    }
    .dsc-pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .dsc-pagination button:hover:not(:disabled) { background: #dbeafe; }
    .dsc-export-btns { display: flex; gap: .3rem; }
    .dsc-exp {
      padding: .22rem .6rem; border-radius: 5px; font-size: .72rem;
      font-weight: 600; cursor: pointer; border: 1px solid;
    }
    .dsc-exp--csv  { background: #f0fdf4; color: #166534; border-color: #86efac; }
    .dsc-exp--csv:hover  { background: #dcfce7; }
    .dsc-exp--xlsx { background: #f0fdf4; color: #15803d; border-color: #4ade80; }
    .dsc-exp--xlsx:hover { background: #bbf7d0; }
    .dsc-table-wrap { overflow-x: auto; border-radius: 8px; background: rgba(59,130,246,.03); }
    .dsc-table { width: 100%; border-collapse: collapse; font-size: .8rem; }
    .dsc-table th {
      background: rgba(59,130,246,.07); padding: .5rem .7rem;
      text-align: left; font-weight: 600; color: #1e40af;
      border-bottom: 2px solid rgba(59,130,246,.13); white-space: nowrap;
    }
    .dsc-table th.dsc-sortable { cursor: pointer; user-select: none; }
    .dsc-table th.dsc-sortable:hover { background: rgba(59,130,246,.13); }
    .dsc-si { font-size: .68rem; color: #93c5fd; margin-left: .15rem; }
    .dsc-table td {
      padding: .45rem .7rem; border-bottom: 1px solid rgba(59,130,246,.07);
      color: #1e293b; vertical-align: middle;
    }
    .dsc-table tr:hover td { background: rgba(59,130,246,.06); transition: background .15s; }
    .dsc-nama { font-weight: 500; color: #1e293b; }
    .dsc-sub-id { font-family: monospace; font-size: .68rem; color: #64748b; margin-top: 1px; display: flex; flex-wrap: wrap; gap: .35rem; }
    .dsc-pt-nama { font-size: .8rem; font-weight: 500; color: #1e293b; }
    .dsc-prodi-nama { font-size: .8rem; }
    .dsc-prodi-kode { font-size: .68rem; color: #64748b; font-family: monospace; margin-top: 1px; }
    .dsc-empty { text-align: center; color: #94a3b8; padding: 1.25rem; }
    .dsc-jabatan-chip {
      display: inline-block; padding: .18rem .5rem;
      border-radius: 20px; font-size: .72rem; font-weight: 600;
      background: #f1f5f9; color: #475569;
    }
    .dsc-jabatan-chip--profesor      { background: #fef9c3; color: #854d0e; }
    .dsc-jabatan-chip--lektor-kepala { background: #dbeafe; color: #1e40af; }
    .dsc-jabatan-chip--lektor        { background: #e0f2fe; color: #0369a1; }
    .dsc-jabatan-chip--asisten-ahli  { background: #f0fdf4; color: #166534; }
    .dsc-status-chip {
      display: inline-block; padding: .18rem .5rem;
      border-radius: 20px; font-size: .72rem;
      background: #f1f5f9; color: #64748b;
    }
    .dsc-status-chip.aktif { background: #dcfce7; color: #166534; }
    .badge-jenjang { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; background: #f0f0f0; color: #555; white-space: nowrap; }

    .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; }
    .spinner { width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #1a237e; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Base mobile styles ─── */
    .header-main { flex-direction: column; gap: 12px; }
    .pt-logo img, .pt-logo.placeholder { width: 60px; height: 60px; font-size: 36px; }
    h1 { font-size: 16px; }
    .card { padding: 12px; }
    th, td { padding: 8px 10px; font-size: 12px; }
    .chart-container { height: 180px; }
    .prodi-checklist { grid-template-columns: 1fr; }
    .acc-toolbar { flex-direction: column; align-items: flex-start; gap: 8px; }
    .acc-toolbar__right { width: 100%; }
    .prodi-filter-bar { flex-direction: column; align-items: flex-start; }
    .tab-nav { overflow-x: auto; -webkit-overflow-scrolling: touch; white-space: nowrap; flex-wrap: nowrap; }
    .prodi-chart-card { padding: 10px 12px; }

    /* ── Tablet ≥ 600px ─── */
    @media (min-width: 600px) {
      .chart-container { height: 240px; }
      .prodi-charts-row { grid-template-columns: 1fr 1fr; }
      .prodi-checklist { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
    }

    /* ── Desktop ≥ 1024px ─── */
    @media (min-width: 1024px) {
      .header-main { flex-direction: row; gap: 20px; }
      .pt-logo img, .pt-logo.placeholder { width: 80px; height: 80px; font-size: 48px; }
      h1 { font-size: 20px; }
      .card { padding: 20px; }
      th, td { padding: 10px 12px; font-size: 13px; }
      .chart-container { height: 360px; }
      .prodi-charts-row { grid-template-columns: 1fr 1fr 2fr; }
      .prodi-checklist { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
      .acc-toolbar { flex-direction: row; align-items: center; }
      .acc-toolbar__right { width: auto; }
      .prodi-filter-bar { flex-direction: row; align-items: center; }
      .prodi-chart-card { padding: 14px 16px; }
    }
  `]
})
export class PerguruanTinggiDetailComponent implements OnInit, AfterViewChecked {
  @ViewChild('mhsChart')            mhsChartRef!:            ElementRef<HTMLCanvasElement>;
  @ViewChild('prodiJenjangChart')   prodiJenjangChartRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('prodiAkrChart')       prodiAkrChartRef!:       ElementRef<HTMLCanvasElement>;
  @ViewChild('prodiMhsChart')       prodiMhsChartRef!:       ElementRef<HTMLCanvasElement>;
  @ViewChild('prodiMhsLineChart')   prodiMhsLineChartRef!:   ElementRef<HTMLCanvasElement>;

  pt: any;
  loading = true;
  tab = 'prodi';
  expandedDosen = new Set<number>();
  private dosenSubView = new Map<number, 'chart' | 'table' | null>();

  // ── Dosen Search (per PT) ──
  dscOpen     = false;
  dscSearching = false;
  dscDone     = false;
  dscTotal    = 0;
  dscPage     = 1;
  dscTotalPages = 1;
  dscResults: any[] = [];
  dscForm = { nama: '', jabatan: '', pendidikan: '', status: '' };
  dscSortField = 'nama';
  dscSortDir   = 'asc';

  runDscSearch(page = 1) {
    this.dscSearching = true;
    this.dscPage = page;
    const ordering = (this.dscSortDir === 'desc' ? '-' : '') + this.dscSortField;
    const params = { ...this.dscForm, pt_kode: this.pt?.kode_pt || '', page: String(page), ordering };
    this.api.dosenSearch(params).subscribe({
      next: (res: any) => {
        this.dscResults     = res.results;
        this.dscTotal       = res.total;
        this.dscTotalPages  = Math.ceil(res.total / res.page_size);
        this.dscDone        = true;
        this.dscSearching   = false;
      },
      error: () => { this.dscSearching = false; }
    });
  }

  dscGoPage(p: number) { this.runDscSearch(p); }

  resetDscSearch() {
    this.dscForm      = { nama: '', jabatan: '', pendidikan: '', status: '' };
    this.dscDone      = false;
    this.dscResults   = [];
    this.dscTotal     = 0;
    this.dscPage      = 1;
    this.dscSortField = 'nama';
    this.dscSortDir   = 'asc';
  }

  dscSetSort(field: string) {
    if (this.dscSortField === field) { this.dscSortDir = this.dscSortDir === 'asc' ? 'desc' : 'asc'; }
    else { this.dscSortField = field; this.dscSortDir = 'asc'; }
    this.runDscSearch(1);
  }

  dscSortIcon(field: string): string {
    if (this.dscSortField !== field) return '⇅';
    return this.dscSortDir === 'asc' ? '▲' : '▼';
  }

  dscJabatanClass(jabatan: string): string {
    const map: {[k: string]: string} = {
      'Profesor':       'dsc-jabatan-chip dsc-jabatan-chip--profesor',
      'Lektor Kepala':  'dsc-jabatan-chip dsc-jabatan-chip--lektor-kepala',
      'Lektor':         'dsc-jabatan-chip dsc-jabatan-chip--lektor',
      'Asisten Ahli':   'dsc-jabatan-chip dsc-jabatan-chip--asisten-ahli',
    };
    return map[jabatan] || 'dsc-jabatan-chip';
  }

  exportDsc(fmt: 'csv' | 'xlsx') {
    const ordering = (this.dscSortDir === 'desc' ? '-' : '') + this.dscSortField;
    const params = { ...this.dscForm, pt_kode: this.pt?.kode_pt || '', page: '1', page_size: String(this.dscTotal || 5000), ordering };
    this.api.dosenSearch(params).subscribe({ next: (res: any) => this.doDscExport(fmt, res.results) });
  }

  private doDscExport(fmt: 'csv' | 'xlsx', rows: any[]) {
    const headers = ['Nama', 'NIDN', 'NUPTK', 'Program Studi', 'Kode Prodi', 'Jabatan', 'Pendidikan', 'Status'];
    const data = rows.map((d: any) => [
      d.nama, d.nidn || '—', d.nuptk || '—',
      d.program_studi_nama, d.kode_prodi || '—',
      d.jabatan_fungsional || '—', (d.pendidikan_tertinggi || '').toUpperCase(), d.status,
    ]);
    const ptLabel = this.pt?.singkatan || this.pt?.kode_pt || 'pt';
    const filename = `dosen-${ptLabel}`;

    if (fmt === 'csv') {
      const lines = [headers, ...data].map(row =>
        row.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      );
      const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      ws['!cols'] = [28, 14, 16, 28, 10, 18, 12, 14].map(w => ({ wch: w }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dosen');
      XLSX.writeFile(wb, `${filename}.xlsx`);
    }
  }

  subView(i: number): 'chart' | 'table' | null {
    return this.dosenSubView.has(i) ? this.dosenSubView.get(i)! : 'chart';
  }

  setSubView(i: number, view: 'chart' | 'table') {
    const current = this.subView(i);
    if (current === view) {
      // Toggle: tutup jika sudah terbuka
      this.dosenSubView.set(i, null);
      if (view === 'chart') {
        const c = this.dosenCharts.get(i);
        if (c) { c.destroy(); this.dosenCharts.delete(i); }
      }
    } else {
      this.dosenSubView.set(i, view);
      if (view === 'chart') {
        setTimeout(() => this.renderDosenChart(i), 50);
      }
    }
  }
  // Filter & Sort Program Studi
  filterProdiJenjang    = '';
  filterProdiAkreditasi = '';
  filterProdiExp        = '';
  prodiSortKey = 'mahasiswa_aktif_periode';
  prodiSortAsc = false;

  akrModal: {
    open: boolean; prodi: ProgramStudi | null;
    loading: boolean; results: any[]; selected: any; saving: boolean;
  } = { open: false, prodi: null, loading: false, results: [], selected: null, saving: false };

  openAkrModal(p: ProgramStudi) {
    this.akrModal = { open: true, prodi: p, loading: true, results: [], selected: null, saving: false };
    this.api.banptProdiSearch(p.nama, p.jenjang_display).subscribe({
      next: r => { this.akrModal.results = r; this.akrModal.loading = false; },
      error: ()  => { this.akrModal.loading = false; }
    });
  }

  closeAkrModal() {
    this.akrModal.open = false;
  }

  prodiModal: {
    open: boolean;
    prodi: ProgramStudi | null;
    mhsData: any[];
    dosenData: any[];
    dosenPeriode: any | null;
  } = { open: false, prodi: null, mhsData: [], dosenData: [], dosenPeriode: null };

  openProdiModal(p: ProgramStudi): void {
    // Tentukan periode aktif: cari entry yang nilai mahasiswa_aktif-nya = mahasiswa_aktif_periode prodi
    const periodeAktifKey = (() => {
      if (!p.mahasiswa_aktif_periode) return null;
      const match = (this.pt?.data_mahasiswa || []).find((period: any) => {
        const row = (period.per_prodi || []).find((r: any) => r.prodi_id === p.id);
        return row && row.mahasiswa_aktif === p.mahasiswa_aktif_periode;
      });
      return match ? `${match.tahun_akademik}|${match.semester}` : null;
    })();

    // Cari data per-prodi dari pt.data_mahasiswa (sudah dimuat)
    const mhsData = (this.pt?.data_mahasiswa || []).map((period: any) => {
      const row = (period.per_prodi || []).find((r: any) => r.prodi_id === p.id);
      if (!row) return null;
      const key = `${period.tahun_akademik}|${period.semester}`;
      return { tahun_akademik: period.tahun_akademik, semester: period.semester, ...row, _isAktif: key === periodeAktifKey };
    }).filter(Boolean);

    // Cari data per-prodi dari pt.data_dosen (sudah dimuat)
    const dosenData = (this.pt?.data_dosen || []).map((period: any) => {
      const row = (period.per_prodi || []).find((r: any) => r.prodi_id === p.id);
      return row ? { tahun_akademik: period.tahun_akademik, semester: period.semester, ...row } : null;
    }).filter(Boolean);

    // Periode aktif = entry pertama (sudah diurut -tahun_akademik,semester)
    const dosenPeriode = dosenData[0] ?? null;

    this.prodiMhsLineChart?.destroy();
    this.prodiMhsLineChart = null;
    this.prodiMhsLineChartReady = false;
    this.prodiModal = { open: true, prodi: p, mhsData, dosenData, dosenPeriode };
  }

  private renderProdiMhsLineChart(): void {
    if (!this.prodiMhsLineChartRef) return;
    this.prodiMhsLineChart?.destroy();

    // Urutkan kronologis: tahun ASC, dalam tahun sama ganjil dulu baru genap
    const semOrd = (s: string) => s === 'ganjil' ? 0 : 1;
    const sorted = [...this.prodiModal.mhsData].sort((a: any, b: any) => {
      if (a.tahun_akademik < b.tahun_akademik) return -1;
      if (a.tahun_akademik > b.tahun_akademik) return 1;
      return semOrd(a.semester) - semOrd(b.semester);
    });
    const data = sorted.slice(-12); // 12 semester terbaru
    const labels = data.map((r: any) => `${r.tahun_akademik}\n${(r.semester as string).charAt(0).toUpperCase() + (r.semester as string).slice(1)}`);
    const values = data.map((r: any) => r.mahasiswa_aktif);

    // Highlight titik periode aktif
    const pointColors = data.map((r: any) => r._isAktif ? '#e53935' : '#1a237e');
    const pointRadius = data.map((r: any) => r._isAktif ? 7 : 4);
    const pointHover  = data.map((r: any) => r._isAktif ? 9 : 6);

    setTimeout(() => {
      if (!this.prodiMhsLineChartRef) return;
      this.prodiMhsLineChart = new Chart(this.prodiMhsLineChartRef.nativeElement.getContext('2d')!, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Mahasiswa Aktif',
            data: values,
            borderColor: '#1a237e',
            backgroundColor: 'rgba(26,35,126,0.08)',
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: pointColors,
            pointRadius,
            pointHoverRadius: pointHover,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (c: any) => ` ${(c.parsed.y as number).toLocaleString('id-ID')} mahasiswa`,
                afterLabel: (c: any) => data[c.dataIndex]?._isAktif ? '★ Periode Aktif' : '',
              }
            }
          },
          scales: {
            x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 10 } } },
            y: { beginAtZero: false, grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } }
          }
        }
      });
    }, 30);
  }

  closeProdiModal(): void {
    this.prodiMhsLineChart?.destroy();
    this.prodiMhsLineChart = null;
    this.prodiMhsLineChartReady = false;
    this.prodiModal.open = false;
  }

  simpanAkreditasi() {
    const { prodi, selected } = this.akrModal;
    if (!prodi || !selected) return;
    this.akrModal.saving = true;

    const akrMap: Record<string, string> = {
      'Unggul':'unggul','A':'a','Baik Sekali':'baik_sekali','B':'b','Baik':'baik','C':'c','Tidak Terakreditasi':'tidak'
    };
    const payload: any = {
      akreditasi: akrMap[selected.peringkat] ?? selected.peringkat.toLowerCase(),
      no_sk_akreditasi: selected.nomor_sk,
      tanggal_kedaluarsa_akreditasi: selected.tgl_expired || null,
    };

    this.api.updateProgramStudi(prodi.id, payload).subscribe({
      next: updated => {
        Object.assign(prodi, {
          akreditasi: updated.akreditasi,
          akreditasi_display: updated.akreditasi_display,
          no_sk_akreditasi: updated.no_sk_akreditasi,
          tanggal_kedaluarsa_akreditasi: updated.tanggal_kedaluarsa_akreditasi,
        });
        this.buildProdiChartData();
        this.akrModal.open = false;
      },
      error: () => { this.akrModal.saving = false; }
    });
  }

  get prodiJenjangOptions(): string[] {
    const s = new Set<string>();
    for (const p of this.pt?.program_studi || []) if (p.jenjang_display) s.add(p.jenjang_display);
    return Array.from(s).sort();
  }

  get prodiAkreditasiOptions(): string[] {
    const s = new Set<string>();
    for (const p of this.pt?.program_studi || []) if (p.akreditasi_display) s.add(p.akreditasi_display);
    return Array.from(s).sort();
  }

  get prodiExpRed(): ProgramStudi[] {
    const now = new Date();
    const limit = new Date(now); limit.setMonth(limit.getMonth() + 7);
    return (this.pt?.program_studi || []).filter((p: ProgramStudi) =>
      p.tanggal_kedaluarsa_akreditasi && new Date(p.tanggal_kedaluarsa_akreditasi) <= limit
    );
  }

  get prodiExpYellow(): ProgramStudi[] {
    const now = new Date();
    const limit7m  = new Date(now); limit7m.setMonth(limit7m.getMonth() + 7);
    const limit12m = new Date(now); limit12m.setMonth(limit12m.getMonth() + 12);
    return (this.pt?.program_studi || []).filter((p: ProgramStudi) =>
      p.tanggal_kedaluarsa_akreditasi &&
      new Date(p.tanggal_kedaluarsa_akreditasi) > limit7m &&
      new Date(p.tanggal_kedaluarsa_akreditasi) <= limit12m
    );
  }

  setProdiExpFilter(val: string) { this.filterProdiExp = val; }

  get filteredProgramStudi(): ProgramStudi[] {
    const now = new Date();
    const list = (this.pt?.program_studi || []).filter((p: ProgramStudi) => {
      if (this.filterProdiJenjang    && p.jenjang_display    !== this.filterProdiJenjang)    return false;
      if (this.filterProdiAkreditasi && p.akreditasi_display !== this.filterProdiAkreditasi) return false;
      if (this.filterProdiExp && p.tanggal_kedaluarsa_akreditasi) {
        const days = Math.ceil((new Date(p.tanggal_kedaluarsa_akreditasi).getTime() - now.getTime()) / 86400000);
        if (this.filterProdiExp === 'less_7m'  && days > 210) return false;
        if (this.filterProdiExp === 'less_12m' && days > 365) return false;
      } else if (this.filterProdiExp) {
        return false; // tidak ada tanggal exp → tidak masuk filter kedaluarsa
      }
      return true;
    });
    const key = this.prodiSortKey as keyof ProgramStudi;
    const dir = this.prodiSortAsc ? 1 : -1;
    return [...list].sort((a: any, b: any) => {
      const av = a[key] ?? '', bv = b[key] ?? '';
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }

  setProdiSort(key: string) {
    if (this.prodiSortKey === key) { this.prodiSortAsc = !this.prodiSortAsc; }
    else { this.prodiSortKey = key; this.prodiSortAsc = key !== 'mahasiswa_aktif_periode'; }
  }

  prodiSi(key: string): string {
    if (this.prodiSortKey !== key) return '↕';
    return this.prodiSortAsc ? '↑' : '↓';
  }

  // Filter Dosen Jenjang
  private _filterDosenJenjang = '';
  get filterDosenJenjang() { return this._filterDosenJenjang; }
  set filterDosenJenjang(v: string) {
    this._filterDosenJenjang = v;
    setTimeout(() => this.rerenderAllDosenCharts(), 0);
  }
  private dosenCharts = new Map<number, Chart>();
  private chart: Chart | null = null;
  private chartRendered = false;
  private prodiJenjangChart: Chart | null = null;
  private prodiAkrChart: Chart | null = null;
  private prodiMhsChart: Chart | null = null;
  private prodiMhsLineChart: Chart | null = null;
  private prodiMhsLineChartReady = false;

  // Data chart prodi — dihitung sekali saat data load, tidak dipengaruhi filter
  private prodiChartData: {
    jLabels: string[]; jData: number[];
    aLabels: string[]; aData: number[]; aColors: string[];
    mLabels: string[]; mData: number[]; mColors: string[];
  } | null = null;


  /** Hasilkan warna degradasi satu hue: nilai besar → gelap, nilai kecil → terang */
  private gradientColors(values: number[], hue: number, sat = 55): string[] {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;
    return values.map(v => {
      const t = (v - min) / range;           // 0 = terkecil, 1 = terbesar
      const l = Math.round(72 - t * 38);     // 72% (terang) → 34% (gelap)
      return `hsl(${hue},${sat}%,${l}%)`;
    });
  }

  private buildProdiChartData() {
    const prodi: ProgramStudi[] = this.pt?.program_studi || [];

    const jMap = new Map<string, number>();
    const aMap = new Map<string, number>();
    for (const p of prodi) {
      jMap.set(p.jenjang_display    || 'Lainnya', (jMap.get(p.jenjang_display    || 'Lainnya') ?? 0) + 1);
      aMap.set(p.akreditasi_display || 'Belum',   (aMap.get(p.akreditasi_display || 'Belum')   ?? 0) + 1);
    }

    const jLabels = Array.from(jMap.keys());
    const aLabels = Array.from(aMap.keys());
    const jData   = jLabels.map(k => jMap.get(k)!);
    const aData   = aLabels.map(k => aMap.get(k)!);

    const mhsProdi = [...prodi]
      .filter(p => (p.mahasiswa_aktif_periode ?? 0) > 0)
      .sort((a, b) => (b.mahasiswa_aktif_periode ?? 0) - (a.mahasiswa_aktif_periode ?? 0))
      .slice(0, 25);
    const mData = mhsProdi.map(p => p.mahasiswa_aktif_periode ?? 0);

    this.prodiChartData = {
      jLabels, jData,
      aLabels, aData,
      aColors: this.gradientColors(aData, 170, 50),   // teal
      mLabels: mhsProdi.map(p => `[${p.jenjang_display}] ${p.nama}`),
      mData,
      mColors: this.gradientColors(mData, 213, 55),   // biru
    };
  }

  isLoggedIn = false;

  constructor(private route: ActivatedRoute, private api: ApiService,
              private zone: NgZone, private auth: AuthService) {}

  ngOnInit() {
    this.auth.currentUser$.subscribe(u => this.isLoggedIn = !!u);
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.api.getPerguruanTinggiDetail(id).subscribe({
      next: d => {
        this.pt = d; this.loading = false;
        this.buildProdiListMhs(); this.buildJenjangOptions();
        this.buildProdiChartData();
        if (this.tab === 'prodi') setTimeout(() => this.renderProdiCharts(), 50);
      },
      error: () => this.loading = false
    });
  }

  ngAfterViewChecked() {
    if (this.tab === 'mahasiswa' && this.mhsChartRef && !this.chartRendered) {
      this.chartRendered = true;
      this.zone.runOutsideAngular(() => this.renderChart());
    }
    if (this.prodiModal.open && !this.prodiMhsLineChartReady && this.prodiMhsLineChartRef) {
      this.prodiMhsLineChartReady = true;
      this.zone.runOutsideAngular(() => this.renderProdiMhsLineChart());
    }
  }

  setTab(t: string) {
    this.tab = t;
    if (t !== 'mahasiswa') {
      this.chartRendered = false;
      if (this.chart) { this.chart.destroy(); this.chart = null; }
    }
    if (t === 'prodi') {
      setTimeout(() => this.renderProdiCharts(), 50);
    } else {
      [this.prodiJenjangChart, this.prodiAkrChart, this.prodiMhsChart].forEach(c => c?.destroy());
      this.prodiJenjangChart = this.prodiAkrChart = this.prodiMhsChart = null;
    }
  }

  private renderProdiCharts() {
    const d = this.prodiChartData;
    if (!d) return;

    [this.prodiJenjangChart, this.prodiAkrChart, this.prodiMhsChart].forEach(c => c?.destroy());
    this.prodiJenjangChart = this.prodiAkrChart = this.prodiMhsChart = null;

    const outsideLabelPlugin = {
      id: 'arcOutsideLabel',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx;
        const meta0 = chart.getDatasetMeta(0);
        if (!meta0?.data?.length) return;
        const cx: number = meta0.data[0].x;
        const cy: number = meta0.data[0].y;
        chart.data.datasets.forEach((_: any, di: number) => {
          chart.getDatasetMeta(di).data.forEach((arc: any, i: number) => {
            const value = chart.data.datasets[di].data[i];
            if (!value) return;
            const total = chart.data.datasets[di].data.reduce((a: number, b: number) => a + b, 0);
            if (value / total < 0.04) return;
            const outerR = arc.outerRadius;
            const angle  = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
            const x1 = cx + Math.cos(angle) * outerR * 0.92;
            const y1 = cy + Math.sin(angle) * outerR * 0.92;
            const x2 = cx + Math.cos(angle) * outerR * 1.10;
            const y2 = cy + Math.sin(angle) * outerR * 1.10;
            const right = Math.cos(angle) >= 0;
            const x3 = x2 + (right ? 10 : -10);
            ctx.save();
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.lineTo(x3, y2);
            ctx.stroke();
            ctx.font = 'bold 11px sans-serif';
            ctx.fillStyle = '#222';
            ctx.textAlign = right ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(value), right ? x3 + 3 : x3 - 3, y2);
            ctx.restore();
          });
        });
      }
    };

    const doughnutOpts = (callbacks: any) => ({
      responsive: true, maintainAspectRatio: false, animation: false as const,
      layout: { padding: { top: 28, bottom: 28, left: 28, right: 28 } },
      radius: '78%',
      plugins: {
        legend: { position: 'right' as const, labels: { font: { size: 11 }, padding: 10, boxWidth: 12 } },
        tooltip: { callbacks }
      }
    });

    this.zone.runOutsideAngular(() => {
      setTimeout(() => {
        if (!this.prodiJenjangChartRef) return;
        this.prodiJenjangChart = new Chart(this.prodiJenjangChartRef.nativeElement.getContext('2d')!, {
          type: 'doughnut',
          data: { labels: d.jLabels, datasets: [{ data: d.jData, backgroundColor: this.gradientColors(d.jData, 24, 75), borderWidth: 2 }] },
          options: doughnutOpts({ label: (c: any) => ` ${c.label}: ${c.parsed} prodi` }),
          plugins: [outsideLabelPlugin]
        });
      }, 0);

      setTimeout(() => {
        if (!this.prodiAkrChartRef) return;
        this.prodiAkrChart = new Chart(this.prodiAkrChartRef.nativeElement.getContext('2d')!, {
          type: 'doughnut',
          data: { labels: d.aLabels, datasets: [{ data: d.aData, backgroundColor: d.aColors, borderWidth: 2 }] },
          options: doughnutOpts({ label: (c: any) => ` ${c.label}: ${c.parsed} prodi` }),
          plugins: [outsideLabelPlugin]
        });
      }, 50);

      setTimeout(() => {
        if (!this.prodiMhsChartRef) return;
        const wrap = this.prodiMhsChartRef.nativeElement.parentElement!;
        wrap.style.height = Math.max(180, d.mLabels.length * 26) + 'px';
        this.prodiMhsChart = new Chart(this.prodiMhsChartRef.nativeElement.getContext('2d')!, {
          type: 'bar',
          data: { labels: d.mLabels, datasets: [{ label: 'Mhs Aktif', data: d.mData, backgroundColor: d.mColors, borderRadius: 3 }] },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => ` ${(c.parsed.x as number).toLocaleString('id-ID')} mahasiswa` } } },
            scales: { x: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } }, y: { ticks: { font: { size: 11 } } } }
          }
        });
      }, 100);
    });
  }

  private readonly MHS_PALETTE = [
    '#1a237e', '#b71c1c', '#1b5e20', '#e65100', '#4a148c',
    '#006064', '#880e4f', '#33691e', '#bf360c', '#01579b',
    '#827717', '#37474f', '#4e342e', '#1565c0', '#2e7d32',
  ];

  private renderChart() {
    if (!this.mhsChartRef) return;
    const source = this.mhsDataFiltered;
    if (!source.length) return;

    // Sort periods chronologically
    const semOrder: Record<string, number> = { ganjil: 0, genap: 1 };
    const periods = [...source].sort((a: any, b: any) => {
      if (a.tahun_akademik !== b.tahun_akademik)
        return a.tahun_akademik.localeCompare(b.tahun_akademik);
      return (semOrder[a.semester] ?? 0) - (semOrder[b.semester] ?? 0);
    });

    const labels = periods.map((m: any) =>
      `${m.tahun_akademik} ${m.semester.charAt(0).toUpperCase() + m.semester.slice(1)}`
    );

    let datasets: any[];

    if (this.mhsMode === 'bandingkan') {
      // One line per selected prodi
      const selectedProdi = this.prodiListMhs.filter(p => this.selectedProdiMhs.has(p.id));
      datasets = selectedProdi.map((prodi, idx) => {
        const color = this.MHS_PALETTE[idx % this.MHS_PALETTE.length];
        const data = periods.map((periode: any) => {
          const row = (periode.per_prodi || []).find((r: any) => r.prodi_id === prodi.id);
          return row ? (row.mahasiswa_aktif ?? null) : null;
        });
        return {
          label: `${prodi.nama} (${prodi.jenjang})`,
          data,
          borderColor: color,
          backgroundColor: color + '18',
          pointBackgroundColor: color,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          spanGaps: true,
        };
      });
    } else {
      // Gabung: aggregate all selected prodi into one line
      const values = periods.map((periode: any) =>
        (periode.per_prodi || []).reduce((s: number, r: any) => s + (r.mahasiswa_aktif ?? 0), 0)
      );
      datasets = [{
        label: 'Total Mahasiswa Aktif',
        data: values,
        borderColor: '#1a237e',
        backgroundColor: 'rgba(26,35,126,0.08)',
        pointBackgroundColor: '#1a237e',
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        spanGaps: true,
      }];
    }

    const ctx = this.mhsChartRef.nativeElement.getContext('2d')!;
    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c: any) => ` ${c.dataset.label}: ${(c.parsed.y ?? 0).toLocaleString('id-ID')} mhs`
            }
          }
        },
        scales: {
          x: {
            ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 30 },
            grid: { display: false }
          },
          y: {
            beginAtZero: false,
            ticks: {
              font: { size: 11 },
              callback: (v: any) => v.toLocaleString('id-ID')
            },
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        }
      }
    });
  }

  readonly DOSEN_DATASETS = [
    { key: 's3',            label: 'S3',           color: '#1a237e' },
    { key: 's2',            label: 'S2',           color: '#1565c0' },
    { key: 's1',            label: 'S1',           color: '#0288d1' },
    { key: 'guru_besar',    label: 'Profesor',     color: '#e67300' },
    { key: 'lektor_kepala', label: 'Lekt. Kepala', color: '#f57f17' },
    { key: 'lektor',        label: 'Lektor',       color: '#00695c' },
    { key: 'asisten_ahli',  label: 'Asisten Ahli', color: '#6a1b9a' },
    { key: 'tetap',         label: 'Tetap',        color: '#137333' },
    { key: 'tidak_tetap',   label: 'Tdk Tetap',    color: '#b71c1c' },
  ];

  visibleDatasets = new Set<string>(['s3', 'guru_besar']);

  toggleDataset(key: string) {
    if (this.visibleDatasets.has(key)) this.visibleDatasets.delete(key);
    else this.visibleDatasets.add(key);
    setTimeout(() => this.rerenderAllDosenCharts(), 0);
  }

  // ── Filter prodi mahasiswa ────────────────────────
  prodiFilterOpen = false;
  mhsMode: 'gabung' | 'bandingkan' = 'bandingkan';
  prodiListMhs: { id: number; nama: string; jenjang: string }[] = [];
  selectedProdiMhs = new Set<number>();
  mhsDataFiltered: any[] = [];

  setMhsMode(mode: 'gabung' | 'bandingkan') {
    if (this.mhsMode === mode) return;
    this.mhsMode = mode;
    this.recomputeMhsData();
  }

  private buildProdiListMhs() {
    const map = new Map<number, { id: number; nama: string; jenjang: string }>();
    for (const periode of this.pt?.data_mahasiswa || []) {
      for (const p of periode.per_prodi || []) {
        if (!map.has(p.prodi_id)) {
          map.set(p.prodi_id, { id: p.prodi_id, nama: p.prodi_nama, jenjang: p.prodi_jenjang });
        }
      }
    }
    this.prodiListMhs = Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
    // Default: semua terpilih
    this.selectedProdiMhs = new Set(this.prodiListMhs.map(p => p.id));
    this.recomputeMhsData();
  }

  toggleProdiMhs(id: number) {
    // Buat Set baru agar Angular mendeteksi perubahan referensi
    const next = new Set(this.selectedProdiMhs);
    if (next.has(id)) next.delete(id); else next.add(id);
    this.selectedProdiMhs = next;
    this.recomputeMhsData();
  }

  selectAllProdiMhs() {
    this.selectedProdiMhs = new Set(this.prodiListMhs.map(p => p.id));
    this.recomputeMhsData();
  }

  clearAllProdiMhs() {
    this.selectedProdiMhs = new Set();
    this.recomputeMhsData();
  }

  private recomputeMhsData() {
    const src = this.pt?.data_mahasiswa ?? [];
    const allSelected = this.selectedProdiMhs.size === this.prodiListMhs.length;
    this.mhsDataFiltered = allSelected
      ? src
      : src.map((periode: any) => {
          const rows = (periode.per_prodi || []).filter(
            (p: any) => this.selectedProdiMhs.has(p.prodi_id)
          );
          return {
            tahun_akademik: periode.tahun_akademik,
            semester: periode.semester,
            mahasiswa_aktif: rows.reduce((s: number, p: any) => s + (p.mahasiswa_aktif || 0), 0),
            per_prodi: rows,
          };
        });
    // Destroy chart lama lalu render ulang
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this.chartRendered = false;
    if (this.tab === 'mahasiswa') {
      setTimeout(() => { this.chartRendered = true; this.zone.runOutsideAngular(() => this.renderChart()); }, 50);
    }
  }

  dosenJenjangOptions: string[] = [];

  buildJenjangOptions() {
    const set = new Set<string>();
    for (const d of this.pt?.data_dosen || []) {
      for (const p of d.per_prodi || []) {
        if (p.prodi_jenjang) set.add(p.prodi_jenjang);
      }
    }
    this.dosenJenjangOptions = Array.from(set).sort();
  }

  filteredProdi(perProdi: any[]): any[] {
    if (!this.filterDosenJenjang) return perProdi || [];
    return (perProdi || []).filter(p => p.prodi_jenjang === this.filterDosenJenjang);
  }

  toggleDosen(i: number) {
    if (this.expandedDosen.has(i)) {
      this.expandedDosen.delete(i);
      this.dosenSubView.delete(i);
      const c = this.dosenCharts.get(i);
      if (c) { c.destroy(); this.dosenCharts.delete(i); }
    } else {
      this.expandedDosen.add(i);
      this.dosenSubView.set(i, 'chart');   // default: grafik terbuka
      setTimeout(() => this.renderDosenChart(i), 50);
    }
  }

  chartHeight(perProdi: any[]): number {
    const rows = this.filteredProdi(perProdi).length || 1;
    return Math.max(200, rows * 26 + 70);
  }

  private readonly DS_FIELD_MAP: Record<string, string> = {
    s3: 'dosen_s3', s2: 'dosen_s2', s1: 'dosen_s1',
    guru_besar: 'dosen_guru_besar', lektor_kepala: 'dosen_lektor_kepala',
    lektor: 'dosen_lektor', asisten_ahli: 'dosen_asisten_ahli',
    tetap: 'dosen_tetap', tidak_tetap: 'dosen_tidak_tetap',
  };

  private renderDosenChart(i: number) {
    const canvas = document.getElementById(`dosenChart-${i}`) as HTMLCanvasElement;
    if (!canvas) return;
    const periode = this.pt?.data_dosen?.[i];
    if (!periode) return;

    const rows   = this.filteredProdi(periode.per_prodi);
    const labels = rows.map((p: any) => `${p.prodi_nama} (${p.prodi_jenjang})`);

    const existing = this.dosenCharts.get(i);
    if (existing) { existing.destroy(); }

    const datasets = this.DOSEN_DATASETS.map(ds => {
      const field = this.DS_FIELD_MAP[ds.key];
      return {
        label: ds.label,
        data: rows.map((p: any) => p[field] || 0),
        backgroundColor: ds.color + 'bf',   // 75% opacity
        borderColor: ds.color,
        borderWidth: 1,
        borderRadius: 3,
        hidden: !this.visibleDatasets.has(ds.key),
      };
    });

    const chart = new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.x}` } },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { font: { size: 11 }, stepSize: 1 },
            grid: { color: 'rgba(0,0,0,0.05)' },
          },
          y: {
            ticks: { font: { size: 11 } },
            grid: { display: false },
          },
        },
      },
    });
    this.dosenCharts.set(i, chart);
  }

  private rerenderAllDosenCharts() {
    for (const i of this.expandedDosen) {
      this.renderDosenChart(i);
    }
  }

  formatAkreditasi(v: string) {
    return { unggul:'Unggul', baik_sekali:'Baik Sekali', baik:'Baik', belum:'Belum' }[v] || v;
  }

  expStatus(tgl: string): string {
    if (!tgl) return '';
    const now = new Date();
    const exp = new Date(tgl);
    const limit7m  = new Date(now); limit7m.setMonth(limit7m.getMonth() + 7);
    const limit12m = new Date(now); limit12m.setMonth(limit12m.getMonth() + 12);
    if (exp <= limit7m)  return 'red';
    if (exp <= limit12m) return 'yellow';
    return 'green';
  }

  async downloadPtPdf(): Promise<void> {
    const pt = this.pt;
    if (!pt) return;

    const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
    const fmtNum  = (n: number | null) => n != null ? n.toLocaleString('id') : '—';
    const akrLabel: Record<string, string> = { unggul: 'Unggul', baik_sekali: 'Baik Sekali', baik: 'Baik', c: 'C', belum: 'Belum Terakreditasi' };

    // ── Load logo PT sebagai base64 ────────────────────────────────
    const logoBase64: string = pt.logo
      ? await fetch(pt.logo)
          .then(r => r.blob())
          .then(b => new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(b);
          }))
          .catch(() => '')
      : '';

    // ── Render charts off-screen ───────────────────────────────────
    const mkCanvas = (w: number, h: number) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; return c;
    };

    // ── Gradasi satu warna untuk pie chart ────────────────────────
    const hslShades = (hue: number, n: number): string[] =>
      Array.from({length: n}, (_, i) =>
        `hsl(${hue},70%,${n===1?42:62-(38*i/Math.max(n-1,1))}%)`
      );

    // ── Plugin: label LUAR pie + garis penghubung ─────────────────
    const pieDataLabelPlugin = {
      id: 'pdfPieDL',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset: any, di: number) => {
          const meta = chart.getDatasetMeta(di);
          const total = (dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
          meta.data.forEach((el: any, idx: number) => {
            const value = dataset.data[idx] as number;
            if (!value || total === 0) return;
            const pct = Math.round(value / total * 100);
            if (pct < 3) return;
            const mid = (el.startAngle + el.endAngle) / 2;
            const cosM = Math.cos(mid), sinM = Math.sin(mid);
            const r0 = el.outerRadius + 5;
            const r1 = el.outerRadius + 14;
            const r2 = el.outerRadius + 22;
            ctx.save();
            // garis penghubung
            ctx.beginPath();
            ctx.moveTo(el.x + r0*cosM, el.y + r0*sinM);
            ctx.lineTo(el.x + r1*cosM, el.y + r1*sinM);
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 0.8; ctx.stroke();
            // teks
            const lx = el.x + r2*cosM, ly = el.y + r2*sinM;
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 9px Arial';
            ctx.textAlign = cosM >= 0 ? 'left' : 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${value} (${pct}%)`, lx, ly);
            ctx.restore();
          });
        });
      }
    };

    // ── Plugin: label nilai pada titik line chart ─────────────────
    const lineDataLabelPlugin = {
      id: 'pdfLineDL',
      afterDatasetsDraw(chart: any) {
        const ctx = chart.ctx;
        chart.data.datasets.forEach((dataset: any, _di: number) => {
          const meta = chart.getDatasetMeta(_di);
          meta.data.forEach((el: any, idx: number) => {
            const value = dataset.data[idx] as number;
            if (value == null) return;
            const pos = el.tooltipPosition();
            ctx.save();
            ctx.fillStyle = '#1a237e';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(Number(value).toLocaleString('id'), pos.x, pos.y - 4);
            ctx.restore();
          });
        });
      }
    };

    // ── Shared pie options (legend kanan, padding untuk label luar) ─
    const pieOpts = (title: string) => ({
      animation: false as const, responsive: false as const,
      layout: { padding: { top: 28, bottom: 28, left: 44, right: 16 } },
      plugins: {
        legend: { position: 'right' as const, labels: { font: { size: 10 }, boxWidth: 11, padding: 8 } },
        title: { display: !!title, text: title, font: { size: 10 }, color: '#374151', padding: { bottom: 4 } }
      }
    });

    // Chart 1: Sebaran Jenjang (pie, gradasi biru-indigo)
    const prodi = pt.program_studi || [];
    const jenjangCount: Record<string, number> = {};
    prodi.forEach((p: any) => { const k = p.jenjang_display || p.jenjang || '?'; jenjangCount[k] = (jenjangCount[k] || 0) + 1; });
    const jenjangImg = (() => {
      const keys = Object.keys(jenjangCount); if (!keys.length) return '';
      const c = mkCanvas(480, 280);
      const ch = new Chart(c, {
        type: 'pie', plugins: [pieDataLabelPlugin],
        data: { labels: keys, datasets: [{ data: Object.values(jenjangCount),
          backgroundColor: hslShades(235, keys.length), borderColor: '#fff', borderWidth: 2 }] },
        options: pieOpts('')
      });
      const img = c.toDataURL('image/png'); ch.destroy(); return img;
    })();

    // Chart 2: Sebaran Akreditasi (pie, gradasi hijau)
    const akrCount: Record<string, number> = {};
    prodi.forEach((p: any) => { const k = p.akreditasi_display || p.akreditasi || 'Belum'; akrCount[k] = (akrCount[k] || 0) + 1; });
    const akrImg = (() => {
      const keys = Object.keys(akrCount); if (!keys.length) return '';
      const c = mkCanvas(480, 280);
      const ch = new Chart(c, {
        type: 'pie', plugins: [pieDataLabelPlugin],
        data: { labels: keys, datasets: [{ data: Object.values(akrCount),
          backgroundColor: hslShades(142, keys.length), borderColor: '#fff', borderWidth: 2 }] },
        options: pieOpts('')
      });
      const img = c.toDataURL('image/png'); ch.destroy(); return img;
    })();

    // Chart 3: Komposisi Pendidikan Dosen (pie, gradasi ungu) — periode terbaru
    const lastDsn = (pt.data_dosen || [])[0];
    const dsnImg = (() => {
      if (!lastDsn) return '';
      const s3 = lastDsn.dosen_s3||0, s2 = lastDsn.dosen_s2||0, s1 = lastDsn.dosen_s1||0;
      if (s3+s2+s1 === 0) return '';
      const c = mkCanvas(480, 280);
      const ch = new Chart(c, {
        type: 'pie', plugins: [pieDataLabelPlugin],
        data: { labels: ['S3 / Doktor', 'S2 / Magister', 'S1 / Sarjana'],
          datasets: [{ data: [s3, s2, s1],
            backgroundColor: hslShades(262, 3), borderColor: '#fff', borderWidth: 2 }] },
        options: pieOpts('')
      });
      const img = c.toDataURL('image/png'); ch.destroy(); return img;
    })();

    // Chart 4: Tren Mahasiswa Aktif PT (line + point labels) — ganjil→genap per tahun
    const mhsData = [...(pt.data_mahasiswa || [])].sort((a: any, b: any) => {
      if (a.tahun_akademik !== b.tahun_akademik)
        return String(a.tahun_akademik) < String(b.tahun_akademik) ? -1 : 1;
      return (a.semester === 'ganjil' ? 0 : 1) - (b.semester === 'ganjil' ? 0 : 1);
    });
    const mhsImg = (() => {
      if (!mhsData.length) return '';
      const c = mkCanvas(680, 260);
      const ch = new Chart(c, {
        type: 'line', plugins: [lineDataLabelPlugin],
        data: {
          labels: mhsData.map((m: any) => `${m.tahun_akademik} ${m.semester==='ganjil'?'Ganjil':'Genap'}`),
          datasets: [{ label: 'Mahasiswa Aktif', data: mhsData.map((m: any) => m.mahasiswa_aktif),
            borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)', tension: 0.3, fill: true,
            pointBackgroundColor: '#6366f1', pointRadius: 4 }]
        },
        options: { animation: false, responsive: false,
          plugins: { legend: { display: false } },
          scales: { x: { ticks: { maxRotation: 45, font: { size: 8 } }, grid: { display: false } },
            y: { beginAtZero: false, grace: '18%', ticks: { font: { size: 8 }, callback: (v: any) => Number(v).toLocaleString('id') } } } }
      });
      const img = c.toDataURL('image/png'); ch.destroy(); return img;
    })();

    // Chart 5: Tren Mahasiswa Aktif per Prodi (multi-line) ─────────
    const prodiColors = ['#6366f1','#0891b2','#22c55e','#f97316','#ec4899','#a855f7',
                         '#14b8a6','#eab308','#ef4444','#64748b','#84cc16','#f59e0b',
                         '#06b6d4','#8b5cf6','#10b981'];
    const prodiTrenImg = (() => {
      if (!mhsData.length) return '';
      // kumpulkan prodi unik dari semua per_prodi
      const prodiMap = new Map<number, {nama: string; data: (number|null)[]}>();
      mhsData.forEach((m: any, pi: number) => {
        (m.per_prodi || []).forEach((pp: any) => {
          if (!prodiMap.has(pp.prodi_id))
            prodiMap.set(pp.prodi_id, { nama: pp.prodi_nama, data: new Array(mhsData.length).fill(null) });
          prodiMap.get(pp.prodi_id)!.data[pi] = pp.mahasiswa_aktif ?? null;
        });
      });
      if (!prodiMap.size) return '';
      const datasets = [...prodiMap.values()].map((p, i) => ({
        label: p.nama, data: p.data,
        borderColor: prodiColors[i % prodiColors.length],
        backgroundColor: 'transparent',
        tension: 0.3, pointRadius: 3, borderWidth: 1.5, spanGaps: true
      }));
      const legendH = Math.ceil(prodiMap.size / 2) * 18 + 20;
      const c = mkCanvas(760, 280 + legendH);
      const ch = new Chart(c, {
        type: 'line',
        data: { labels: mhsData.map((m: any) => `${m.tahun_akademik} ${m.semester==='ganjil'?'Ganjil':'Genap'}`), datasets },
        options: { animation: false, responsive: false,
          plugins: { legend: { position: 'bottom', labels: { font: { size: 8 }, boxWidth: 10, padding: 6 } } },
          scales: { x: { ticks: { maxRotation: 45, font: { size: 8 } }, grid: { display: false } },
            y: { beginAtZero: false, grace: '10%', ticks: { font: { size: 8 }, callback: (v: any) => Number(v).toLocaleString('id') } } } }
      });
      const img = c.toDataURL('image/png'); ch.destroy(); return img;
    })();

    // ── Build table rows ───────────────────────────────────────────
    const prodiRows = prodi.map((p: any, i: number) =>
      `<tr><td>${i+1}</td><td>${p.nama}</td><td>${p.jenjang_display||p.jenjang}</td>
       <td>${akrLabel[p.akreditasi]||p.akreditasi||'—'}</td><td>${p.no_sk_akreditasi||'—'}</td>
       <td>${fmtDate(p.tanggal_kedaluarsa_akreditasi)}</td>
       <td class="num">${fmtNum(p.mahasiswa_aktif_periode)}</td>
       <td class="num">${fmtNum(p.dosen_tetap_periode)}</td></tr>`
    ).join('');

    // Tabel mahasiswa: hanya kolom Aktif, urutan sama dengan chart
    const mhsRows = mhsData.map((m: any) =>
      `<tr><td>${m.tahun_akademik} ${m.semester==='ganjil'?'Ganjil':'Genap'}</td>
       <td class="num">${fmtNum(m.mahasiswa_aktif)}</td></tr>`
    ).join('');

    const dsnRows = (pt.data_dosen || []).map((d: any) =>
      `<tr><td>${d.tahun_akademik} ${d.semester==='ganjil'?'Ganjil':'Genap'}</td>
       <td class="num">${fmtNum(d.dosen_tetap)}</td><td class="num">${fmtNum(d.dosen_tidak_tetap)}</td>
       <td class="num">${fmtNum(d.dosen_s3)}</td><td class="num">${fmtNum(d.dosen_s2)}</td>
       <td class="num">${fmtNum(d.dosen_s1)}</td>
       <td class="num">${fmtNum(d.dosen_guru_besar)}</td><td class="num">${fmtNum(d.dosen_bersertifikat)}</td></tr>`
    ).join('');

    const chartSection = (title: string, img: string) =>
      img ? `<div class="chart-block"><div class="chart-title">${title}</div><img src="${img}" class="chart-img"></div>` : '';

    const html = `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">
<title>Profil PT — ${pt.nama}</title>
<style>
  * { box-sizing: border-box; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  body { font-family: Arial, sans-serif; font-size: 10.5px; margin: 0; padding: 20px; color: #1e293b; }
  .letterhead { display: flex; align-items: flex-start; gap: 16px; padding-bottom: 12px; border-bottom: 3px solid #1a237e; margin-bottom: 4px; }
  .letterhead img { height: 76px; width: auto; flex-shrink: 0; object-fit: contain; }
  .letterhead-text { flex: 1; }
  .letterhead-text h1 { font-size: 18px; color: #1a237e; font-weight: 700; margin: 0 0 3px; line-height: 1.2; }
  .letterhead-text .sub { font-size: 10.5px; color: #475569; margin-bottom: 4px; }
  .letterhead-text .akr-row { font-size: 10px; color: #475569; margin-bottom: 4px; }
  .letterhead-text .address { font-size: 10px; color: #64748b; margin-bottom: 3px; }
  .letterhead-text .contacts { font-size: 10px; color: #64748b; }
  .letterhead-text .contacts a { color: #1a237e; text-decoration: none; }
  .letterhead-bottom { display: flex; align-items: flex-start; gap: 12px; margin-top: 5px; }
  .letterhead-bottom .addr-col { flex: 1; }
  .badges { flex-shrink: 0; display: flex; flex-direction: column; gap: 3px; align-items: flex-start; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 12px; font-size: 10px; font-weight: 700; margin-right: 4px; }
  .badge-unggul{background:#d1fae5;color:#065f46} .badge-baik_sekali{background:#e0f2fe;color:#075985}
  .badge-baik{background:#fef9c3;color:#713f12} .badge-c{background:#fee2e2;color:#991b1b}
  .badge-belum{background:#f1f5f9;color:#64748b} .badge-muhammadiyah{background:#fef9c3;color:#78350f}
  .badge-aisyiyah{background:#fce7f3;color:#831843}
  .tagline { font-size: 9px; color: #94a3b8; text-align: right; margin-bottom: 14px; }
  .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 14px; background: #f8fafc; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
  .info-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 2px; }
  .info-val { font-size: 11px; font-weight: 600; color: #1e293b; }
  .section-title { font-size: 12px; font-weight: 700; color: #1a237e; border-left: 3px solid #1a237e; padding-left: 8px; margin: 16px 0 8px; }
  .charts-row { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: flex-start; }
  .chart-block { flex: 1; min-width: 160px; background: #f8fafc; border-radius: 8px; padding: 10px; text-align: center; }
  .chart-title { font-size: 10px; font-weight: 700; color: #374151; margin-bottom: 6px; }
  .chart-img { width: 100%; max-width: 320px; height: auto; }
  .chart-block--wide { flex: 2; min-width: 280px; }
  .chart-block--full { flex: 0 0 100%; width: 100%; }
  .mhs-side { flex: 1; min-width: 120px; }
  .mhs-side table { margin-bottom: 0; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 16px; }
  th { background: #1a237e; color: #fff; padding: 5px 7px; text-align: left; }
  th.num, td.num { text-align: right; }
  td { padding: 4px 7px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .sources { font-size: 9.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; }
  .sources a { color: #1a237e; }
  .generated { font-size: 9px; color: #cbd5e1; margin-top: 4px; }
  @media print { @page { size: A4 portrait; margin: 12mm 12mm; } body { padding: 0; } }
</style></head><body>

<div class="letterhead">
  ${logoBase64 ? `<img src="${logoBase64}" alt="Logo">` : ''}
  <div class="letterhead-text">
    <h1>${pt.nama}</h1>
    <div class="sub">${pt.kode_pt} &nbsp;·&nbsp; ${pt.jenis||''} &nbsp;·&nbsp; ${pt.kota}, ${pt.provinsi}</div>
    ${(pt.nomor_sk_akreditasi || pt.tanggal_kadaluarsa_akreditasi) ? `<div class="akr-row">${pt.nomor_sk_akreditasi ? `No. SK: <strong>${pt.nomor_sk_akreditasi}</strong>` : ''}${pt.nomor_sk_akreditasi && pt.tanggal_kadaluarsa_akreditasi ? ' &nbsp;·&nbsp; ' : ''}${pt.tanggal_kadaluarsa_akreditasi ? `Berlaku s/d: <strong>${fmtDate(pt.tanggal_kadaluarsa_akreditasi)}</strong>` : ''}</div>` : ''}
    <div class="letterhead-bottom">
      <div class="addr-col">
        ${pt.alamat ? `<div class="address">📍 ${pt.alamat}, ${pt.kota}, ${pt.provinsi}</div>` : ''}
        <div class="contacts">${[pt.website ? `<a href="${pt.website}">${pt.website}</a>` : '', pt.email ? `📧 ${pt.email}` : '', pt.telepon ? `📞 ${pt.telepon}` : ''].filter(Boolean).join(' &nbsp;·&nbsp; ')}</div>
      </div>
      <div class="badges">
        <span class="badge badge-${pt.organisasi_induk}">${(pt.organisasi_induk||'').replace('_',' ')}</span>
        <span class="badge badge-${pt.akreditasi_institusi}">${akrLabel[pt.akreditasi_institusi]||pt.akreditasi_institusi||'Belum'}</span>
      </div>
    </div>
  </div>
</div>
<div class="tagline">Profil Perguruan Tinggi &mdash; Digenerate: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>

<div class="info-grid">
  <div><div class="info-label">No. SK Akreditasi</div><div class="info-val" style="font-size:9.5px">${pt.nomor_sk_akreditasi||'—'}</div></div>
  <div><div class="info-label">Berlaku s/d</div><div class="info-val">${fmtDate(pt.tanggal_kadaluarsa_akreditasi)}</div></div>
  <div><div class="info-label">Alamat</div><div class="info-val" style="font-size:9.5px">${pt.alamat||'—'}</div></div>
  <div><div class="info-label">Website</div><div class="info-val" style="font-size:9.5px">${pt.website||'—'}</div></div>
  <div><div class="info-label">Email</div><div class="info-val" style="font-size:9.5px">${pt.email||'—'}</div></div>
  <div><div class="info-label">Telepon</div><div class="info-val">${pt.telepon||'—'}</div></div>
  <div><div class="info-label">Total Prodi Aktif</div><div class="info-val">${prodi.length}</div></div>
  <div><div class="info-label">Wilayah</div><div class="info-val">${pt.wilayah_nama||'—'}</div></div>
</div>

<div class="section-title">Visualisasi Data</div>
<div class="charts-row">
  ${chartSection('Sebaran Jenjang Prodi', jenjangImg)}
  ${chartSection('Sebaran Akreditasi Prodi', akrImg)}
  ${chartSection('Komposisi Pendidikan Dosen', dsnImg)}
</div>

${(mhsImg || mhsRows) ? `<div class="section-title">Tren Mahasiswa Aktif per Semester</div>
<div class="charts-row" style="align-items:stretch">
  ${mhsImg ? `<div class="chart-block chart-block--wide" style="text-align:left">
    <div class="chart-title">Grafik Tren Mahasiswa Aktif (Total PT)</div>
    <img src="${mhsImg}" class="chart-img" style="max-width:100%">
  </div>` : ''}
  ${mhsRows ? `<div class="mhs-side">
    <table><thead><tr><th>Semester</th><th class="num">Aktif</th></tr></thead>
    <tbody>${mhsRows}</tbody></table>
  </div>` : ''}
</div>` : ''}

${prodiTrenImg ? `<div class="charts-row">
  <div class="chart-block chart-block--full" style="text-align:left">
    <div class="chart-title">Perbandingan Tren Mahasiswa Aktif per Program Studi</div>
    <img src="${prodiTrenImg}" class="chart-img" style="max-width:100%;width:100%">
  </div>
</div>` : ''}

${prodiRows ? `<div class="section-title">Daftar Program Studi Aktif</div>
<table><thead><tr><th>#</th><th>Nama Prodi</th><th>Jenjang</th><th>Akreditasi</th><th>No. SK</th><th>Berlaku s/d</th><th class="num">Mhs. Aktif</th><th class="num">Dosen Tetap</th></tr></thead>
<tbody>${prodiRows}</tbody></table>` : ''}

${dsnRows ? `<div class="section-title">Tren Data Dosen per Semester</div>
<table><thead><tr><th>Semester</th><th class="num">Tetap</th><th class="num">Tdk Tetap</th><th class="num">S3</th><th class="num">S2</th><th class="num">S1</th><th class="num">Guru Besar</th><th class="num">Bersertifikat</th></tr></thead>
<tbody>${dsnRows}</tbody></table>` : ''}

<div class="sources">
  <strong>PP Muhammadiyah &mdash; Majelis Diktilitbang</strong> &nbsp;·&nbsp; Sistem Informasi Perguruan Tinggi Muhammadiyah &amp; Aisyiyah<br>
  Sumber data: <a href="https://pddikti.kemdiktisaintek.go.id/">PDDikti</a> &nbsp;·&nbsp; <a href="https://www.banpt.or.id/">BAN-PT</a> &nbsp;·&nbsp; LAM Terkait
</div>
<script>window.onload=function(){var A4H=1090;var h=document.body.scrollHeight;if(h>A4H){var z=(A4H/h).toFixed(4);document.body.style.zoom=z;document.body.style.transformOrigin='top left';}window.print();window.close();};</script>
</body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }
}
