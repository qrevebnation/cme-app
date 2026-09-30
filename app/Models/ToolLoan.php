<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ToolLoan extends Model
{
    protected $table = 'tool_loan';

    // Tabel hanya punya created_at (diisi default CURRENT_TIMESTAMP).
    public $timestamps = false;

    protected $fillable = [
        'no_form',
        'barang_id',
        'kategori',
        'tipe',
        'jumlah',
        'peminjam',
        'mengetahui',
        'tgl_pinjam',
        'rencana_kembali',
        'keperluan',
        'lokasi',
        'status',
        'tgl_kembali',
        'kondisi_kembali',
        'catatan',
        'created_by',
    ];

    protected $casts = [
        'barang_id' => 'integer',
        'jumlah' => 'integer',
        'created_by' => 'integer',
    ];
}
