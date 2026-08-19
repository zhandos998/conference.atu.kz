<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationStatusChangedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $status,
        private readonly ?string $comment,
        private readonly ?Application $application = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $statusLabel = match ($this->status) {
            Application::STATUS_ACCEPTED => 'Принято',
            Application::STATUS_REVISION => 'На доработку',
            Application::STATUS_REJECTED => 'Отклонено',
            default => 'На рассмотрении',
        };

        $subject = $this->status === Application::STATUS_ACCEPTED
            ? 'Заявка принята: требуется оплата'
            : 'Обновление статуса заявки';

        $mail = (new MailMessage)
            ->subject($subject)
            ->line('Статус вашей заявки обновлен.')
            ->line('Новый статус: ' . $statusLabel);

        if ($this->status === Application::STATUS_ACCEPTED) {
            $mail
                ->line('Ваша заявка принята.')
                ->line('Следующий шаг: оплатите участие и загрузите чек об оплате в личном кабинете.')
                ->line('Чек можно загрузить на странице заявки после входа в систему.');

            if ($this->application) {
                $mail->action('Открыть заявку', $this->applicationUrl());
            }
        }

        if (! empty($this->comment)) {
            $mail->line('Комментарий модератора: ' . $this->normalizeUtf8($this->comment));
        }

        return $mail->line('Спасибо за участие в конференции.');
    }

    private function applicationUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/') . '/applications/' . $this->application->id;
    }

    private function normalizeUtf8(string $value): string
    {
        if (mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        return mb_convert_encoding($value, 'UTF-8', 'Windows-1251,CP1251,ISO-8859-1,UTF-8');
    }
}
