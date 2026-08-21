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
            $table->string('conference_type')
                ->default(Application::CONFERENCE_REPUBLICAN)
                ->after('user_id');
            $table->index(['conference_type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table): void {
            $table->dropIndex('applications_conference_type_status_index');
            $table->dropColumn('conference_type');
        });
    }
};
