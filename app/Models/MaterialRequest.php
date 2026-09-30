<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaterialRequest extends Model
{
    /** Tabel warisan tidak punya kolom updated_at (created_at memakai default MySQL). */
    public $timestamps = false;

    protected $table = 'material_request';

    protected $fillable = [
        'no_form',
        'no_pengajuan',
        'periode',
        'no_referensi',
        'tanggal',
        'kontrak_mitra',
        'stasiun_site',
        'alamat',
        'desa_kel',
        'kecamatan',
        'kab_kota',
        'provinsi',
        'pic',
        'no_telp',
        'reason',
        'homepass',
        'remarks',
        'requestor',
        'requestor_jabatan',
        'ttd_requestor',
        'review_nama',
        'review_jabatan',
        'ttd_review',
        'approve_nama',
        'approve_jabatan',
        'ttd_approve',
        'created_by',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(MaterialRequestDetail::class, 'request_id');
    }
}
