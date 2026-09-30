<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class GudangKeluar extends Model implements HasMedia
{
    use InteractsWithMedia;

    public $timestamps = false;

    protected $table = 'gudang_keluar';

    protected $fillable = [
        'no_form',
        'judul',
        'kategori',
        'tanggal',
        'pengambil',
        'jabatan',
        'lokasi_tujuan',
        'keperluan',
        'proyek',
        'tujuan',
        'keterangan',
        'foto',
        'disetujui',
        'pengambil_ttd',
        'created_by',
    ];

    protected $appends = ['media_urls'];

    public function getMediaUrlsAttribute()
    {
        $media = $this->getMedia('attachments');
        if ($media->count() > 0) {
            return $media->map(fn($m) => $m->getUrl())->toArray();
        }

        if (empty($this->foto)) {
            return [];
        }

        return array_map(fn($filename) => asset('uploads/gudang/' . trim($filename)), explode(',', $this->foto));
    }

    public function details(): HasMany
    {
        return $this->hasMany(GudangKeluarDetail::class, 'keluar_id');
    }
}
