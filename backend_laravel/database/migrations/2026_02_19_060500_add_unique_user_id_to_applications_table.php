<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $duplicates = DB::table('applications')
            ->select('user_id')
            ->groupBy('user_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('user_id');

        foreach ($duplicates as $userId) {
            $ids = DB::table('applications')
                ->where('user_id', $userId)
                ->orderByDesc('created_at')
                ->orderByDesc('id')
                ->pluck('id');

            $idsToDelete = $ids->slice(1)->values();

            if ($idsToDelete->isNotEmpty()) {
                DB::table('applications')->whereIn('id', $idsToDelete)->delete();
            }
        }

        Schema::table('applications', function (Blueprint $table) {
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropUnique('applications_user_id_unique');
        });
    }
};
