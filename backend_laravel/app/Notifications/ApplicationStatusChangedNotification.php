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

        $mail = (new MailMessage)
            ->subject('Обновление статуса заявки')
            ->line('Статус вашей заявки обновлен.')
            ->line('Новый статус: ' . $statusLabel);

        if (! empty($this->comment)) {
            $mail->line('Комментарий модератора: ' . $this->normalizeUtf8($this->comment));
        }

        return $mail->line('Спасибо за участие в конференции.');
    }

    private function normalizeUtf8(string $value): string
    {
        if (mb_check_encoding($value, 'UTF-8')) {
            return $value;
        }

        return mb_convert_encoding($value, 'UTF-8', 'Windows-1251,CP1251,ISO-8859-1,UTF-8');
    }
}
