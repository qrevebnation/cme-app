<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'username',
        'status',
        'ip_address',
        'user_agent',
        'browser',
        'os',
        'device',
    ];
}
