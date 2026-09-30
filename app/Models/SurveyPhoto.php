<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class SurveyPhoto extends Model implements HasMedia
{
    use InteractsWithMedia;

    public $timestamps = false;

    protected $fillable = [
        'survey_id',
        'item_id',
        'file_path',
    ];

    protected $appends = ['file_url'];

    public function getFileUrlAttribute()
    {
        return $this->getFirstMediaUrl('photo') ?: asset('uploads/photos/' . $this->file_path);
    }

    public function survey(): BelongsTo
    {
        return $this->belongsTo(Survey::class, 'survey_id');
    }
}
