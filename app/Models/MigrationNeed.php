<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MigrationNeed extends Model
{
    protected $table = 'kebutuhan_migrasi';

    // Tabel hanya punya created_at (diisi default CURRENT_TIMESTAMP).
    public $timestamps = false;

    protected $fillable = [
        'site',
        'jenis',
        'detail',
        'qty',
        'satuan',
        'status',
        'created_by',
    ];

    protected $casts = [
        'qty' => 'integer',
        'created_by' => 'integer',
    ];
}
