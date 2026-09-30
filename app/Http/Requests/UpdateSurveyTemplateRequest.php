<?php

namespace App\Http\Requests;

use App\Support\Peran;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSurveyTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = Peran::sekarang();
        return in_array($role, ['admin', 'project_manager']);
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:200',
            'categories' => 'required|array|min:1',
            'categories.*.name' => 'required|string|max:150',
            'categories.*.items' => 'required|array|min:1',
            'categories.*.items.*.nomor' => 'nullable|string|max:20',
            'categories.*.items.*.nama' => 'required|string|max:255',
            'categories.*.items.*.tipe' => 'required|string|in:text,select,multi,photo,sub',
            'categories.*.items.*.opsi' => 'nullable|array',
            'categories.*.items.*.opsi.*' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Judul template wajib diisi.',
            'title.max' => 'Judul template maksimal 200 karakter.',
            'categories.required' => 'Minimal harus ada 1 kategori.',
            'categories.min' => 'Minimal harus ada 1 kategori.',
            'categories.*.name.required' => 'Nama kategori wajib diisi.',
            'categories.*.items.required' => 'Setiap kategori minimal memiliki 1 item.',
            'categories.*.items.min' => 'Setiap kategori minimal memiliki 1 item.',
            'categories.*.items.*.nama.required' => 'Nama item wajib diisi.',
            'categories.*.items.*.tipe.required' => 'Tipe item wajib dipilih.',
            'categories.*.items.*.tipe.in' => 'Tipe item tidak valid.',
        ];
    }
}
