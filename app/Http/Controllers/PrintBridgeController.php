<?php

namespace App\Http\Controllers;

use App\Support\Aktivitas;
use App\Support\AplikasiLama;
use Illuminate\Http\Request;

/**
 * Menyajikan halaman cetak aplikasi lama apa adanya di dalam aplikasi baru,
 * sehingga hasil cetak / PDF identik dengan dokumen lama (header, footer,
 * blok tanda tangan, ukuran kertas, dan watermark).
 *
 * Alasan memakai berkas cetak lama, bukan menyalin desainnya ke React:
 * halaman cetak aplikasi baru memakai tata letak berbeda (label kapital,
 * urutan kolom, susunan tanda tangan, jumlah halaman). Menyalin desain ke
 * komponen baru menimbulkan risiko selisih; dengan perantara ini yang dicetak
 * tetap kode yang sama persis seperti dokumen resmi yang sudah dipakai.
 *
 * Aplikasi baru bertindak sebagai perantara: masuk ke aplikasi lama memakai
 * akun layanan, mengambil HTML cetak, mengubah URL aset relatif menjadi
 * absolut, lalu meneruskannya ke peramban.
 */
class PrintBridgeController extends Controller
{
    /**
     * Dokumen cetak yang boleh dilayani. Daftar putih ini mencegah URL dipakai
     * untuk memanggil berkas sembarang milik aplikasi lama.
     */
    private const DOKUMEN = [
        'atp_print' => 'atp_print',
        'print_survey' => 'print_survey',
        'atp_bal' => 'atp_bal',
        'atp_bastp' => 'atp_bastp',
        'atp_cover' => 'atp_cover',
        'gudang_masuk_print' => 'gudang_masuk_print',
        'gudang_keluar_print' => 'gudang_keluar_print',
        'material_request_print' => 'material_request_print',
        'tool_loan_print' => 'tool_loan_print',
    ];

    /**
     * Kesehatan jembatan cetak: halaman login aplikasi lama dihubungi sekali
     * sebagai denyut. Dipanggil footer saat halaman dimuat (bukan berkala),
     * karena itu permintaannya tidak mengubah data dan tidak dicatat ke log
     * aktivitas. Kode 0 dari helper berarti koneksi gagal (aplikasi mati),
     * jadi pemanggil tidak menunggu batas waktu lama.
     */
    public function status(): \Illuminate\Http\JsonResponse
    {
        $base = AplikasiLama::url();

        if ($base === '') {
            return response()->json(['aktif' => false, 'pesan' => 'Alamat aplikasi cetak belum diatur.']);
        }

        // Isi halaman tidak dipakai; hanya kode HTTP yang menentukan hidup/mati.
        $respon = AplikasiLama::minta($base.'/index.php');

        if ($respon['code'] >= 200 && $respon['code'] < 500) {
            return response()->json(['aktif' => true, 'pesan' => 'Aplikasi cetak siap.']);
        }

        return response()->json([
            'aktif' => false,
            'pesan' => 'Aplikasi cetak tidak dapat dihubungi; dokumen cetak tidak dapat dibuka.',
        ]);
    }

