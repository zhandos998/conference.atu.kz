# Conference Registration System (Laravel API + React)

## Stack
- Backend: Laravel 12 + Sanctum
- Frontend: React + Vite
- Auth: email/password + email verification
- Roles: user, moderator
- Files: `storage/app/public`
- Notifications: email on status change
- Export: Laravel Excel

## Backend setup
```bash
cd backend
composer create-project laravel/laravel . "^12.0"
composer require laravel/sanctum maatwebsite/excel
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan storage:link
php artisan migrate --seed
```

Enable providers (if needed):
- `App\Providers\AuthServiceProvider::class`

Set `.env` mail config (`MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`).

## Frontend setup
```bash
cd frontend
npm create vite@latest . -- --template react
npm i axios
npm run dev
```

## Production Docker setup

Create the deployment env file:
```bash
cp .env.example .env
```

Generate a stable Laravel application key and put it into `APP_KEY`:
```bash
cd backend_laravel
php artisan key:generate --show
```

Before starting containers, edit the root `.env`:
- replace `MYSQL_PASSWORD` and `MYSQL_ROOT_PASSWORD` with long random values
- set `APP_URL` and `FRONTEND_URL` to the public domain
- set `FRONTEND_PORT` to the host port nginx should expose, usually `80`
- configure real `MAIL_*` values if registration/reset/status emails must be sent; the default `MAIL_MAILER=log` only writes emails to logs

Start the production stack:
```bash
docker compose up -d --build
```

After startup:
- Frontend: `http://localhost` or the configured public domain
- API through nginx: `/api`
- Admin pages through nginx: `/admin/login`

The Docker setup uses MySQL in the `mysql_data` volume and Laravel uploads/cache in the `backend_storage` volume. The backend container waits for MySQL, runs migrations, creates the Laravel storage link, and caches Laravel config/views on startup.

For production safety, only the frontend nginx port is published by default. MySQL and the Laravel Apache container stay on the internal Docker network.

To remove Docker data and start with a clean database:
```bash
docker compose down -v
```

## REST API examples
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/email/verify/{id}/{hash}`
- `POST /api/email/verification-notification`
- `GET /api/me`
- `GET /api/applications` (user own only)
- `POST /api/applications`
- `GET /api/applications/{id}`
- `GET /api/moderator/applications?status=pending`
- `PATCH /api/moderator/applications/{id}/status`
- `GET /api/moderator/applications-export`

## Generated files
- Migrations: `backend/database/migrations/*users*, *applications*`
- Models: `backend/app/Models/User.php`, `backend/app/Models/Application.php`
- Policy/Gate: `backend/app/Policies/ApplicationPolicy.php`, `backend/app/Providers/AuthServiceProvider.php`
- Controllers:
  - `backend/app/Http/Controllers/Api/Auth/AuthController.php`
  - `backend/app/Http/Controllers/Api/ApplicationController.php`
  - `backend/app/Http/Controllers/Api/ModeratorApplicationController.php`
- Requests:
  - `backend/app/Http/Requests/RegisterRequest.php`
  - `backend/app/Http/Requests/StoreApplicationRequest.php`
  - `backend/app/Http/Requests/UpdateApplicationStatusRequest.php`
- Email notification: `backend/app/Notifications/ApplicationStatusChangedNotification.php`
- Excel export: `backend/app/Exports/ApplicationsExport.php`
- Seeder: `backend/database/seeders/DatabaseSeeder.php`
- Routes: `backend/routes/api.php`
- React pages:
  - `frontend/src/pages/auth/LoginPage.jsx`
  - `frontend/src/pages/auth/RegisterPage.jsx`
  - `frontend/src/pages/user/UserDashboard.jsx`
  - `frontend/src/pages/moderator/ModeratorDashboard.jsx`
  - `frontend/src/App.jsx`

## Notes
- User sees only own applications via policy.
- Moderator can review all applications, filter by status, change status, add comments, and export Excel.
- On status change, user gets email with new status and moderator comment.
