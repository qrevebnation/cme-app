<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectTask extends Model
{
    protected $fillable = ['project_id', 'judul', 'status', 'deadline', 'assignee', 'created_by'];

    protected $casts = ['project_id' => 'integer', 'created_by' => 'integer'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
