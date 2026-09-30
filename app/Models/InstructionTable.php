<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstructionTable extends Model
{
    protected $table = 'instruction_tables';

    protected $fillable = [
        'kategori',
        'tipe',
        'data_json',
        'updated_by',
    ];

    protected $casts = [
        'data_json' => 'array',
    ];
}
