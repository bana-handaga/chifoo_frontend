import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
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

import { AuthService } from './services/auth.service';
import { ApiService } from './services/api.service';
import { AuthInterceptor } from './services/auth.interceptor';
import { AuthGuard } from './services/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'perguruan-tinggi', component: PerguruanTinggiListComponent },
      { path: 'perguruan-tinggi/:id', component: PerguruanTinggiDetailComponent },
      { path: 'laporan', component: LaporanComponent },
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
    AuthService,
    ApiService,
    AuthGuard,
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
