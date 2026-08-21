<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    public const KEY_APPLICATION_SUBMISSION_ENABLED = 'application_submission_enabled';
    public const KEY_APPLICATION_SUBMISSION_ENABLED_INTERNATIONAL = 'application_submission_enabled_international';
    public const KEY_CONFERENCE_FEES = 'conference_fees';
    public const KEY_CONFERENCE_FEES_INTERNATIONAL = 'conference_fees_international';

    public const DEFAULT_CONFERENCE_FEES = [
        'participant' => [
            'kz' => ['amount' => 5000, 'currency' => 'KZT'],
            'foreign' => ['amount' => 30, 'currency' => 'USD'],
        ],
        'student' => [
            'kz' => ['amount' => 3000, 'currency' => 'KZT'],
            'foreign' => ['amount' => 20, 'currency' => 'USD'],
        ],
    ];

    protected $fillable = [
        'key',
        'value',
    ];

    public static function getBoolean(string $key, bool $default = false): bool
    {
        $value = static::query()
            ->where('key', $key)
            ->value('value');

        if ($value === null) {
            return $default;
        }

        return filter_var($value, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE) ?? $default;
    }

    public static function setBoolean(string $key, bool $value): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value ? '1' : '0'],
        );
    }

    public static function applicationSubmissionKey(?string $conferenceType): string
    {
        return Application::normalizeConferenceType($conferenceType) === Application::CONFERENCE_INTERNATIONAL
            ? self::KEY_APPLICATION_SUBMISSION_ENABLED_INTERNATIONAL
            : self::KEY_APPLICATION_SUBMISSION_ENABLED;
    }

    public static function conferenceFeesKey(?string $conferenceType): string
    {
        return Application::normalizeConferenceType($conferenceType) === Application::CONFERENCE_INTERNATIONAL
            ? self::KEY_CONFERENCE_FEES_INTERNATIONAL
            : self::KEY_CONFERENCE_FEES;
    }

    public static function getConferenceFees(?string $conferenceType = null): array
    {
        $value = static::query()
            ->where('key', self::conferenceFeesKey($conferenceType))
            ->value('value');

        $decoded = is_string($value) ? json_decode($value, true) : null;

        return self::normalizeConferenceFees(is_array($decoded) ? $decoded : []);
    }

    public static function setConferenceFees(array $fees, ?string $conferenceType = null): void
    {
        static::query()->updateOrCreate(
            ['key' => self::conferenceFeesKey($conferenceType)],
            ['value' => json_encode(self::normalizeConferenceFees($fees), JSON_UNESCAPED_UNICODE)],
        );
    }

    public static function conferenceFeeFor(?string $category, ?string $countryGroup, ?string $conferenceType = null): array
    {
        $fees = self::getConferenceFees($conferenceType);
        $categoryKey = array_key_exists((string) $category, $fees) ? (string) $category : 'participant';
        $countryGroupKey = array_key_exists((string) $countryGroup, $fees[$categoryKey]) ? (string) $countryGroup : 'kz';

        return $fees[$categoryKey][$countryGroupKey];
    }

    public static function conferenceFeeForApplication(Application $application): array
    {
        if ($application->payment_fee_amount !== null && $application->payment_fee_currency) {
            return [
                'amount' => (float) $application->payment_fee_amount,
                'currency' => $application->payment_fee_currency,
            ];
        }

        return self::conferenceFeeFor($application->participant_category, $application->country_group, $application->conference_type);
    }

    public static function formatConferenceFee(array $fee): string
    {
        $amount = (float) ($fee['amount'] ?? 0);
        $formattedAmount = fmod($amount, 1.0) === 0.0
            ? (string) (int) $amount
            : rtrim(rtrim(number_format($amount, 2, '.', ''), '0'), '.');
        $currency = ($fee['currency'] ?? 'KZT') === 'KZT' ? 'тг' : 'USD';

        return $formattedAmount . ' ' . $currency;
    }

    private static function normalizeConferenceFees(array $fees): array
    {
        $normalized = self::DEFAULT_CONFERENCE_FEES;

        foreach (self::DEFAULT_CONFERENCE_FEES as $category => $groups) {
            foreach ($groups as $group => $defaultFee) {
                $amount = $fees[$category][$group]['amount'] ?? $defaultFee['amount'];
                $normalized[$category][$group]['amount'] = max(0, (float) $amount);
                $normalized[$category][$group]['currency'] = $defaultFee['currency'];
            }
        }

        return $normalized;
    }
}
