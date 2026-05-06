#!/bin/sh
set -e

mkdir -p \
    bootstrap/cache \
    storage/app/public \
    storage/database \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs

if [ ! -f .env ]; then
    cp .env.example .env
fi

php artisan config:clear >/dev/null 2>&1 || true

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    db_path="${DB_DATABASE:-/var/www/html/storage/database/database.sqlite}"
    mkdir -p "$(dirname "$db_path")"
    touch "$db_path"
    chown www-data:www-data "$db_path"
fi

if [ "${DB_CONNECTION:-sqlite}" = "mysql" ] || [ "${DB_CONNECTION:-sqlite}" = "mariadb" ]; then
    php -r '
        $host = getenv("DB_HOST") ?: "db";
        $port = getenv("DB_PORT") ?: "3306";
        $database = getenv("DB_DATABASE") ?: "laravel";
        $username = getenv("DB_USERNAME") ?: "root";
        $password = getenv("DB_PASSWORD") ?: "";
        $dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";

        for ($i = 0; $i < 60; $i++) {
            try {
                new PDO($dsn, $username, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                exit(0);
            } catch (Throwable $e) {
                fwrite(STDERR, "Waiting for database...\n");
                sleep(2);
            }
        }

        fwrite(STDERR, "Database connection failed.\n");
        exit(1);
    '
fi

if [ "${APP_ENV:-local}" = "production" ] && [ -z "${APP_KEY:-}" ] && ! grep -Eq '^APP_KEY=base64:.+' .env; then
    echo "APP_KEY must be set for production. Generate one with: php artisan key:generate --show" >&2
    exit 1
fi

if [ -z "${APP_KEY:-}" ] && ! grep -Eq '^APP_KEY=base64:.+' .env; then
    php artisan key:generate --force --no-interaction
fi

php artisan storage:link --force >/dev/null 2>&1 || true
php artisan migrate --force --no-interaction
php artisan config:cache
php artisan view:cache

chown -R www-data:www-data bootstrap/cache storage public/storage 2>/dev/null || true

exec "$@"
