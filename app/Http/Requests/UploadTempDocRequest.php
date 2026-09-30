<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadTempDocRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'mimes:pdf,jpeg,jpg',
                'max:2048',
            ],
        ];
    }
}
