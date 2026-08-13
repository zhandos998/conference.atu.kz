<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('full_name');
            $table->string('organization_position');
            $table->string('academic_degree');
            $table->string('phone');
            $table->string('email');
            $table->string('supervisor_full_name');
            $table->string('supervisor_organization_position');
            $table->string('supervisor_academic_degree');
            $table->string('report_title');
            $table->string('direction');
            $table->string('participation_form');
            $table->boolean('hotel_booking_needed')->default(false);
            $table->string('file_path')->nullable();
            $table->enum('status', ['pending', 'accepted', 'revision', 'rejected'])->default('pending');
            $table->text('moderator_comment')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
