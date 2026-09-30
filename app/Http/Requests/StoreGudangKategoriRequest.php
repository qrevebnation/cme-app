<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreGudangKategoriRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'kategori' => 'required|string',
            'satuan' => 'required|string',
            'jenis' => 'nullable|in:consumable,tool',
        ];
    }
}
