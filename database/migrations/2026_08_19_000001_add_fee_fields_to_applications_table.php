<?php

use App\Models\Application;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table): void {
            $table->string('participant_category')
                ->default(Application::PARTICIPANT_CATEGORY_PARTICIPANT)
                ->after('academic_degree');
            $table->string('country_group')
                ->default(Application::COUNTRY_GROUP_KZ)
                ->after('participant_category');
            $table->decimal('payment_fee_amount', 10, 2)
                ->nullable()
                ->after('payment_receipt_path');
            $table->string('payment_fee_currency', 3)
                ->nullable()
                ->after('payment_fee_amount');
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table): void {
            $table->dropColumn([
                'participant_category',
                'country_group',
                'payment_fee_amount',
                'payment_fee_currency',
            ]);
        });
    }
};
