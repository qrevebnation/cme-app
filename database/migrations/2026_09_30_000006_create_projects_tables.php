<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 150);
            $table->text('deskripsi')->nullable();
            $table->date('mulai')->nullable();
            $table->date('deadline')->nullable();
            $table->string('status', 20)->default('on_track'); // on_track|complete
            $table->text('brief')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('project_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('judul', 150);
            $table->string('status', 20)->default('buka'); // buka|proses|selesai
            $table->date('deadline')->nullable();
            $table->string('assignee', 100)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('project_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('nama', 150);
            $table->string('path', 255);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('project_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->timestamps();
            $table->unique(['project_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_user');
        Schema::dropIfExists('project_files');
        Schema::dropIfExists('project_tasks');
        Schema::dropIfExists('projects');
    }
};
