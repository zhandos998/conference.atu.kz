<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ApplicationSubmittedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Application $application,
        private readonly bool $isRevisionResubmission = false,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = $this->isRevisionResubmission
            ? 'Исправленная заявка повторно отправлена'
            : 'Заявка на конференцию отправлена';

        $firstLine = $this->isRevisionResubmission
            ? 'Ваша исправленная заявка успешно отправлена на повторное рассмотрение.'
            : 'Ваша заявка успешно отправлена и принята в обработку.';

        return (new MailMessage)
            ->subject($subject)
            ->line($firstLine)
            ->line('Название доклада: ' . $this->application->report_title)
            ->line('Текущий статус: На рассмотрении')
            ->line('Мы отправим отдельное письмо при изменении статуса заявки.');
    }
}
