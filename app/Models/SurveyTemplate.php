<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SurveyTemplate extends Model
{
    protected $table = 'survey_templates';

    protected $fillable = [
        'title',
        'kategori_json',
        'created_by',
    ];

    protected $casts = [
        'kategori_json' => 'array',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getCategoriesCountAttribute(): int
    {
        return is_array($this->kategori_json) ? count($this->kategori_json) : 0;
    }

    public function getItemsCountAttribute(): int
    {
        if (!is_array($this->kategori_json)) {
            return 0;
        }

        return array_sum(array_map('count', array_map(
            fn ($items) => is_array($items) ? $items : [],
            $this->kategori_json
        )));
    }
}
