<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSurveyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'nama_site' => 'sometimes|required|string',
            'tanggal_survey' => 'sometimes|required|date',
            'nama_surveyor' => 'sometimes|required|string',
            'lokasi' => 'nullable|string',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'catatan_tambahan' => 'nullable|string',
            'items' => 'sometimes|required|array',
            'photos' => 'nullable|array',
            'deleted_photo_ids' => 'nullable|array',
            'deleted_photo_ids.*' => 'integer',
        ];

        // Validate items if present
        $items = $this->input('items', []);
        foreach ($items as $key => $item) {
            $rules["items.{$key}.status"] = 'sometimes|nullable|in:checked,cross';
            $rules["items.{$key}.kondisi"] = 'nullable|string';
            $rules["items.{$key}.catatan"] = 'nullable|string';
            $rules["items.{$key}.sub_kategori"] = 'nullable|string|max:150';
        }

        return $rules;
    }
}
