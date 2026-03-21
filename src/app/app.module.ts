import { NgModule, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { DatePipe, registerLocaleData } from '@angular/common';
import localeId from '@angular/common/locales/id';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

registerLocaleData(localeId);
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { PerguruanTinggiListComponent } from './components/perguruan-tinggi/list.component';
import { PerguruanTinggiDetailComponent } from './components/perguruan-tinggi/detail.component';
import { LaporanComponent } from './components/laporan/laporan.component';
import { LoginComponent } from './components/auth/login.component';
import { LayoutComponent } from './components/layout/layout.component';
import { StatistikComponent } from './components/statistik/statistik.component';
import { ProgramStudiListComponent } from './components/program-studi/list.component';
import { DosenListComponent } from './components/dosen/list.component';
import { PendidikanTinggiComponent } from './components/pendidikan-tinggi/pendidikan-tinggi.component';
import { MahasiswaTrenComponent } from './components/mahasiswa/mahasiswa-tren.component';
import { SintaComponent } from './components/sinta/sinta.component';
import {
  SintaAfiliasiComponent, SintaDepartemenComponent, SintaAuthorComponent,
  SintaArtikelComponent, SintaPenelitianComponent, SintaPengabdianComponent,
  SintaIprComponent, SintaBukuComponent,
} from './components/sinta/pages';

import { AuthService } from './services/auth.service';
import { ApiService } from './services/api.service';
import { AuthInterceptor } from './services/auth.interceptor';
import { AuthGuard } from './services/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'perguruan-tinggi', component: PerguruanTinggiListComponent },
      { path: 'perguruan-tinggi/:id', component: PerguruanTinggiDetailComponent },
      { path: 'program-studi', component: ProgramStudiListComponent },
      { path: 'dosen', component: DosenListComponent },
      { path: 'laporan', component: LaporanComponent, canActivate: [AuthGuard] },
      { path: 'pendidikan-tinggi', component: PendidikanTinggiComponent },
      { path: 'mahasiswa', component: MahasiswaTrenComponent },
      { path: 'statistik', component: StatistikComponent },
      { path: 'sinta', component: SintaComponent },
      { path: 'sinta/afiliasi',   component: SintaAfiliasiComponent },
      { path: 'sinta/departemen', component: SintaDepartemenComponent },
      { path: 'sinta/author',     component: SintaAuthorComponent },
      { path: 'sinta/artikel',    component: SintaArtikelComponent },
      { path: 'sinta/penelitian', component: SintaPenelitianComponent },
      { path: 'sinta/pengabdian', component: SintaPengabdianComponent },
      { path: 'sinta/ipr',        component: SintaIprComponent },
      { path: 'sinta/buku',       component: SintaBukuComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    PerguruanTinggiListComponent,
    PerguruanTinggiDetailComponent,
    ProgramStudiListComponent,
    DosenListComponent,
    PendidikanTinggiComponent,
    LaporanComponent,
    LoginComponent,
    LayoutComponent,
    StatistikComponent,
    SintaComponent,
    SintaAfiliasiComponent, SintaDepartemenComponent, SintaAuthorComponent,
    SintaArtikelComponent, SintaPenelitianComponent, SintaPengabdianComponent,
    SintaIprComponent, SintaBukuComponent,
    MahasiswaTrenComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule.forRoot(routes),
  ],
  providers: [
    DatePipe,
    AuthService,
    ApiService,
    AuthGuard,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    { provide: LOCALE_ID, useValue: 'id' },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
