<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGudangMasukRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'tanggal' => 'required|date',
            'supplier' => 'required|string',
            'penerima' => 'required|string',
            'items' => 'required|array',
            'foto' => 'nullable|array',
            'jenis' => 'nullable|in:consumable,tool',
        ];
    }
}
