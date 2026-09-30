<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
        $middleware->alias([
            'custom_auth' => \App\Http\Middleware\CustomAuthMiddleware::class,
            'role' => \App\Http\Middleware\EnsureRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
        // #41: rute tak dikenal dan findOrFail memakai halaman 404 bermerek,
        // bukan halaman polos framework. Tamu yang membuka URL asing tetap
        // dapat kembali lewat tombol di halaman itu sendiri.
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return null;
            }
            return Inertia::render('Error/NotFound', [
                'url' => '/'.ltrim($request->path(), '/'),
            ])->toResponse($request)->setStatusCode(404);
        });
    })->create();
