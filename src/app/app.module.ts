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
      { path: 'laporan', component: LaporanComponent, canActivate: [AuthGuard] },
      { path: 'statistik', component: StatistikComponent },
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
    LaporanComponent,
    LoginComponent,
    LayoutComponent,
    StatistikComponent,
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
