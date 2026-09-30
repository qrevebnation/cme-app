<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SurveyItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'survey_id',
        'kategori',
        'sub_kategori',
        'nomor_item',
        'nama_item',
        'status_check',
        'kondisi_nilai',
        'catatan',
    ];

    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class, 'survey_id');
    }
}
