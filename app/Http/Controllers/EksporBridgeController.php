<?php

namespace App\Http\Controllers;

use App\Models\AtpRecord;
use App\Models\Survey;
use App\Support\Aktivitas;
use App\Support\AplikasiLama;
use App\Support\Peran;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ekspor dokumen dan rekap dari halaman aplikasi lama apa adanya.
 *
 * Berkas CSV/Markdown dibentuk halaman lama (`pages/*_export.php`) dan isinya
 * diteruskan tanpa disusun ulang: menyusun ulang di aplikasi baru berisiko
 * menghasilkan kolom, urutan, atau nama berkas yang berbeda dari berkas yang
 * sudah dipakai. Satu-satunya penyesuaian adalah membuang baris diagnostik PHP
 * yang terselip di keluaran server lama (lihat bersihkanDiagnostik()).
 *
 * Aplikasi baru hanya menyiapkan sesi akun layanan, memeriksa hak akses, lalu
 * menyalurkan respons beserta header Content-Type dan Content-Disposition-nya.
 */
class EksporBridgeController extends Controller
{
    /** Ekspor survey: CSV (bawaan) atau Markdown bila `format=md`. */
    public function survey(Request $request): Response
    {
        $id = (int) $request->query('id', 0);
        $survey = $id > 0 ? Survey::find($id) : null;

        abort_if($survey === null, 404, 'Data survey tidak ditemukan.');
        abort_unless(Peran::bolehUbah($survey), 403, 'Anda tidak berhak mengekspor survey ini.');

        $markdown = strtolower((string) $request->query('format', '')) === 'md';

        $respons = $this->teruskan($markdown ? 'export_md' : 'export_csv', ['id' => $id]);

        Aktivitas::catat('ekspor', 'Survey', (string) $id, 'Ekspor '.($markdown ? 'Markdown' : 'CSV').' Survey ODC');

        return $respons;
    }

    /** Ekspor ATP: CSV (bawaan) atau Markdown bila `type=md`. */
    public function atp(Request $request): Response
    {
        $id = (int) $request->query('id', 0);
        $record = $id > 0 ? AtpRecord::find($id) : null;

        abort_if($record === null, 404, 'Data ATP tidak ditemukan.');
        abort_unless(Peran::bolehUbah($record), 403, 'Anda tidak berhak mengekspor ATP ini.');

        $tipe = $this->tipe($request);

        $respons = $this->teruskan('atp_export', ['id' => $id, 'type' => $tipe]);

        Aktivitas::catat('ekspor', 'ATP', (string) $id, 'Ekspor '.($tipe === 'md' ? 'Markdown' : 'CSV').' ATP');

        return $respons;
    }

    public function gudangMasuk(Request $request): Response
    {
        return $this->inventory($request, 'gudang_masuk_export', 'Barang Masuk');
    }

    public function gudangKeluar(Request $request): Response
    {
        return $this->inventory($request, 'gudang_keluar_export', 'Barang Keluar');
    }

    public function materialRequest(Request $request): Response
    {
        return $this->inventory($request, 'material_request_export', 'Request Material');
    }

    /** Ekspor gudang & permintaan barang: satu dokumen (?id=) atau rekap rentang tanggal. */
    private function inventory(Request $request, string $halaman, string $namaDokumen): Response
    {
        $parameter = $this->parameterRekap($request, $namaDokumen);
        $respons = $this->teruskan($halaman, $parameter['kirim']);

        Aktivitas::catat(
            'ekspor',
            $halaman === 'material_request_export' ? 'Permintaan Barang' : 'Inventory',
            $parameter['ref'],
            $parameter['keterangan'],
        );

        return $respons;
    }

    /**
     * Ambil berkas ekspor dari aplikasi lama lalu teruskan isinya.
     *
     * Halaman lama membalas HTML biasa ("Not found"/"Data tidak ditemukan")
     * ketika datanya tidak ada, sehingga jenis konten dipakai sebagai penentu:
     * hanya text/csv dan text/markdown yang dianggap berkas ekspor sah.
     *
     * @param  array<string, string|int>  $query
     */
    private function teruskan(string $halaman, array $query): Response
    {
        $base = AplikasiLama::url();
        abort_if($base === '', 500, 'Alamat aplikasi lama belum diatur (LAMA_APP_URL).');

        $url = $base.'/pages/'.$halaman.'.php?'.http_build_query($query);
        $jawaban = AplikasiLama::unduh($url);

        // Sesi aplikasi lama bisa habis kapan saja; masuk ulang sekali sebelum menyerah.
        if ($jawaban['code'] !== 200) {
            AplikasiLama::masuk();
            $jawaban = AplikasiLama::unduh($url);
        }

        abort_if(
            $jawaban['code'] === 0 || $jawaban['code'] >= 500,
            502,
            'Aplikasi lama tidak menjawab. Coba lagi sebentar lagi.',
        );

        $tipe = trim((string) ($jawaban['headers']['content-type'] ?? ''));

        abort_unless(
            $jawaban['code'] === 200 && $this->berkasSiap($tipe),
            404,
            'Berkas tidak tersedia untuk data ini.',
        );

        $isi = $this->bersihkanDiagnostik((string) $jawaban['body']);

        abort_if(trim($isi) === '', 502, 'Aplikasi lama tidak mengirim isi berkas.');

        $respons = response($isi, 200)->header('Content-Type', $tipe);

        // Nama berkas dibentuk halaman lama dari data (mis. nomor form), jadi
        // header-nya diteruskan agar berkas terunduh dengan nama yang sama.
        if (isset($jawaban['headers']['content-disposition'])) {
            $respons->header('Content-Disposition', $jawaban['headers']['content-disposition']);
        }

        return $respons;
    }

