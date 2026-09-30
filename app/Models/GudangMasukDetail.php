<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GudangMasukDetail extends Model
{
    public $timestamps = false;

    protected $table = 'gudang_masuk_detail';

    protected $fillable = [
        'masuk_id',
        'barang_id',
        'nama_barang',
        'tipe_barang',
        'jumlah',
        'satuan',
    ];

    public function header(): BelongsTo
    {
        return $this->belongsTo(GudangMasuk::class, 'masuk_id');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(GudangBarang::class, 'barang_id');
    }
}
