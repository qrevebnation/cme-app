<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GudangBarang extends Model
{
    public $timestamps = false;

    protected $table = 'gudang_barang';

    protected $fillable = [
        'nama',
        'kategori',
        'tipe',
        'merek',
        'jenis',
        'stok',
        'satuan',
        'min_stok',
    ];
}
