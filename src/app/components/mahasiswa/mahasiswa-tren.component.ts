import { Component, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface PTOption   { id: number; nama: string; singkatan: string; }
interface ProdiOption{ id: number; nama: string; jenjang: string; jenjang_display: string; pt_nama: string; }
interface TrenDataset{ label: string; data: (number | null)[]; }
interface TrenResponse{ labels: string[]; datasets: TrenDataset[]; }

const COLORS = [
  '#6366f1','#0891b2','#22c55e','#f97316','#ec4899',
  '#a855f7','#14b8a6','#eab308','#ef4444','#3b82f6',
  '#84cc16','#f43f5e','#8b5cf6','#06b6d4','#10b981',
];

@Component({
  selector: 'app-mahasiswa-tren',
  template: `
<div class="mhs-page">
  <div class="mhs-header">
    <h1 class="mhs-title">Data Mahasiswa PTMA</h1>
    <p class="mhs-subtitle">Tren mahasiswa aktif per semester</p>
  </div>

  <!-- Page-level tabs -->
  <div class="page-tabs">
    <button class="page-tab" [class.active]="pageTab==='aktif'"   (click)="switchPageTab('aktif')">
      <svg viewBox="0 0 24 24" fill="currentColor" class="page-tab-icon"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
      Mahasiswa Aktif
    </button>
    <button class="page-tab" [class.active]="pageTab==='estimasi'" (click)="switchPageTab('estimasi')">
      <svg viewBox="0 0 24 24" fill="currentColor" class="page-tab-icon"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>
      Estimasi Baru / Lulus
    </button>
    <button class="page-tab page-tab--ringkasan" [class.active]="pageTab==='ringkasan'" (click)="switchPageTab('ringkasan')"
      [title]="!canRingkasan ? 'Pilih tepat 1 PT atau 1 prodi untuk melihat ringkasan' : ''">
      <svg viewBox="0 0 24 24" fill="currentColor" class="page-tab-icon"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>
      Ringkasan
    </button>
  </div>

  <!-- Mahasiswa Aktif content -->
  <ng-container *ngIf="pageTab==='aktif'">
  <div class="filter-card">

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab-btn" [class.active]="activeTab==='pt'" (click)="switchTab('pt')">
        <svg viewBox="0 0 24 24" fill="currentColor" class="tab-icon">
          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/>
        </svg>
        Perguruan Tinggi
        <span class="tab-badge" *ngIf="selectedPts.length">{{selectedPts.length}}</span>
      </button>
      <button class="tab-btn" [class.active]="activeTab==='prodi'" (click)="switchTab('prodi')">
        <svg viewBox="0 0 24 24" fill="currentColor" class="tab-icon">
          <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"/>
        </svg>
        Program Studi
        <span class="tab-badge tab-badge--green" *ngIf="selectedProdis.length">{{selectedProdis.length}}</span>
      </button>
    </div>

    <!-- PT filter panel -->
    <div class="filter-col" *ngIf="activeTab==='pt'">
      <div class="filter-col-head">
        <span class="filter-col-label">Pilih Perguruan Tinggi</span>
        <button class="clear-btn" *ngIf="selectedPts.length" (click)="selectedPts=[]">Hapus semua</button>
      </div>
      <input class="search-input" [(ngModel)]="ptSearch" (ngModelChange)="onPtSearch()"
        (focus)="ptPanelOpen=true" (blur)="closePtPanel()"
        placeholder="Ketik nama atau singkatan PT..." autocomplete="off"/>
      <div class="sel-panel" *ngIf="ptPanelOpen" (mousedown)="$event.preventDefault()">
        <div class="sel-empty" *ngIf="ptSearching">Mencari...</div>
        <div class="sel-empty" *ngIf="!ptSearching && !ptFiltered.length && ptSearch">Tidak ditemukan</div>
        <div class="sel-empty" *ngIf="!ptSearching && !ptFiltered.length && !ptSearch">Ketik untuk mencari PT</div>
        <table class="sel-table" *ngIf="ptFiltered.length">
          <tbody>
            <tr *ngFor="let pt of ptFiltered" (mousedown)="togglePt(pt)" [class.selected]="isPtSelected(pt)">
              <td class="sel-check"><span class="chk" [class.chk--on]="isPtSelected(pt)">{{isPtSelected(pt)?'✓':''}}</span></td>
              <td class="sel-singkat">{{pt.singkatan}}</td>
              <td class="sel-nama">{{pt.nama}}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="chips" *ngIf="selectedPts.length">
        <span class="chip chip--blue" *ngFor="let pt of selectedPts">
          {{pt.singkatan}}
          <button class="chip-remove" (click)="togglePt(pt)">×</button>
        </span>
      </div>
    </div>

    <!-- Prodi filter panel -->
    <div class="filter-col" *ngIf="activeTab==='prodi'">
      <div class="filter-col-head">
        <span class="filter-col-label">Pilih Program Studi</span>
        <button class="clear-btn" *ngIf="selectedProdis.length" (click)="selectedProdis=[]">Hapus semua</button>
      </div>
      <input class="search-input" [(ngModel)]="prodiSearch" (ngModelChange)="onProdiSearch()"
        (focus)="prodiPanelOpen=true" (blur)="closeProdiPanel()"
        placeholder="Ketik nama program studi..." autocomplete="off"/>
      <div class="sel-panel" *ngIf="prodiPanelOpen" (mousedown)="$event.preventDefault()">
        <div class="sel-empty" *ngIf="prodiSearching">Mencari...</div>
        <div class="sel-empty" *ngIf="!prodiSearching && !prodiFiltered.length && prodiSearch">Tidak ditemukan</div>
        <div class="sel-empty" *ngIf="!prodiSearching && !prodiFiltered.length && !prodiSearch">Ketik untuk mencari prodi</div>
        <table class="sel-table" *ngIf="!prodiSearching && prodiFiltered.length">
          <tbody>
            <tr *ngFor="let p of prodiFiltered" (mousedown)="toggleProdi(p)" [class.selected]="isProdiSelected(p)">
              <td class="sel-check"><span class="chk" [class.chk--on]="isProdiSelected(p)">{{isProdiSelected(p)?'✓':''}}</span></td>
              <td class="sel-jenjang">{{p.jenjang_display||p.jenjang}}</td>
              <td class="sel-nama">{{p.nama}}<span class="sel-pt-label">{{p.pt_nama}}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="chips" *ngIf="selectedProdis.length">
        <span class="chip chip--green" *ngFor="let p of selectedProdis">
          {{p.jenjang}} {{p.nama}}
          <button class="chip-remove" (click)="toggleProdi(p)">×</button>
        </span>
      </div>
    </div>

    <!-- Mode row -->
    <div class="mode-row">
      <div class="mode-group">
        <span class="filter-label">Mode:</span>
        <div class="toggle-group">
          <button class="toggle-btn" [class.active]="mode==='gabung'"       (click)="setMode('gabung')">Gabung</button>
          <button class="toggle-btn" [class.active]="mode==='perbandingan'" (click)="setMode('perbandingan')">Bandingkan</button>
        </div>
      </div>
      <button class="load-btn" (click)="loadData()" [disabled]="loading">
        {{loading ? 'Memuat...' : 'Tampilkan'}}
      </button>
    </div>
  </div>

  <!-- Chart -->
  <div class="chart-card" [style.box-shadow]="'-4px 0 0 0 ' + chartAccent + ', 0 1px 6px rgba(0,0,0,0.07)'">
    <div class="chart-state" *ngIf="!hasData && !loading && !error">
      Pilih filter lalu klik <strong>Tampilkan</strong>, atau biarkan kosong untuk melihat total nasional.
    </div>
    <div class="chart-state" *ngIf="loading">Memuat data...</div>
    <div class="chart-state chart-state--error" *ngIf="error">{{error}}</div>
    <div class="chart-wrap" [style.display]="hasData && !loading ? 'block' : 'none'">
      <canvas #chartCanvas></canvas>
    </div>
  </div>
  </ng-container>

  <!-- Estimasi tab -->
  <ng-container *ngIf="pageTab==='estimasi'">
  <div class="filter-card" style="box-shadow: -4px 0 0 0 #f97316, 0 1px 6px rgba(0,0,0,0.07)">

    <!-- Metric toggle -->
    <div class="metric-row">
      <span class="filter-label">Tampilkan:</span>
      <div class="metric-group">
        <button class="metric-btn" [class.active]="metric==='baru'"  (click)="setMetric('baru')">
          <span class="metric-dot metric-dot--baru"></span> Mahasiswa Baru
        </button>
        <button class="metric-btn" [class.active]="metric==='lulus'" (click)="setMetric('lulus')">
          <span class="metric-dot metric-dot--lulus"></span> Mahasiswa Lulus
        </button>
        <button class="metric-btn metric-btn--kombinasi" [class.active]="metric==='kombinasi'"
          [disabled]="!canKombinasi" [title]="!canKombinasi ? 'Pilih tepat 1 PT atau 1 prodi' : ''"
          (click)="setMetric('kombinasi')">
          <span class="metric-dot metric-dot--baru"></span><span class="metric-dot metric-dot--lulus"></span> Baru &amp; Lulus
        </button>
      </div>
      <span class="estimasi-note">*estimasi statistik berdasarkan data aktif &amp; masa studi</span>
    </div>

    <!-- Toggle profesi -->
    <div class="profesi-row">
      <label class="profesi-toggle" [class.active]="includeProfesi" (click)="toggleProfesi()"
        title="Profesi (PPG/Ners) = sertifikasi lanjutan, bukan mahasiswa baru masuk PT">
        <span class="profesi-toggle-track">
          <span class="profesi-toggle-thumb"></span>
        </span>
        <span class="profesi-toggle-label">Ikutkan jenjang <strong>Profesi</strong> (PPG, Ners, Apoteker)</span>
      </label>
      <span class="profesi-warn" *ngIf="includeProfesi">
        ⚠ Profesi diikutkan — estimasi lebih tinggi karena PPG/Ners bukan mahasiswa baru PT
      </span>
    </div>

    <!-- Tabs PT/Prodi -->
    <div class="tabs">
      <button class="tab-btn" [class.active]="activeTab==='pt'" (click)="switchTab('pt')">
        <svg viewBox="0 0 24 24" fill="currentColor" class="tab-icon"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
        Perguruan Tinggi
        <span class="tab-badge" *ngIf="selectedPts.length">{{selectedPts.length}}</span>
      </button>
      <button class="tab-btn" [class.active]="activeTab==='prodi'" (click)="switchTab('prodi')">
        <svg viewBox="0 0 24 24" fill="currentColor" class="tab-icon"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"/></svg>
        Program Studi
        <span class="tab-badge tab-badge--green" *ngIf="selectedProdis.length">{{selectedProdis.length}}</span>
      </button>
    </div>

    <!-- PT filter -->
    <div class="filter-col" *ngIf="activeTab==='pt'">
      <div class="filter-col-head">
        <span class="filter-col-label">Pilih Perguruan Tinggi</span>
        <button class="clear-btn" *ngIf="selectedPts.length" (click)="selectedPts=[]">Hapus semua</button>
      </div>
      <input class="search-input" [(ngModel)]="ptSearch" (ngModelChange)="onPtSearch()"
        (focus)="ptPanelOpen=true" (blur)="closePtPanel()"
        placeholder="Ketik nama atau singkatan PT..." autocomplete="off"/>
      <div class="sel-panel" *ngIf="ptPanelOpen" (mousedown)="$event.preventDefault()">
        <div class="sel-empty" *ngIf="ptSearching">Mencari...</div>
        <div class="sel-empty" *ngIf="!ptSearching && !ptFiltered.length && ptSearch">Tidak ditemukan</div>
        <div class="sel-empty" *ngIf="!ptSearching && !ptFiltered.length && !ptSearch">Ketik untuk mencari PT</div>
        <table class="sel-table" *ngIf="ptFiltered.length">
          <tbody>
            <tr *ngFor="let pt of ptFiltered" (mousedown)="togglePt(pt)" [class.selected]="isPtSelected(pt)">
              <td class="sel-check"><span class="chk" [class.chk--on]="isPtSelected(pt)">{{isPtSelected(pt)?'✓':''}}</span></td>
              <td class="sel-singkat">{{pt.singkatan}}</td>
              <td class="sel-nama">{{pt.nama}}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="chips" *ngIf="selectedPts.length">
        <span class="chip chip--blue" *ngFor="let pt of selectedPts">
          {{pt.singkatan}}<button class="chip-remove" (click)="togglePt(pt)">×</button>
        </span>
      </div>
    </div>

    <!-- Prodi filter -->
    <div class="filter-col" *ngIf="activeTab==='prodi'">
      <div class="filter-col-head">
        <span class="filter-col-label">Pilih Program Studi</span>
        <button class="clear-btn" *ngIf="selectedProdis.length" (click)="selectedProdis=[]">Hapus semua</button>
      </div>
      <input class="search-input" [(ngModel)]="prodiSearch" (ngModelChange)="onProdiSearch()"
        (focus)="prodiPanelOpen=true" (blur)="closeProdiPanel()"
        placeholder="Ketik nama program studi..." autocomplete="off"/>
      <div class="sel-panel" *ngIf="prodiPanelOpen" (mousedown)="$event.preventDefault()">
        <div class="sel-empty" *ngIf="prodiSearching">Mencari...</div>
        <div class="sel-empty" *ngIf="!prodiSearching && !prodiFiltered.length && prodiSearch">Tidak ditemukan</div>
        <div class="sel-empty" *ngIf="!prodiSearching && !prodiFiltered.length && !prodiSearch">Ketik untuk mencari prodi</div>
        <table class="sel-table" *ngIf="!prodiSearching && prodiFiltered.length">
          <tbody>
            <tr *ngFor="let p of prodiFiltered" (mousedown)="toggleProdi(p)" [class.selected]="isProdiSelected(p)">
              <td class="sel-check"><span class="chk" [class.chk--on]="isProdiSelected(p)">{{isProdiSelected(p)?'✓':''}}</span></td>
              <td class="sel-jenjang">{{p.jenjang_display||p.jenjang}}</td>
              <td class="sel-nama">{{p.nama}}<span class="sel-pt-label">{{p.pt_nama}}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="chips" *ngIf="selectedProdis.length">
        <span class="chip chip--green" *ngFor="let p of selectedProdis">
          {{p.jenjang}} {{p.nama}}<button class="chip-remove" (click)="toggleProdi(p)">×</button>
        </span>
      </div>
    </div>

    <!-- Mode row -->
    <div class="mode-row">
      <div class="mode-group">
        <span class="filter-label">Mode:</span>
        <div class="toggle-group">
          <button class="toggle-btn" [class.active]="mode==='gabung'"       (click)="setMode('gabung')">Gabung</button>
          <button class="toggle-btn" [class.active]="mode==='perbandingan'" (click)="setMode('perbandingan')">Bandingkan</button>
        </div>
      </div>
      <button class="load-btn" style="background:#f97316" (click)="loadData()" [disabled]="loading">
        {{loading ? 'Memuat...' : 'Tampilkan'}}
      </button>
    </div>
  </div>

  <div class="chart-card" [style.box-shadow]="'-4px 0 0 0 ' + metricAccent + ', 0 1px 6px rgba(0,0,0,0.07)'">
    <div class="chart-state" *ngIf="!hasData && !loading && !error">
      Pilih metric &amp; filter lalu klik <strong>Tampilkan</strong>.
    </div>
    <div class="chart-state" *ngIf="loading">Memuat data...</div>
    <div class="chart-state chart-state--error" *ngIf="error">{{error}}</div>
    <div class="chart-wrap" [style.display]="hasData && !loading ? 'block' : 'none'">
      <canvas #chartCanvas></canvas>
    </div>
  </div>
  </ng-container>

  <!-- Ringkasan tab -->
  <ng-container *ngIf="pageTab==='ringkasan'">
  <div class="filter-card" style="box-shadow: -4px 0 0 0 #10b981, 0 1px 6px rgba(0,0,0,0.07)">

    <div class="ringkasan-legend">
      <span class="rleg-item"><span class="rleg-dot" style="background:#0891b2"></span>Mahasiswa Aktif</span>
      <span class="rleg-item"><span class="rleg-dot" style="background:#22c55e"></span>Estimasi Baru</span>
      <span class="rleg-item"><span class="rleg-dot" style="background:#6366f1"></span>Estimasi Lulus</span>
      <span class="estimasi-note">*estimasi berdasarkan data aktif &amp; masa studi</span>
    </div>

    <!-- Toggle profesi -->
    <div class="profesi-row">
      <label class="profesi-toggle" [class.active]="includeProfesi" (click)="toggleProfesi()"
        title="Profesi (PPG/Ners) = sertifikasi lanjutan, bukan mahasiswa baru masuk PT">
        <span class="profesi-toggle-track">
          <span class="profesi-toggle-thumb"></span>
        </span>
        <span class="profesi-toggle-label">Ikutkan jenjang <strong>Profesi</strong> (PPG, Ners, Apoteker)</span>
      </label>
      <span class="profesi-warn" *ngIf="includeProfesi">
        ⚠ Profesi diikutkan — estimasi lebih tinggi karena PPG/Ners bukan mahasiswa baru PT
      </span>
    </div>

    <!-- Tabs PT/Prodi -->
    <div class="tabs">
      <button class="tab-btn" [class.active]="activeTab==='pt'" (click)="switchTab('pt')">
        <svg viewBox="0 0 24 24" fill="currentColor" class="tab-icon"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z"/></svg>
        Perguruan Tinggi
        <span class="tab-badge" *ngIf="selectedPts.length">{{selectedPts.length}}</span>
      </button>
      <button class="tab-btn" [class.active]="activeTab==='prodi'" (click)="switchTab('prodi')">
        <svg viewBox="0 0 24 24" fill="currentColor" class="tab-icon"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 14H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V6h8v2z"/></svg>
        Program Studi
        <span class="tab-badge tab-badge--green" *ngIf="selectedProdis.length">{{selectedProdis.length}}</span>
      </button>
    </div>

    <!-- PT filter -->
    <div class="filter-col" *ngIf="activeTab==='pt'">
      <div class="filter-col-head">
        <span class="filter-col-label">Pilih Perguruan Tinggi (maks. 1)</span>
        <button class="clear-btn" *ngIf="selectedPts.length" (click)="selectedPts=[]">Hapus</button>
      </div>
      <input class="search-input" [(ngModel)]="ptSearch" (ngModelChange)="onPtSearch()"
        (focus)="ptPanelOpen=true" (blur)="closePtPanel()"
        placeholder="Ketik nama atau singkatan PT..." autocomplete="off"/>
      <div class="sel-panel" *ngIf="ptPanelOpen" (mousedown)="$event.preventDefault()">
        <div class="sel-empty" *ngIf="ptSearching">Mencari...</div>
        <div class="sel-empty" *ngIf="!ptSearching && !ptFiltered.length && ptSearch">Tidak ditemukan</div>
        <div class="sel-empty" *ngIf="!ptSearching && !ptFiltered.length && !ptSearch">Ketik untuk mencari PT</div>
        <table class="sel-table" *ngIf="ptFiltered.length">
          <tbody>
            <tr *ngFor="let pt of ptFiltered" (mousedown)="togglePt(pt)" [class.selected]="isPtSelected(pt)">
              <td class="sel-check"><span class="chk" [class.chk--on]="isPtSelected(pt)">{{isPtSelected(pt)?'✓':''}}</span></td>
              <td class="sel-singkat">{{pt.singkatan}}</td>
              <td class="sel-nama">{{pt.nama}}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="chips" *ngIf="selectedPts.length">
        <span class="chip chip--blue" *ngFor="let pt of selectedPts">
          {{pt.singkatan}}<button class="chip-remove" (click)="togglePt(pt)">×</button>
        </span>
      </div>
    </div>

    <!-- Prodi filter -->
    <div class="filter-col" *ngIf="activeTab==='prodi'">
      <div class="filter-col-head">
        <span class="filter-col-label">Pilih Program Studi (maks. 1)</span>
        <button class="clear-btn" *ngIf="selectedProdis.length" (click)="selectedProdis=[]">Hapus</button>
      </div>
      <input class="search-input" [(ngModel)]="prodiSearch" (ngModelChange)="onProdiSearch()"
        (focus)="prodiPanelOpen=true" (blur)="closeProdiPanel()"
        placeholder="Ketik nama program studi..." autocomplete="off"/>
      <div class="sel-panel" *ngIf="prodiPanelOpen" (mousedown)="$event.preventDefault()">
        <div class="sel-empty" *ngIf="prodiSearching">Mencari...</div>
        <div class="sel-empty" *ngIf="!prodiSearching && !prodiFiltered.length && prodiSearch">Tidak ditemukan</div>
        <div class="sel-empty" *ngIf="!prodiSearching && !prodiFiltered.length && !prodiSearch">Ketik untuk mencari prodi</div>
        <table class="sel-table" *ngIf="!prodiSearching && prodiFiltered.length">
          <tbody>
            <tr *ngFor="let p of prodiFiltered" (mousedown)="toggleProdi(p)" [class.selected]="isProdiSelected(p)">
              <td class="sel-check"><span class="chk" [class.chk--on]="isProdiSelected(p)">{{isProdiSelected(p)?'✓':''}}</span></td>
              <td class="sel-jenjang">{{p.jenjang_display||p.jenjang}}</td>
              <td class="sel-nama">{{p.nama}}<span class="sel-pt-label">{{p.pt_nama}}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="chips" *ngIf="selectedProdis.length">
        <span class="chip chip--green" *ngFor="let p of selectedProdis">
          {{p.jenjang}} {{p.nama}}<button class="chip-remove" (click)="toggleProdi(p)">×</button>
        </span>
      </div>
    </div>

    <div class="mode-row">
      <div *ngIf="!canRingkasan" class="ringkasan-warn">Pilih tepat 1 PT atau 1 prodi untuk menampilkan ringkasan.</div>
      <button class="load-btn" style="background:#10b981; margin-left:auto" (click)="loadData()"
        [disabled]="loading || !canRingkasan">
        {{loading ? 'Memuat...' : 'Tampilkan'}}
      </button>
    </div>
  </div>

  <div class="chart-card" style="box-shadow: -4px 0 0 0 #10b981, 0 1px 6px rgba(0,0,0,0.07)">
    <div class="chart-state" *ngIf="!hasData && !loading && !error">
      Pilih 1 PT atau 1 prodi lalu klik <strong>Tampilkan</strong>.
    </div>
    <div class="chart-state" *ngIf="loading">Memuat data...</div>
    <div class="chart-state chart-state--error" *ngIf="error">{{error}}</div>
    <div class="chart-wrap" [style.display]="hasData && !loading ? 'block' : 'none'">
      <canvas #chartCanvas></canvas>
    </div>
  </div>
  </ng-container>

</div>
  `,
  styles: [`
    .mhs-page { max-width: 1400px; margin: 0 auto; padding: 24px 20px 40px; }

    .mhs-header { margin-bottom: 20px; }
    .mhs-title  { font-size: 22px; font-weight: 700; color: #1e293b; margin: 0 0 4px; }
    .mhs-subtitle { font-size: 14px; color: #64748b; margin: 0; }

    /* Page-level tabs */
    .page-tabs {
      display: flex; gap: 4px; margin-bottom: 20px;
      border-bottom: 2px solid #e2e8f0; overflow-x: auto;
    }
    .page-tab {
      display: flex; align-items: center; gap: 6px; white-space: nowrap;
      padding: 10px 18px; font-size: 13px; font-weight: 600; color: #64748b;
      background: none; border: none; cursor: pointer;
      border-bottom: 2px solid transparent; margin-bottom: -2px;
      border-radius: 8px 8px 0 0;
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }
    .page-tab:hover { color: #1e293b; background: #f8fafc; }
    .page-tab.active { color: #6366f1; border-bottom-color: #6366f1; background: #f5f3ff; }
    .page-tab-icon { width: 16px; height: 16px; flex-shrink: 0; }

    /* Metric toggle */
    .metric-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .metric-group { display: flex; gap: 8px; flex-wrap: wrap; }
    .metric-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 14px; font-size: 13px; font-weight: 600;
      border: 1.5px solid #e2e8f0; border-radius: 20px;
      background: #fff; color: #64748b; cursor: pointer;
      transition: all 0.15s;
    }
    .metric-btn.active { border-color: currentColor; background: #fff7ed; color: #f97316; }
    .metric-btn--kombinasi:not(:disabled) { gap: 3px; }
    .metric-btn--kombinasi.active { background: #fff7ed; color: #f97316; }
    .metric-btn:disabled { opacity: .45; cursor: not-allowed; }
    .metric-btn:hover:not(.active) { background: #f8fafc; }
    .metric-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .metric-dot--baru  { background: #22c55e; }
    .metric-dot--lulus { background: #6366f1; }
    .estimasi-note { font-size: 11px; color: #94a3b8; font-style: italic; }

    .filter-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
      padding: 20px; margin-bottom: 20px;
      box-shadow: -4px 0 0 0 #0891b2, 0 1px 6px rgba(0,0,0,0.07);
      display: flex; flex-direction: column; gap: 16px;
    }

    /* Tabs */
    .tabs { display: flex; gap: 4px; border-bottom: 2px solid #f1f5f9; padding-bottom: 0; }
    .tab-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 16px; font-size: 13px; font-weight: 600; color: #64748b;
      background: none; border: none; cursor: pointer; border-radius: 8px 8px 0 0;
      border-bottom: 2px solid transparent; margin-bottom: -2px;
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }
    .tab-btn:hover { color: #0891b2; background: #f0f9ff; }
    .tab-btn.active { color: #0891b2; border-bottom-color: #0891b2; background: #f0f9ff; }
    .tab-icon { width: 16px; height: 16px; flex-shrink: 0; }
    .tab-badge {
      background: #6366f1; color: #fff; border-radius: 10px;
      padding: 1px 7px; font-size: 11px; font-weight: 700;
    }
    .tab-badge--green { background: #22c55e; }

    /* Filter col */
    .filter-col { display: flex; flex-direction: column; gap: 8px; }
    .filter-col-head { display: flex; align-items: center; justify-content: space-between; }
    .filter-col-label { font-size: 13px; font-weight: 700; color: #374151; }
    .clear-btn { font-size: 12px; color: #6366f1; background: none; border: none; cursor: pointer; padding: 0; }
    .clear-btn:hover { text-decoration: underline; }

    .search-input {
      width: 100%; box-sizing: border-box;
      border: 1px solid #d1d5db; border-radius: 8px;
      padding: 8px 12px; font-size: 14px; outline: none;
    }
    .search-input:focus { border-color: #0891b2; box-shadow: 0 0 0 2px rgba(8,145,178,0.15); }

    .sel-panel {
      border: 1px solid #e2e8f0; border-radius: 8px;
      max-height: 220px; overflow-y: auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }
    .sel-empty { padding: 12px 14px; font-size: 13px; color: #94a3b8; text-align: center; }

    .sel-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .sel-table tr { cursor: pointer; transition: background 0.1s; }
    .sel-table tr:hover   { background: #f1f5f9; }
    .sel-table tr.selected{ background: #ede9fe; }
    .sel-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    .sel-table tr:last-child td { border-bottom: none; }

    .sel-check   { width: 28px; text-align: center; }
    .chk {
      display: inline-flex; align-items: center; justify-content: center;
      width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid #d1d5db;
      font-size: 11px; font-weight: 700; color: #fff;
    }
    .chk--on { background: #6366f1; border-color: #6366f1; }
    .sel-singkat { width: 64px; font-weight: 700; color: #6366f1; white-space: nowrap; }
    .sel-jenjang { width: 64px; font-weight: 700; color: #0891b2; white-space: nowrap; font-size: 11px; }
    .sel-nama    { color: #1e293b; line-height: 1.3; }
    .sel-pt-label{ display: block; font-size: 11px; color: #94a3b8; margin-top: 1px; }

    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px;
      border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 600;
    }
    .chip--blue  { background: #ede9fe; color: #5b21b6; }
    .chip--green { background: #dcfce7; color: #166534; }
    .chip-remove {
      background: none; border: none; cursor: pointer;
      font-size: 16px; line-height: 1; padding: 0; color: inherit; opacity: 0.55;
    }
    .chip-remove:hover { opacity: 1; }

    .mode-row {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      border-top: 1px solid #f1f5f9; padding-top: 16px;
    }
    .mode-group { display: flex; align-items: center; gap: 8px; }
    .filter-label { font-size: 13px; font-weight: 600; color: #374151; white-space: nowrap; }

    .toggle-group { display: flex; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
    .toggle-btn {
      padding: 7px 16px; font-size: 13px; font-weight: 600;
      border: none; background: #fff; color: #64748b; cursor: pointer;
      transition: background 0.15s, color 0.15s; border-right: 1px solid #d1d5db;
    }
    .toggle-btn:last-child { border-right: none; }
    .toggle-btn.active { background: #6366f1; color: #fff; }

    .load-btn {
      margin-left: auto;
      background: #0891b2; color: #fff; border: none; border-radius: 8px;
      padding: 9px 24px; font-size: 14px; font-weight: 600; cursor: pointer;
      transition: background 0.15s;
    }
    .load-btn:hover:not(:disabled) { background: #0e7490; }
    .load-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .chart-card {
      background: #fff; border: 1px solid #e2e8f0; border-radius: 14px;
      padding: 20px; box-shadow: -4px 0 0 0 #6366f1, 0 1px 6px rgba(0,0,0,0.07);
      min-height: 200px;
    }
    .chart-wrap { position: relative; }
    .chart-state { text-align: center; padding: 48px 16px; font-size: 14px; color: #94a3b8; }
    .chart-state--error { color: #ef4444; }

    /* Toggle profesi */
    .profesi-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .profesi-toggle {
      display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;
    }
    .profesi-toggle-track {
      position: relative; width: 36px; height: 20px; border-radius: 10px;
      background: #d1d5db; transition: background 0.2s; flex-shrink: 0;
    }
    .profesi-toggle.active .profesi-toggle-track { background: #f97316; }
    .profesi-toggle-thumb {
      position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px; border-radius: 50%; background: #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      transition: left 0.2s;
    }
    .profesi-toggle.active .profesi-toggle-thumb { left: 18px; }
    .profesi-toggle-label { font-size: 13px; color: #374151; }
    .profesi-warn { font-size: 12px; color: #ea580c; font-weight: 600; background: #fff7ed; padding: 4px 10px; border-radius: 6px; border: 1px solid #fed7aa; }

    /* Ringkasan tab */
    .page-tab--ringkasan.active { color: #10b981; border-bottom-color: #10b981; background: #f0fdf4; }
    .ringkasan-legend {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      background: #f8fafc; border-radius: 8px; padding: 10px 14px;
    }
    .rleg-item { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #374151; }
    .rleg-dot  { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .ringkasan-warn { font-size: 13px; color: #f59e0b; font-weight: 600; }
  `]
})
export class MahasiswaTrenComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  pageTab: 'aktif' | 'estimasi' | 'ringkasan' = 'aktif';
  metric:  'baru' | 'lulus' | 'kombinasi' = 'baru';
  activeTab: 'pt' | 'prodi' = 'pt';
  includeProfesi = false;

  // PT filter
  ptSearch    = '';
  ptFiltered: PTOption[] = [];
  selectedPts: PTOption[] = [];
  ptPanelOpen = false;
  ptSearching = false;

  // Prodi filter
  prodiSearch    = '';
  prodiFiltered: ProdiOption[] = [];
  selectedProdis: ProdiOption[] = [];
  prodiPanelOpen = false;
  prodiSearching = false;

  mode: 'gabung' | 'perbandingan' = 'gabung';

  loading = false;
  error   = '';
  hasData = false;

  private chart: Chart | null = null;
  private ptTimer: any;
  private prodiTimer: any;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}
  ngAfterViewInit() {}
  ngOnDestroy()    { if (this.chart) this.chart.destroy(); }

  // ─── Page Tab ───────────────────────────────────────────
  switchPageTab(tab: 'aktif' | 'estimasi' | 'ringkasan') {
    if (this.pageTab === tab) return;
    this.pageTab = tab;
    this.clearChart();
  }

  // ─── Filter Tab ─────────────────────────────────────────
  switchTab(tab: 'pt' | 'prodi') {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.ptPanelOpen    = false;
    this.prodiPanelOpen = false;
    this.clearChart();
  }

  // ─── PT ─────────────────────────────────────────────────
  onPtSearch() {
    clearTimeout(this.ptTimer);
    const q = this.ptSearch.trim();
    if (!q) { this.ptFiltered = []; this.ptSearching = false; return; }
    this.ptSearching = true;
    this.ptTimer = setTimeout(() => {
      const params = new HttpParams().set('search', q).set('page_size', '15').set('ordering', 'singkatan');
      this.http.get<any>(`${environment.apiUrl}/perguruan-tinggi/`, { params }).subscribe({
        next: res => {
          this.ptFiltered = (res.results ?? res).map((p: any) => ({
            id: p.id, nama: p.nama, singkatan: p.singkatan || p.nama.slice(0, 8)
          }));
          this.ptSearching = false;
        },
        error: () => { this.ptSearching = false; }
      });
    }, 350);
  }

  isPtSelected(pt: PTOption) { return !!this.selectedPts.find(p => p.id === pt.id); }

  togglePt(pt: PTOption) {
    if (this.isPtSelected(pt)) this.selectedPts = this.selectedPts.filter(p => p.id !== pt.id);
    else                       this.selectedPts.push(pt);
    if (!this.canKombinasi && this.metric === 'kombinasi') { this.metric = 'baru'; this.clearChart(); }
  }

  closePtPanel() {
    setTimeout(() => { this.ptPanelOpen = false; this.ptSearch = ''; this.ptFiltered = []; }, 150);
  }

  // ─── Prodi ──────────────────────────────────────────────
  onProdiSearch() {
    clearTimeout(this.prodiTimer);
    const q = this.prodiSearch.trim();
    if (!q) { this.prodiFiltered = []; this.prodiSearching = false; return; }
    this.prodiSearching = true;
    this.prodiTimer = setTimeout(() => {
      const params = new HttpParams().set('search', q).set('is_active', 'true').set('page_size', '20');
      this.http.get<any>(`${environment.apiUrl}/program-studi/`, { params }).subscribe({
        next: res => {
          this.prodiFiltered = (res.results ?? res).map((p: any) => ({
            id: p.id, nama: p.nama,
            jenjang: p.jenjang || '',
            jenjang_display: p.jenjang_display || p.jenjang || '',
            pt_nama: p.perguruan_tinggi_nama || ''
          }));
          this.prodiSearching = false;
        },
        error: () => { this.prodiSearching = false; }
      });
    }, 350);
  }

  isProdiSelected(p: ProdiOption) { return !!this.selectedProdis.find(s => s.id === p.id); }

  toggleProdi(p: ProdiOption) {
    if (this.isProdiSelected(p)) this.selectedProdis = this.selectedProdis.filter(s => s.id !== p.id);
    else                         this.selectedProdis.push(p);
    if (!this.canKombinasi && this.metric === 'kombinasi') { this.metric = 'baru'; this.clearChart(); }
  }

  closeProdiPanel() {
    setTimeout(() => { this.prodiPanelOpen = false; this.prodiSearch = ''; this.prodiFiltered = []; }, 150);
  }

  // ─── Mode ───────────────────────────────────────────────
  setMode(m: 'gabung' | 'perbandingan') {
    if (this.mode !== m) { this.mode = m; this.clearChart(); }
  }

  clearChart() {
    if (this.chart) { this.chart.destroy(); this.chart = null; }
    this.hasData = false;
    this.error   = '';
  }

  // ─── Load ───────────────────────────────────────────────
  loadData() {
    this.loading = true;
    this.error   = '';
    this.hasData = false;

    let params = new HttpParams()
      .set('mode',            this.mode)
      .set('filter_by',       this.activeTab)
      .set('include_profesi', String(this.includeProfesi));

    if (this.activeTab === 'pt') {
      this.selectedPts.forEach(p => params = params.append('pt_id', String(p.id)));
    } else {
      this.selectedProdis.forEach(p => params = params.append('prodi_id', String(p.id)));
    }

    const isEstimasi = this.pageTab === 'estimasi';
    const endpoint = isEstimasi ? 'estimasi_mahasiswa' : 'tren_mahasiswa';
    const url = `${environment.apiUrl}/perguruan-tinggi/${endpoint}/`;

    const onSuccess = (res: TrenResponse) => {
      this.loading = false;
      if (!res.labels?.length) { this.error = 'Tidak ada data untuk pilihan ini.'; return; }
      this.hasData = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        try { this.renderChart(res); }
        catch(e) { this.hasData = false; this.error = 'Gagal render chart: ' + (e as Error).message; }
      }, 0);
    };
    const onError = (err: any) => {
      this.loading = false;
      this.error = 'Gagal memuat data: ' + (err.error?.detail || err.message || 'error');
    };

    if (this.pageTab === 'ringkasan') {
      const url2 = `${environment.apiUrl}/perguruan-tinggi/ringkasan_mahasiswa/`;
      this.http.get<TrenResponse>(url2, { params }).subscribe({ next: onSuccess, error: onError });
    } else if (isEstimasi && this.metric === 'kombinasi') {
      const pBaru  = params.set('metric', 'baru');
      const pLulus = params.set('metric', 'lulus');
      forkJoin([
        this.http.get<TrenResponse>(url, { params: pBaru }),
        this.http.get<TrenResponse>(url, { params: pLulus }),
      ]).subscribe({
        next: ([baruRes, lulusRes]) => {
          const baruDs  = baruRes.datasets[0];
          const lulusDs = lulusRes.datasets[0];
          const baruData  = baruDs.data;
          const lulusData = lulusDs.data.map((v: number | null) => (v == null || v === 0) ? null : v);
          const merged: TrenResponse = {
            labels: baruRes.labels,
            datasets: [
              { label: (baruDs.label  || 'Estimasi') + ' — Baru',  data: baruData  },
              { label: (lulusDs.label || 'Estimasi') + ' — Lulus', data: lulusData },
            ],
          };
          onSuccess(merged);
        },
        error: onError,
      });
    } else {
      if (isEstimasi) params = params.set('metric', this.metric);
      this.http.get<TrenResponse>(url, { params }).subscribe({ next: onSuccess, error: onError });
    }
  }

  get chartAccent() { return this.activeTab === 'pt' ? '#6366f1' : '#0891b2'; }

  get metricAccent() {
    if (this.metric === 'baru')       return '#22c55e';
    if (this.metric === 'kombinasi')  return '#f97316';
    return '#6366f1';
  }

  setMetric(m: 'baru' | 'lulus' | 'kombinasi') {
    if (this.metric !== m) { this.metric = m; this.clearChart(); }
  }

  toggleProfesi() {
    this.includeProfesi = !this.includeProfesi;
    this.clearChart();
  }

  get canKombinasi(): boolean {
    if (this.activeTab === 'pt')    return this.selectedPts.length <= 1;
    if (this.activeTab === 'prodi') return this.selectedProdis.length <= 1;
    return true;
  }

  get canRingkasan(): boolean {
    if (this.activeTab === 'pt')    return this.selectedPts.length === 1;
    if (this.activeTab === 'prodi') return this.selectedProdis.length === 1;
    return false;
  }

  private renderChart(res: TrenResponse) {
    if (this.chart) { this.chart.destroy(); this.chart = null; }

    const isGabung = res.datasets.length === 1;
    const isEstimasi = this.pageTab === 'estimasi';
    const isRingkasan = this.pageTab === 'ringkasan';
    const isKombinasi = isEstimasi && this.metric === 'kombinasi';
    const KOMBINASI_COLORS  = ['#22c55e', '#6366f1'];
    const RINGKASAN_COLORS  = ['#0891b2', '#22c55e', '#6366f1'];
    const datasets = res.datasets.map((ds, i) => {
      const color = isRingkasan ? RINGKASAN_COLORS[i] :
                    isKombinasi ? KOMBINASI_COLORS[i] :
                    isGabung   ? (isEstimasi ? this.metricAccent : this.chartAccent) :
                    COLORS[i % COLORS.length];
      // untuk estimasi lulus (standalone), nilai 0 di awal berarti belum tersedia → null
      // ringkasan: backend sudah mengirim null, tidak perlu transform
      const data = (!isRingkasan && isEstimasi && this.metric === 'lulus')
        ? ds.data.map((v) => (v == null || v === 0) ? null : v)
        : ds.data;
      return {
        label: ds.label,
        data,
        borderColor:     color,
        backgroundColor: color + '22',
        tension: 0.35,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: isGabung && !isRingkasan,
        spanGaps: false,
      };
    });

    const config: ChartConfiguration = {
      type: 'line',
      data: { labels: res.labels, datasets },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: datasets.length > 1 || isRingkasan,
            position: 'bottom',
            labels: { boxWidth: 14, font: { size: 12 }, padding: 16 }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y).toLocaleString('id')}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45 } },
          y: {
            beginAtZero: false,
            grace: '10%',
            ticks: {
              font: { size: 11 },
              callback: (v: any) => Number(v).toLocaleString('id')
            }
          }
        }
      }
    };
    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }
}
