<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectFile extends Model
{
    protected $fillable = ['project_id', 'nama', 'path', 'created_by'];

    protected $casts = ['project_id' => 'integer', 'created_by' => 'integer'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
