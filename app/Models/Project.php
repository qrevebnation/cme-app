<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $fillable = ['nama', 'deskripsi', 'mulai', 'deadline', 'status', 'brief', 'created_by'];

    protected $casts = ['created_by' => 'integer'];

    public function tasks()
    {
        return $this->hasMany(ProjectTask::class);
    }

    public function files()
    {
        return $this->hasMany(ProjectFile::class);
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'project_user', 'project_id', 'user_id')->withTimestamps();
    }
}
