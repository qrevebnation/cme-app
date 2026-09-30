<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialRequestDetail extends Model
{
    /** Tabel warisan tidak punya kolom created_at / updated_at. */
    public $timestamps = false;

    protected $table = 'material_request_detail';

    protected $fillable = [
        'request_id',
        'no_urut',
        'nama_material',
        'uom',
        'qty',
    ];

    public function header(): BelongsTo
    {
        return $this->belongsTo(MaterialRequest::class, 'request_id');
    }
}
