<?php

namespace App\Support;

/**
 * Penghubung ke aplikasi lama (site/cme): sesi akun layanan, permintaan HTTP,
 * dan berkas cookie yang dipakai bersama jembatan cetak maupun jembatan ekspor.
 *
 * Semua hasil dikembalikan apa adanya; pemanggil yang memutuskan cara
 * meneruskannya ke peramban.
 */
class AplikasiLama
{
    /** Alamat dasar aplikasi lama tanpa garis miring di ujung. */
    public static function url(): string
    {
        return rtrim((string) config('services.lama.url'), '/');
    }

    /** Berkas cookie sesi akun layanan, dipakai ulang antar permintaan. */
    public static function cookie(): string
    {
        return storage_path('app/print-bridge-cookie.txt');
    }

    /** Masuk ke aplikasi lama memakai akun layanan; cookie disimpan untuk pemakaian berikutnya. */
    public static function masuk(): void
    {
        self::minta(self::url().'/index.php', [
            'username' => (string) config('services.lama.username'),
            'password' => (string) config('services.lama.password'),
        ]);
    }

    /**
     * Ambil respons teks; bila sesi aplikasi lama sudah habis, masuk ulang lalu
     * ambil sekali lagi.
     */
    public static function ambil(string $url): ?string
    {
        $body = self::minta($url)['body'];

        if (self::sesiHabis($body)) {
            self::masuk();
            $body = self::minta($url)['body'];
        }

        return $body;
    }

    /**
     * Unduh berkas apa adanya tanpa mengikuti pengalihan: halaman ekspor lama
     * mengalihkan ke halaman daftar ketika datanya tidak ada, dan pengalihan itu
     * harus terbaca sebagai "berkas tidak tersedia" alih-alih diikuti.
     *
     * @return array{code:int, body:?string, headers:array<string,string>}
     */
    public static function unduh(string $url): array
    {
        return self::minta($url, null, false);
    }

    /**
     * Ambil berkas biner (mis. tanda tangan) dari aplikasi lama.
     *
     * @return array{code:int, body:string, type:?string}|null
     */
    public static function binari(string $url): ?array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_COOKIEFILE => self::cookie(),
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);

        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $type = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);

        if (! is_string($body) || $code !== 200) {
            return null;
        }

        return ['code' => $code, 'body' => $body, 'type' => is_string($type) ? $type : null];
    }

    /**
     * Aplikasi lama mengalihkan ke halaman login bila sesi tidak sah. Halaman
     * login dikenali dari formulir masuknya, bukan dari judul halaman.
     */
    public static function sesiHabis(?string $html): bool
    {
        if (! is_string($html) || $html === '') {
            return true;
        }

        return str_contains($html, 'msg=timeout')
            || str_contains($html, 'name="username"')
            || str_contains($html, "window.location.href='index.php'");
    }

    /**
     * Permintaan HTTP ke aplikasi lama memakai cookie akun layanan.
     *
     * @return array{code:int, body:?string, headers:array<string,string>}
     */
    public static function minta(string $url, ?array $post = null, bool $ikutiPengalihan = true): array
    {
        $headers = [];

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => $ikutiPengalihan,
            CURLOPT_COOKIEJAR => self::cookie(),
            CURLOPT_COOKIEFILE => self::cookie(),
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_HEADERFUNCTION => static function ($ch, string $baris) use (&$headers): int {
                $pisah = strpos($baris, ':');

                if ($pisah !== false) {
                    $headers[strtolower(trim(substr($baris, 0, $pisah)))] = trim(substr($baris, $pisah + 1));
                }

                return strlen($baris);
            },
        ]);

        if ($post !== null) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post));
        }

        $body = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ['code' => $code, 'body' => is_string($body) ? $body : null, 'headers' => $headers];
    }
}
