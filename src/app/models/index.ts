// models/index.ts - TypeScript interfaces for PTMA data models

export interface Wilayah {
  id: number;
  kode: string;
  nama: string;
  provinsi: string;
  total_pt: number;
}

export interface PerguruanTinggi {
  id: number;
  kode_pt: string;
  nama: string;
  singkatan: string;
  jenis: 'universitas' | 'institut' | 'sekolah_tinggi' | 'politeknik' | 'akademi';
  organisasi_induk: 'muhammadiyah' | 'aisyiyah';
  wilayah: Wilayah;
  wilayah_nama?: string;
  alamat: string;
  kota: string;
  provinsi: string;
  kode_pos?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  email?: string;
  telepon?: string;
  akreditasi_institusi: 'unggul' | 'baik_sekali' | 'baik' | 'belum';
  nomor_sk_akreditasi?: string;
  tanggal_sk_akreditasi?: string;
  tanggal_kadaluarsa_akreditasi?: string;
  is_active: boolean;
  tahun_berdiri?: number;
  logo?: string;
  total_prodi?: number;
  total_mahasiswa?: number;
  program_studi?: ProgramStudi[];
  data_mahasiswa?: DataMahasiswa[];
  data_dosen?: DataDosen[];
  created_at: string;
  updated_at: string;
}

export interface ProgramStudi {
  id: number;
  kode_prodi: string;
  nama: string;
  jenjang: string;
  jenjang_display: string;
  akreditasi: string;
  akreditasi_display: string;
  no_sk_akreditasi?: string;
  tanggal_kedaluarsa_akreditasi?: string;
  mahasiswa_aktif_periode?: number;
  dosen_tetap_periode?: number;
  is_active: boolean;
}

export interface DataMahasiswa {
  id: number;
  tahun_akademik: string;
  semester: string;
  mahasiswa_baru: number;
  mahasiswa_aktif: number;
  mahasiswa_lulus: number;
  mahasiswa_dropout: number;
  mahasiswa_pria: number;
  mahasiswa_wanita: number;
}

export interface DataDosen {
  id: number;
  tahun: number;
  dosen_tetap: number;
  dosen_tidak_tetap: number;
  dosen_s3: number;
  dosen_s2: number;
  dosen_s1: number;
  dosen_guru_besar: number;
  dosen_lektor_kepala: number;
  dosen_lektor: number;
  dosen_asisten_ahli: number;
  dosen_bersertifikat: number;
}

export interface StatistikPT {
  total_pt: number;
  total_muhammadiyah: number;
  total_aisyiyah: number;
  total_prodi: number;
  total_mahasiswa: number;
  per_jenis: { jenis: string; total: number }[];
  per_akreditasi: { akreditasi_institusi: string; total: number }[];
  per_wilayah: { wilayah__nama: string; wilayah__provinsi: string; total: number }[];
}

export interface PeriodePelaporan {
  id: number;
  nama: string;
  tahun: number;
  semester: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status: 'draft' | 'aktif' | 'selesai' | 'arsip';
  total_laporan: number;
  laporan_submitted: number;
}

export interface LaporanPT {
  id: number;
  pt_nama: string;
  pt_singkatan: string;
  pt_organisasi: string;
  periode_nama: string;
  status: 'belum' | 'draft' | 'submitted' | 'review' | 'approved' | 'rejected';
  status_display: string;
  persentase_pengisian: number;
  skor_total: number;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RekapKepatuhan {
  total: number;
  approved: number;
  submitted: number;
  rejected: number;
  draft: number;
  belum: number;
  persen_kepatuhan: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_display: string;
  perguruan_tinggi?: number;
  pt_nama?: string;
  pt_singkatan?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}
