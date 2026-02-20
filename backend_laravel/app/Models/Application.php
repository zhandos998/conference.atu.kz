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

    protected $fillable = [
        'user_id',
        'full_name',
        'organization_position',
        'academic_degree',
        'phone',
        'email',
        'supervisor_full_name',
        'supervisor_organization_position',
        'supervisor_academic_degree',
        'report_title',
        'direction',
        'participation_form',
        'hotel_booking_needed',
        'file_path',
        'payment_receipt_path',
        'status',
        'moderator_comment',
    ];

    protected $casts = [
        'hotel_booking_needed' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(ApplicationStatusLog::class);
    }
}
