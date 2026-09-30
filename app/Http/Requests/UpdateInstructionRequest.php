<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateInstructionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $id = $this->route('id');
        return [
            'title' => 'required|string|max:100|unique:instruction_tables,kategori,' . $id,
            'description' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.parameter_name' => 'required|string|max:200',
            'items.*.specification' => 'required|string',
            'items.*.sow' => 'required|array|min:1',
            'items.*.sow.*' => 'required|string',
            'items.*.images' => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'Judul panduan wajib diisi.',
            'title.unique' => 'Panduan dengan judul ini sudah ada.',
            'description.required' => 'Deskripsi panduan wajib diisi.',
            'items.required' => 'Minimal harus menambahkan satu item instruksi.',
            'items.min' => 'Minimal harus menambahkan satu item instruksi.',
            'items.*.parameter_name.required' => 'Nama parameter wajib diisi.',
            'items.*.specification.required' => 'Spesifikasi kriteria wajib diisi.',
            'items.*.sow.required' => 'Langkah SOW wajib diisi.',
            'items.*.sow.min' => 'Langkah SOW minimal memiliki 1 butir panduan.',
        ];
    }
}
