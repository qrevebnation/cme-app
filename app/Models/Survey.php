<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Survey extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'nama_site',
        'tanggal_survey',
        'nama_surveyor',
        'lokasi',
        'latitude',
        'longitude',
        'catatan_tambahan',
        'created_by',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SurveyItem::class, 'survey_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(SurveyPhoto::class, 'survey_id');
    }
}
