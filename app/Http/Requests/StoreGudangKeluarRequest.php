<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGudangKeluarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tanggal' => 'required|date',
            'pengambil' => 'required|string',
            'lokasi_tujuan' => 'required|string',
            'items' => 'required|array',
            'foto' => 'nullable|array',
            'jenis' => 'nullable|in:consumable,tool',
        ];
    }
}
