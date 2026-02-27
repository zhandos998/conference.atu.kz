<?php

namespace App\Exports;

use App\Models\Application;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;

class ApplicationsExport implements FromArray, ShouldAutoSize, WithEvents
{
    private array $hyperlinks = [];

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
            $excelRow = $index + 2;
            $receiptUrl = $app->payment_receipt_path ? url('storage/' . ltrim($app->payment_receipt_path, '/')) : '';
            $reportFileUrl = $app->file_path ? url('storage/' . ltrim($app->file_path, '/')) : '';

            if ($receiptUrl) {
                $this->hyperlinks["M{$excelRow}"] = $receiptUrl;
            }

            if ($reportFileUrl) {
                $this->hyperlinks["O{$excelRow}"] = $reportFileUrl;
            }

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
                $receiptUrl ? 'Открыть чек' : 'Чека нет',
                '',
                $reportFileUrl ? 'Открыть файл' : 'Файл не загружен',
                $statusLabel[$app->status] ?? $app->status,
            ];
        }

        return $rows;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event): void {
                foreach ($this->hyperlinks as $cell => $url) {
                    $sheet = $event->sheet->getDelegate();
                    $sheet->getCell($cell)->getHyperlink()->setUrl($url);

                    $sheet->getStyle($cell)->getFont()
                        ->getColor()->setRGB('0563C1');
                    $sheet->getStyle($cell)->getFont()
                        ->setUnderline(true);
                }
            },
        ];
    }
}