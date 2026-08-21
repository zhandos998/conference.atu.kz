<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Application extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_ACCEPTED = 'accepted';
    public const STATUS_REVISION = 'revision';
    public const STATUS_REJECTED = 'rejected';
    public const CONFERENCE_REPUBLICAN = 'republican';
    public const CONFERENCE_INTERNATIONAL = 'international';
    public const CONFERENCE_TYPES = [
        self::CONFERENCE_REPUBLICAN,
        self::CONFERENCE_INTERNATIONAL,
    ];
    public const PARTICIPANT_CATEGORY_PARTICIPANT = 'participant';
    public const PARTICIPANT_CATEGORY_STUDENT = 'student';
    public const COUNTRY_GROUP_KZ = 'kz';
    public const COUNTRY_GROUP_FOREIGN = 'foreign';

    protected $fillable = [
        'user_id',
        'conference_type',
        'full_name',
        'organization_position',
        'academic_degree',
        'participant_category',
        'country_group',
        'phone',
        'email',
        'supervisor_full_name',
        'supervisor_organization_position',
        'supervisor_academic_degree',
        'department',
        'report_title',
        'direction',
        'participation_form',
        'hotel_booking_needed',
        'file_path',
        'payment_receipt_path',
        'payment_fee_amount',
        'payment_fee_currency',
        'status',
        'moderator_comment',
    ];

    protected $casts = [
        'hotel_booking_needed' => 'boolean',
        'payment_fee_amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(ApplicationStatusLog::class);
    }

    public static function normalizeConferenceType(?string $conferenceType): string
    {
        return in_array($conferenceType, self::CONFERENCE_TYPES, true)
            ? $conferenceType
            : self::CONFERENCE_REPUBLICAN;
    }
}
