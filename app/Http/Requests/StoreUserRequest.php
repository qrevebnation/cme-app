<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Admin checks are performed in the controller, but we can return true here as authorization is handled.
        return true;
    }

    public function rules(): array
    {
        return [
            'username' => 'required|string|max:50|unique:users,username',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:admin,project_manager,technician,viewer',
        ];
    }
}
