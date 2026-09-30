<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AtpTemplate extends Model
{
    protected $table = 'atp_templates';

    protected $fillable = [
        'title',
        'data_json',
        'created_by',
    ];

    protected $casts = [
        'data_json' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function records(): HasMany
    {
        return $this->hasMany(AtpRecord::class, 'template_id');
    }
}
