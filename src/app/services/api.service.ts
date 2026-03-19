import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface BanptIdx { np: string; npt: string; j: string; p: string; sk: string; exp: string | null; }

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;

  // ── BAN-PT client-side search ──────────────────────────────────
  private banptIdx$: Observable<BanptIdx[]> | null = null;

  private loadBanptIdx(): Observable<BanptIdx[]> {
    if (!this.banptIdx$) {
      this.banptIdx$ = this.http.get<BanptIdx[]>('/assets/banpt_idx.json')
        .pipe(shareReplay(1));
    }
    return this.banptIdx$;
  }

  private static normalize(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  }

  private static tokens(s: string): Set<string> {
    const stop = new Set(['dan','atau','di','ke','dari','untuk','the','of','and','in']);
    return new Set(ApiService.normalize(s).split(/\s+/).filter(w => w && !stop.has(w)));
  }

  private static similarity(a: string, b: string): number {
    const an = ApiService.normalize(a), bn = ApiService.normalize(b);
    // sequence ratio (LCS-based)
    const la = an.length, lb = bn.length;
    if (!la || !lb) return 0;
    const dp = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
    let lcs = 0;
    for (let i = 1; i <= la; i++)
      for (let j = 1; j <= lb; j++)
        if (an[i-1] === bn[j-1]) { dp[i][j] = dp[i-1][j-1] + 1; lcs = Math.max(lcs, dp[i][j]); }
    const seqScore = (2 * lcs) / (la + lb);
    // token overlap
    const ta = ApiService.tokens(a), tb = ApiService.tokens(b);
    const inter = [...ta].filter(w => tb.has(w)).length;
    const union = new Set([...ta, ...tb]).size;
    const tokScore = union ? inter / union : 0;
    return 0.5 * seqScore + 0.5 * tokScore;
  }

  private static extractJenjang(raw: string): string {
    const m = raw.match(/\b(D[1-4]|Diploma\s*([1-4])|S[1-3]|Profesi)\b/i);
    if (!m) return raw.trim().toUpperCase();
    if (m[2]) return 'D' + m[2];
    return m[1].toUpperCase();
  }

  private static isMuhOrg(npt: string): boolean {
    const n = npt.toLowerCase();
    return n.includes('muhammadiyah') || n.includes('aisyiyah') || n.includes('ahmad dahlan');
  }

  banptProdiSearch(nama: string, jenjang: string): Observable<any[]> {
    const jCode = ApiService.extractJenjang(jenjang);
    return this.loadBanptIdx().pipe(
      map(data => {
        const org = data.filter(r => ApiService.isMuhOrg(r.npt));

        const toResult = (r: BanptIdx, sim: number) => ({
          nama_prodi: r.np, nama_pt: r.npt, jenjang: r.j,
          peringkat: r.p, nomor_sk: r.sk, tgl_expired: r.exp,
          similarity: Math.round(sim * 100)
        });

        const byAlpha = (a: any, b: any) => a.nama_pt.localeCompare(b.nama_pt, 'id');

        // Hanya tampilkan: nama prodi mirip + jenjang sama + PT Muhammadiyah/Aisyiyah/Ahmad Dahlan
        return org
          .filter(r => !jCode || r.j.toUpperCase() === jCode)
          .map(r => ({ sim: ApiService.similarity(nama, r.np), r }))
          .filter(x => x.sim > 0.80)
          .map(x => toResult(x.r, x.sim))
          .sort((a, b) => byAlpha(b, a));
      })
    );
  }

  constructor(private http: HttpClient) {}

  getPerguruanTinggiList(params?: any): Observable<any> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.http.get(`${this.baseUrl}/perguruan-tinggi/`, { params: httpParams });
  }
  getPerguruanTinggiDetail(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/perguruan-tinggi/${id}/`);
  }
  createPerguruanTinggi(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/perguruan-tinggi/`, data);
  }
  updatePerguruanTinggi(id: number, data: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/perguruan-tinggi/${id}/`, data);
  }
  deletePerguruanTinggi(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/perguruan-tinggi/${id}/`);
  }
  getStatistikPT(wilayahIds?: number[]): Observable<any> {
    let params = new HttpParams();
    if (wilayahIds && wilayahIds.length > 0) {
      for (const id of wilayahIds) {
        params = params.append('wilayah_id', id.toString());
      }
    }
    return this.http.get(`${this.baseUrl}/perguruan-tinggi/statistik/`, { params });
  }
  getSebaranPeta(): Observable<any> {
    return this.http.get(`${this.baseUrl}/perguruan-tinggi/sebaran_peta/`);
  }
  getTrenMahasiswa(mode: string, ptIds: number[] = []): Observable<any> {
    let params = new HttpParams().set('mode', mode);
    for (const id of ptIds) params = params.append('pt_id', id.toString());
    return this.http.get(`${this.baseUrl}/perguruan-tinggi/tren_mahasiswa/`, { params });
  }
  getWilayahList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/wilayah/`);
  }
  getLaporanList(params?: any): Observable<any> {
    const httpParams = new HttpParams({ fromObject: params || {} });
    return this.http.get(`${this.baseUrl}/laporan-pt/`, { params: httpParams });
  }
  getLaporanDetail(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/laporan-pt/${id}/`);
  }
  submitLaporan(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/laporan-pt/${id}/submit/`, {});
  }
  approveLaporan(id: number, catatan: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/laporan-pt/${id}/approve/`, { catatan });
  }
  rejectLaporan(id: number, catatan: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/laporan-pt/${id}/reject/`, { catatan });
  }
  getRekapKepatuhan(periodeId?: number): Observable<any> {
    const params = periodeId ? new HttpParams().set('periode_id', periodeId.toString()) : undefined;
    return this.http.get(`${this.baseUrl}/laporan-pt/rekap_kepatuhan/`, { params });
  }
  getPeriodeAktif(): Observable<any> {
    return this.http.get(`${this.baseUrl}/periode-pelaporan/aktif/`);
  }
  getPeriodeList(): Observable<any> {
    return this.http.get(`${this.baseUrl}/periode-pelaporan/`);
  }
  getNotifikasi(): Observable<any> {
    return this.http.get(`${this.baseUrl}/notifikasi/`);
  }
  tandaiBacaSemuaNotifikasi(): Observable<any> {
    return this.http.post(`${this.baseUrl}/notifikasi/tandai_baca_semua/`, {});
  }
  getProgramStudiGrouped(params?: HttpParams): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/program-studi/grouping/`, { params });
  }

  getProgramStudiPtList(nama: string, jenjang: string): Observable<any[]> {
    const params = new HttpParams().set('nama', nama).set('jenjang', jenjang);
    return this.http.get<any[]>(`${this.baseUrl}/program-studi/pt_list/`, { params });
  }

  getDosenStats(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/dosen-stats/`);
  }

  dosenSearch(params: any): Observable<any> {
    let p = new HttpParams();
    Object.keys(params).forEach(k => { if (params[k]) p = p.set(k, params[k]); });
    return this.http.get<any>(`${this.baseUrl}/dosen-search/`, { params: p });
  }

  updateProgramStudi(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.baseUrl}/program-studi/${id}/`, data);
  }
}
