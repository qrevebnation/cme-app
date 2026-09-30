<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BastpData extends Model
{
    protected $fillable = [
        'atp_id',
        'p1_nama',
        'p1_alamat',
        'p2_nama',
        'p2_jabatan',
        'p2_alamat',
        'pekerjaan',
        'mengetahui1',
        'mengetahui2',
        'photos',
    ];

    public function record(): BelongsTo
    {
        return $this->belongsTo(AtpRecord::class, 'atp_id');
    }
}
