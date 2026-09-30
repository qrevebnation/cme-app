<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSurveyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'nama_site' => 'required|string',
            'tanggal_survey' => 'required|date',
            'nama_surveyor' => 'required|string',
            'lokasi' => 'nullable|string',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'catatan_tambahan' => 'nullable|string',
            'items' => 'required|array',
        ];

        $items = $this->input('items', []);
        foreach ($items as $key => $item) {
            $rules["items.{$key}.status"] = 'nullable|in:checked,cross';
            $rules["items.{$key}.kondisi"] = 'nullable|string';
            $rules["items.{$key}.sub_kategori"] = 'nullable|string|max:150';
            $rules["photos.{$key}"] = 'nullable|array';
            $rules["photos.{$key}.*.path"] = 'nullable|string';
        }

        return $rules;
    }

    public function messages(): array
    {
        $messages = [
            'nama_site.required' => 'Nama site wajib diisi.',
            'tanggal_survey.required' => 'Tanggal survey wajib diisi.',
            'nama_surveyor.required' => 'Nama surveyor wajib diisi.',
        ];

        $items = $this->input('items', []);
        foreach ($items as $key => $item) {
            $namaItem = $item['nama'] ?? $key;
            $messages["items.{$key}.status.in"] = "Status untuk item '{$namaItem}' harus OK atau NG.";
        }

        return $messages;
    }
}
