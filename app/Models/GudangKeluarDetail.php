<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GudangKeluarDetail extends Model
{
    public $timestamps = false;

    protected $table = 'gudang_keluar_detail';

    protected $fillable = [
        'keluar_id',
        'barang_id',
        'nama_barang',
        'tipe_barang',
        'jumlah',
        'satuan',
    ];

    public function header(): BelongsTo
    {
        return $this->belongsTo(GudangKeluar::class, 'keluar_id');
    }

    public function barang(): BelongsTo
    {
        return $this->belongsTo(GudangBarang::class, 'barang_id');
    }
}
