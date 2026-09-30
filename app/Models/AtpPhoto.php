<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class AtpPhoto extends Model implements HasMedia
{
    use InteractsWithMedia;

    public $timestamps = false;

    protected $fillable = [
        'atp_id',
        'item_id',
        'file_path',
    ];

    protected $appends = ['file_url'];

    public function getFileUrlAttribute()
    {
        return $this->getFirstMediaUrl('photo') ?: asset('uploads/atp/' . $this->file_path);
    }

    public function record(): BelongsTo
    {
        return $this->belongsTo(AtpRecord::class, 'atp_id');
    }
}
