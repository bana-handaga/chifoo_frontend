import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.prod';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;
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
}
