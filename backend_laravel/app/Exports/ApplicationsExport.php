<?php

namespace App\Exports;

use App\Models\Application;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class ApplicationsExport implements FromArray, ShouldAutoSize
{
    public function array(): array
    {
        $rows = [];

        $statusLabel = [
            'pending' => 'На рассмотрении',
            'accepted' => 'Принято',
            'revision' => 'На доработку',
            'rejected' => 'Отклонено',
        ];

        $rows[] = [
            '№',
            'Email',
            'Номер телефона',
            'Название доклада',
            'Авторы',
            'Ученая степень, ученое звание, должность',
            'Направление',
            'Научный руководитель',
            'Должность научного руководителя',
            'Степень научного руководителя',
            'Форма участия',
            'Бронирование гостиницы',
            'Оплата',
            'Подпись',
            'Файл доклада',
            'Статус',
        ];

        $applications = Application::query()
            ->orderBy('id')
            ->get();

        foreach ($applications as $index => $app) {
            $reportFileUrl = $app->file_path ? url('storage/' . ltrim($app->file_path, '/')) : '';

            $rows[] = [
                $index + 1,
                $app->email,
                $app->phone,
                $app->report_title,
                $app->full_name,
                $app->academic_degree . ', ' . $app->organization_position,
                $app->direction,
                $app->supervisor_full_name,
                $app->supervisor_organization_position,
                $app->supervisor_academic_degree,
                $app->participation_form,
                $app->hotel_booking_needed ? 'Да' : 'Нет',
                $app->payment_receipt_path ? 'Чек загружен' : 'Чека нет',
                '',
                $reportFileUrl,
                $statusLabel[$app->status] ?? $app->status,
            ];
        }

        return $rows;
    }
}
