<?php

namespace App\Http\Requests;

use App\Support\Peran;
use Illuminate\Foundation\Http\FormRequest;

class UpdateTemplateRequest extends FormRequest
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
            'fields' => 'required|array|min:1',
            'fields.*.label' => 'required|string|max:255',
            'fields.*.type' => 'required|string|in:text,number,select,photo,file,judul',
            'fields.*.jenis' => 'nullable|string|in:seksi,sub',
            'fields.*.standard' => 'nullable|string|max:255',
            'fields.*.tool' => 'nullable|string|max:255',
            'fields.*.required' => 'nullable|boolean',
            'fields.*.options' => 'nullable|array',
            'fields.*.options.*' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Judul template wajib diisi.',
            'title.max' => 'Judul template maksimal 200 karakter.',
            'fields.required' => 'Minimal harus ada 1 baris parameter form.',
            'fields.min' => 'Minimal harus ada 1 baris parameter form.',
            'fields.*.label.required' => 'Nama parameter / label wajib diisi.',
            'fields.*.type.required' => 'Tipe input parameter wajib dipilih.',
            'fields.*.type.in' => 'Tipe input tidak valid.',
        ];
    }
}
