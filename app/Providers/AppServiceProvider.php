<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        \Illuminate\Http\UploadedFile::macro('temporaryUrl', function () {
            // Stores the file in the public uploads/temp directory
            $path = $this->store('uploads/temp', 'public');
            // Returns the asset URL pointing to the symlinked public storage path
            return asset('storage/' . $path);
        });
    }
}
