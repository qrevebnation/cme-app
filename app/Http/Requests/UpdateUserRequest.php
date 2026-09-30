<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('id');
        return [
            'username' => 'required|string|max:50|unique:users,username,' . $userId,
            'role' => 'required|string|in:admin,project_manager,technician,viewer',
            'password' => 'nullable|string|min:6',
        ];
    }
}
