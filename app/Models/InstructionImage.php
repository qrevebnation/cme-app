<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class InstructionImage extends Model implements HasMedia
{
    use InteractsWithMedia;

    public $timestamps = false;

    protected $table = 'instruction_images';

    protected $fillable = [
        'kategori',
        'file_path',
        'created_by',
    ];

    protected $appends = ['file_url'];

    public function getFileUrlAttribute()
    {
        return $this->getFirstMediaUrl('guide') ?: asset('assets/instruction/' . $this->file_path);
    }
}
