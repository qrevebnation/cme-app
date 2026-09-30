<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'username',
        'role',
        'aksi',
        'modul',
        'ref_id',
        'keterangan',
        'ip_address',
    ];
}
