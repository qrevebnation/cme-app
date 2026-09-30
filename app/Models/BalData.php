<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BalData extends Model
{
    protected $fillable = [
        'atp_id',
        'project',
        'no_po',
        'tanggal_mulai',
        'tanggal',
        'pelaksana',
        'lokasi',
        'hasil',
        'pihak1',
        'pihak2',
        'nama1',
        'jabatan1',
        'nama2',
        'jabatan2',
    ];

    public function record(): BelongsTo
    {
        return $this->belongsTo(AtpRecord::class, 'atp_id');
    }
}