    /**
     * Buang baris pesan diagnostik PHP dari badan berkas ekspor.
     *
     * Server aplikasi lama menyala tanpa display_errors=0, dan halaman ekspor
     * memanggil fputcsv() berkali-kali, sehingga keluaran CSV terselipi blok
     * "<br />" + "<b>Deprecated</b>: ..." di antara baris data. Blok itu merusak
     * berkas saat dibuka Excel/Sheets, jadi baris penandanya dibuang.
     *
     * Polanya sempit dan hanya cocok untuk baris penanda diagnostik; baris data
     * tidak pernah cocok. Baris lain dibiarkan byte-per-byte, termasuk BOM yang
     * dipertahankan di awal berkas agar Excel membaca UTF-8.
     */
    private function bersihkanDiagnostik(string $isi): string
    {
        $bom = str_starts_with($isi, "\xEF\xBB\xBF") ? "\xEF\xBB\xBF" : '';

        if ($bom !== '') {
            $isi = substr($isi, 3);
        }

        // Baris penanda sisa: "<br />" sendirian.
        $isi = preg_replace('/^\h*<br\s*\/?>\h*\R/m', '', $isi) ?? $isi;

        // Baris pesan HTML PHP: "<b>Deprecated</b>: ... in <b>/path/file.php</b> on line <b>N</b>".
        $polaHtml = '/^\h*<b>(?:Deprecated|Warning|Notice|Fatal error|Parse error|Strict Standards)<\/b>:'
            .'.*?(?:in <b>[^<\r\n]*<\/b> on line <b>\d+<\/b>|on line <b>\d+<\/b>)'
            .'\h*(?:<br\s*\/?>)?\h*\R/m';
        $isi = preg_replace($polaHtml, '', $isi) ?? $isi;

        // Baris pesan teks biasa (log PHP tanpa HTML).
        $polaTeks = '/^\h*(?:PHP )?(?:Deprecated|Warning|Notice|Fatal error|Parse error|Strict Standards):'
            .'.*(?:on line \d+|\.php)\h*\R/m';
        $isi = preg_replace($polaTeks, '', $isi) ?? $isi;

        return $bom.$isi;
    }

    /** Halaman ekspor hanya melayani CSV dan Markdown. */
    private function berkasSiap(string $tipe): bool
    {
        return preg_match('#^text/(csv|markdown)#i', $tipe) === 1;
    }

    private function tipe(Request $request): string
    {
        $tipe = strtolower((string) $request->query('type', 'csv'));

        abort_unless(in_array($tipe, ['csv', 'md'], true), 422, 'Jenis ekspor hanya csv atau md.');

        return $tipe;
    }

    /**
     * Susun parameter halaman ekspor: satu dokumen bila ada `id`, kalau tidak
     * rekap rentang `dari`/`sampai`. Tanggal divalidasi di sini karena halaman
     * lama diam-diam membuang tanggal yang salah format sehingga permintaan
     * rekap satu bulan berubah menjadi rekap seluruh data.
     *
     * @return array{kirim: array<string, string|int>, ref: ?string, keterangan: string}
     */
    private function parameterRekap(Request $request, string $namaDokumen): array
    {
        $tipe = $this->tipe($request);
        $id = (int) $request->query('id', 0);

        if ($id > 0) {
            return [
                'kirim' => ['id' => $id, 'type' => $tipe],
                'ref' => (string) $id,
                'keterangan' => 'Ekspor '.($tipe === 'md' ? 'Markdown' : 'CSV').' '.$namaDokumen,
            ];
        }

        $dari = $this->tanggal($request->query('dari'));
        $sampai = $this->tanggal($request->query('sampai'));

        abort_if(
            $dari === null && $sampai === null,
            422,
            'Sertakan id dokumen atau rentang tanggal (dari & sampai).',
        );

        return [
            'kirim' => array_filter(['dari' => $dari, 'sampai' => $sampai, 'type' => $tipe]),
            'ref' => null,
            'keterangan' => 'Ekspor Rekap '.$namaDokumen.' '.($dari ?? 'awal').' s/d '.($sampai ?? 'akhir'),
        ];
    }

    private function tanggal(mixed $nilai): ?string
    {
        $nilai = is_string($nilai) ? trim($nilai) : '';

        if ($nilai === '') {
            return null;
        }

        abort_unless(preg_match('/^\d{4}-\d{2}-\d{2}$/', $nilai) === 1, 422, 'Format tanggal harus YYYY-MM-DD.');

        return $nilai;
    }
}