    public function show(Request $request, string $dokumen)
    {
        abort_unless(isset(self::DOKUMEN[$dokumen]), 404);

        $id = (int) $request->query('id', 0);

        // Halaman cetak aplikasi lama melayani dua mode: satu dokumen (?id=) dan
        // laporan rentang tanggal (?dari=&sampai=) untuk gudang.
        $query = array_filter([
            'id' => $id > 0 ? $id : null,
            'dari' => $request->query('dari'),
            'sampai' => $request->query('sampai'),
        ], static fn ($nilai) => $nilai !== null && $nilai !== '');

        abort_if($query === [], 404);

        $base = AplikasiLama::url();
        abort_if($base === '', 500, 'Alamat aplikasi lama belum diatur (LAMA_APP_URL).');

        $url = $base.'/pages/'.self::DOKUMEN[$dokumen].'.php?'.http_build_query($query);

        $html = AplikasiLama::ambil($url);

        abort_if($html === null || $html === '', 502, 'Dokumen cetak tidak dapat diambil dari aplikasi lama.');

        // Dokumen aplikasi lama menampilkan pesan PHP bila datanya tidak ada
        // (mis. id tidak ditemukan). Pesan itu tidak boleh bocor ke aplikasi baru.
        if (preg_match('/(Undefined variable|Fatal error|Uncaught\s+\w*Error|mysqli_sql_exception)/i', (string) $html)) {
            abort(404, 'Dokumen cetak tidak tersedia untuk data ini.');
        }

        // Respons diteruskan apa adanya, termasuk pesan aplikasi lama bila datanya
        // tidak ditemukan, supaya tidak ada kesan dokumen kosong tanpa penjelasan.
        $html = $this->sesuaikanTautan($html, $base);

        // Jejak audit: dokumen resmi yang dibuka atau dicetak pengguna.
        Aktivitas::catat(
            'cetak',
            'Dokumen',
            isset($query['id']) ? (string) $query['id'] : null,
            'Buka '.ucwords(str_replace('_', ' ', $dokumen)).($query !== [] ? ' ('.http_build_query($query, '', ', ').')' : ''),
        );

        return response($this->lengkapiToolbar($html, $dokumen, $query), 200)
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    /**
     * Menata tampilan pratinjau dokumen cetak di dalam iframe.
     *
     * Iframe disajikan BERSIH: tanpa injeksi tombol apa pun. Aksi cetak/buka
     * tersedia di chrome modal (DocumentPreview), bukan di dalam dokumen.
     * Bilah asli BAL/BASTP disembunyikan khusus layar supaya tidak ganda.
     *
     * Gaya pratinjau berlaku untuk semua dokumen: latar halaman abu-abu,
     * dokumen 900px terpusat dengan jarak margin, dan footer dokumen tidak
     * lagi menempel selebar jendela. Semua aturan berada di `@media screen`,
     * jadi hasil cetak/PDF tidak berubah.
     */
    private function lengkapiToolbar(string $html, string $dokumen, array $query): string
    {
        if (! str_contains($html, '<body')) {
            return $html;
        }

        $gaya = '<style>'
            .'@media screen{'
            .'html,body{background:#F4F6F9 !important}'
            .'body{display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:24px 0}'
            .'body::before{content:"";order:0;margin-top:auto}'
            .'body::after{content:"";order:99;margin-bottom:auto}'
            .'body > .no-print{order:1}'
            .'body > .print-header{order:2;flex:0 0 auto;box-sizing:border-box;'
            .'width:900px !important;max-width:100% !important;background:#fff;border-bottom:2px solid #e2e8f0}'
            .'body > table,body > .cover,body > .content-wrap,body > .ttd{'
            .'order:3;flex:0 0 auto;box-sizing:border-box;width:900px !important;max-width:100% !important;'
            .'background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.12)}'
            .'body > .view-area{display:contents !important}'
            .'body > .view-area > .no-print,body > .view-area > .view-bar,body > .view-area > .action-bar{'
            .'display:none !important}'
            .'body > .view-bar,body > .action-bar{display:none !important}'
            .'body > .view-area > .page-print,body > .view-area > .doc-page{'
            .'order:3;flex:0 0 auto;box-sizing:border-box;width:900px !important;max-width:100% !important;'
            .'background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.12)}'
            .'body > .print-footer-fixed{order:4;position:static !important;left:auto !important;right:auto !important;'
            .'box-sizing:border-box;width:900px !important;max-width:100% !important;margin:0 auto}'
            .'}'
            .'</style>';

        // Dokumen ATP dan Cover memanggil window.print() saat dimuat. Panggilan itu
        // ditahan supaya halaman tampil lebih dulu, lalu fungsi cetak dipulihkan
        // untuk tombol di chrome modal.
        if (in_array($dokumen, ['atp_print', 'atp_cover'], true)) {
            $html = preg_replace(
                '/(<head[^>]*>)/i',
                '$1<script>window.__cetakAsli=window.print.bind(window);window.print=function(){};'
                .'window.addEventListener("load",function(){setTimeout(function(){window.print=window.__cetakAsli;},600);});</script>',
                $html,
                1
            ) ?? $html;
        }

        $html = preg_replace('/(<\/head>)/i', '$1'.$gaya, (string) $html, 1) ?? $html;

        return $html;
    }

    /**
     * Tanda tangan yang diunggah dari aplikasi baru tersimpan di
     * `public/uploads/ttd`. Dokumen cetak berasal dari aplikasi lama dan
     * menunjuk folder `uploads/ttd` miliknya sendiri, sehingga tanpa perantara
     * ini gambar tanda tangan tidak akan muncul di berkas PDF.
     *
     * Berkas dicari di aplikasi baru lebih dulu; bila tidak ada (mis. data lama),
     * diambil dari aplikasi lama.
     */
    public function tandaTangan(string $nama)
    {
        $nama = basename($nama);
        $lokal = public_path('uploads/ttd/'.$nama);

        if (is_file($lokal)) {
            return response()->file($lokal);
        }

        $base = AplikasiLama::url();
        abort_if($base === '', 404);

        $berkas = AplikasiLama::binari($base.'/uploads/ttd/'.$nama);

        abort_if($berkas === null || $berkas['body'] === '', 404);

        return response($berkas['body'])
            ->header('Content-Type', $berkas['type'] ?: 'application/octet-stream');
    }

    /**
     * Tautan di dalam dokumen cetak menunjuk halaman aplikasi lama
     * ("atp_detail.php?id=73", "atp_list.php", ...). Bila diteruskan apa adanya,
     * tautan itu menjadi 404 karena disajikan dari aplikasi baru. Setiap tautan
     * dipetakan ke halaman aplikasi baru yang setara.
     */
    private const PETA_NAVIGASI = [
        '/^atp_detail\.php\?id=(\d+)$/' => '/atp/$1',
        '/^atp_bal\.php\?id=(\d+)(?:&(?:amp;)?edit=1)?$/' => '/atp/$1',
        '/^atp_bastp\.php\?id=(\d+)(?:&(?:amp;)?edit=1)?$/' => '/atp/$1',
        '/^atp_list\.php$/' => '/atp',
        '/^atp_dashboard\.php$/' => '/atp',
        '/^(?:cme_dashboard|dashboard|index)\.php$/' => '/dashboard',
        '/^survey_list\.php$/' => '/survey',
        '/^survey\.php$/' => '/survey',
        '/^survey_detail\.php\?id=(\d+)$/' => '/survey/$1',
        '/^print_survey\.php\?id=(\d+)$/' => '/print/print_survey?id=$1',
        '/^gudang\.php$/' => '/gudang',
        '/^gudang_masuk\.php$/' => '/gudang/history',
        '/^gudang_keluar\.php$/' => '/gudang/history',
        '/^gudang_masuk_detail\.php\?id=(\d+)$/' => '/gudang/masuk-history/$1',
        '/^gudang_keluar_detail\.php\?id=(\d+)$/' => '/gudang/keluar-history/$1',
        '/^instruction_item\.php$/' => '/instruction',
        '/^users\.php$/' => '/users',
        '/^login_logs\.php$/' => '/users-logs',
    ];

    /**
     * Ubah URL relatif pada dokumen cetak:
     * - aset ("../assets/...", "../uploads/...") diarahkan ke aplikasi lama,
     * - tautan halaman dipetakan ke rute aplikasi baru,
     * - sisanya dijadikan absolut ke aplikasi lama agar tidak 404.
     */
    private function sesuaikanTautan(string $html, string $base): string
    {
        $html = preg_replace_callback(
            '/(href|action|src)="([^"]*)"/i',
            function (array $cocok) use ($base): string {
                $atribut = $cocok[1];
                $nilai = html_entity_decode($cocok[2], ENT_QUOTES);

                if ($nilai === '' || preg_match('/^(https?:|\/\/|data:|mailto:|#|javascript:)/i', $nilai)) {
                    return $cocok[0];
                }

                if (str_starts_with($nilai, '../uploads/ttd/')) {
                    // Tanda tangan bisa berasal dari aplikasi baru maupun lama;
                    // penyaji memilih sumber yang ada.
                    return $atribut.'="/berkas-ttd/'.basename(substr($nilai, strlen('../uploads/ttd/'))).'"';
                }

                if (str_starts_with($nilai, '../')) {
                    return $atribut.'="'.$base.'/'.substr($nilai, 3).'"';
                }

                foreach (self::PETA_NAVIGASI as $pola => $tujuan) {
                    if (preg_match($pola, $nilai)) {
                        return $atribut.'="'.preg_replace($pola, $tujuan, $nilai).'"';
                    }
                }

                return $atribut.'="'.$base.'/pages/'.ltrim($nilai, '/').'"';
            },
            $html
        );

        $html = preg_replace('/url\(([\'"]?)\.\.\//i', 'url($1'.$base.'/', (string) $html);

        return (string) $html;
    }
}
