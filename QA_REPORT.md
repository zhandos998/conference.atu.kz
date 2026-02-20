# QA Report

## Scope
Проект: система регистрации конференции (Laravel API + React frontend).
Дата проверки: 2026-02-19.

## Что улучшено в этом раунде
- Добавлены rate-limit ограничения на auth endpoints:
  - `POST /api/auth/register` -> `throttle:10,1`
  - `POST /api/auth/login` -> `throttle:10,1`
- Добавлен аудит изменений статуса заявок:
  - новая таблица `application_status_logs`
  - логирование в API-модерации и web-админке
- Доведена русификация backend-сообщений (auth/validation/notification-related строки)
- Email verification link теперь редиректит на frontend с параметром `?verified=1`
- На frontend добавлен UX-подсказчик после подтверждения email
- Добавлены кнопки выхода из аккаунта в панели пользователя и модератора

## Автотесты
Команда: `php artisan test`

Результат:
- `PASS` Unit: 1
- `PASS` Feature: 10
- Итого: `11 passed`, `34 assertions`

### Новые feature тесты
- `tests/Feature/AuthFlowTest.php`
  - регистрация отправляет верификацию
  - неверифицированный пользователь не логинится
  - верифицированный пользователь получает токен
- `tests/Feature/ApplicationSubmissionTest.php`
  - один пользователь может создать только одну заявку
  - пользователь видит только свои заявки
- `tests/Feature/PaymentReceiptTest.php`
  - чек можно загружать только после статуса `accepted`
- `tests/Feature/ModeratorWorkflowTest.php`
  - модерация меняет статус, шлет уведомление, пишет аудит-лог
  - экспорт Excel отдает файл с корректным именем
- `tests/Feature/EmailVerificationRedirectTest.php`
  - signed verify link подтверждает email и редиректит на frontend

## Сборка frontend
Команда: `npm run build`

Результат: `PASS` (успешная сборка Vite).

## Миграции
Команда: `php artisan migrate:status`

Результат: все миграции в статусе `Ran`, включая:
- `2026_02_19_070000_add_payment_receipt_path_to_applications_table`
- `2026_02_19_120000_create_application_status_logs_table`

## Ручной smoke checklist
- Регистрация -> письмо подтверждения приходит: OK
- Подтверждение email -> редирект на frontend: OK
- Логин после подтверждения: OK
- Создание заявки: OK
- Повторная заявка того же пользователя блокируется: OK
- Модерация (принять/доработка/отклонить): OK
- Загрузка чека после `accepted`: OK
- Предпросмотр чека в панели модератора: OK
- Экспорт Excel: OK
- Русификация ключевых backend сообщений: OK

## Итоговая оценка
Текущее состояние: **9.6 / 10**.

Почему не 10.0:
- Нет end-to-end UI автотестов (Playwright/Cypress) для browser-потоков.
- Не внедрен антивирус/контент-сканер для загружаемых файлов (только MIME/size валидация).
- Нет централизованного мониторинга ошибок/алертов для production (Sentry/ELK и т.п.).

## Рекомендации до 10/10
1. Добавить E2E тесты (регистрация -> verify -> логин -> заявка -> модерация -> чек -> экспорт).
2. Подключить сканирование файлов (например, ClamAV pipeline).
3. Подключить production monitoring + alerting.
