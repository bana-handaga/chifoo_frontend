# PTMA Monitor — Frontend (Angular 17)

## Persyaratan
- Node.js 18+
- Angular CLI 17

## Development Lokal

```bash
npm install
ng serve
# Buka http://localhost:4200
```

## Build Production

1. Edit `src/environments/environment.prod.ts`:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://api.DOMAIN-ANDA.com/api'
   };
   ```

2. Build:
   ```bash
   ng build --configuration production
   ```

3. Hasil build ada di folder `dist/ptma-frontend/browser/`

4. Upload SELURUH ISI folder `dist/ptma-frontend/browser/` beserta file `.htaccess`
   ke subdomain hosting (misalnya: app.ptma-monitor.com)

## Fitur
- Dashboard dengan statistik nasional
- Daftar & detail perguruan tinggi
- Manajemen laporan dengan workflow approval
- Halaman statistik & analisis data
- Autentikasi dengan token
