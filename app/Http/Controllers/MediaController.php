<?php

namespace App\Http\Controllers;

use App\Http\Requests\TempUploadRequest;
use App\Http\Requests\UploadTempDocRequest;
use App\Models\AtpPhoto;
use App\Models\AtpRecord;
use App\Models\GudangKeluar;
use App\Models\GudangMasuk;
use App\Models\Survey;
use App\Models\SurveyPhoto;
use App\Support\Aktivitas;
use App\Support\Peran;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaController extends Controller
{
    public function uploadTemp(TempUploadRequest $request): JsonResponse
    {
        $file = $request->file('image');
        $url = $file->temporaryUrl();

        // Extract relative path from URL (e.g. 'uploads/temp/xxxx.png')
        $baseUrl = asset('storage/');
        $path = str_replace($baseUrl . '/', '', $url);

        return response()->json([
            'url' => $url,
            'path' => $path,
        ]);
    }

    public function uploadTempDoc(UploadTempDocRequest $request): JsonResponse
    {
        $file = $request->file('file');
        $url = $file->temporaryUrl();

        // Extract relative path from URL (e.g. 'uploads/temp/xxxx.png')
        $baseUrl = asset('storage/');
        $path = str_replace($baseUrl . '/', '', $url);

        return response()->json([
            'url' => $url,
            'path' => $path,
        ]);
    }

    /**
     * Hapus satu foto tersimpan: baris basis data + berkas di disk.
     *
     * `source` menentukan tabel & batas akses: survey/atp mengikuti kepemilikan
     * baris (admin & project_manager bebas), transaksi gudang hanya admin & project_manager.
     */
    public function hapusFoto(Request $request): JsonResponse
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $data = $request->validate([
            'source' => 'required|in:survey,atp,gudang_masuk,gudang_keluar',
            'id' => 'required|integer',
            'photo_id' => 'nullable|integer',
            'file' => 'nullable|string',
        ]);

        $file = isset($data['file']) && $data['file'] !== '' ? basename($data['file']) : null;
        $photoId = $data['photo_id'] ?? null;

        switch ($data['source']) {
            case 'survey':
                $survey = Survey::findOrFail($data['id']);
                if (!Peran::bolehUbah($survey)) {
                    abort(403, 'Anda hanya dapat menghapus foto survey milik Anda sendiri.');
                }

                $photo = SurveyPhoto::where('survey_id', $survey->id)
                    ->when($photoId, fn ($q) => $q->whereKey($photoId))
                    ->when(!$photoId && $file, fn ($q) => $q->where('file_path', $file))
                    ->firstOrFail();

                $nama = basename($photo->file_path);
                $this->hapusMedia($photo, 'photo');
                $photo->delete();
                $this->hapusBerkas(public_path('uploads/photos/' . $nama));

                Aktivitas::catat('hapus', 'Survey', (string) $survey->id, 'Foto survey ' . $nama);

                return response()->json(['ok' => true, 'photo_id' => $photo->id]);

            case 'atp':
                $record = AtpRecord::findOrFail($data['id']);
                if (!Peran::bolehUbah($record)) {
                    abort(403, 'Anda hanya dapat menghapus foto ATP milik Anda sendiri.');
                }

                $photo = AtpPhoto::where('atp_id', $record->id)
                    ->when($photoId, fn ($q) => $q->whereKey($photoId))
                    ->when(!$photoId && $file, fn ($q) => $q->where('file_path', $file))
                    ->firstOrFail();

                $nama = basename($photo->file_path);
                $this->hapusMedia($photo, 'photo');
                $photo->delete();
                $this->hapusBerkas(public_path('uploads/atp/' . $nama));

                Aktivitas::catat('hapus', 'ATP', (string) $record->id, 'Foto ATP ' . $nama);

                return response()->json(['ok' => true, 'photo_id' => $photo->id]);

            case 'gudang_masuk':
            case 'gudang_keluar':
                if (!Peran::pengelola()) {
                    abort(403, 'Hanya admin & project manager yang dapat mengubah transaksi gudang.');
                }

                if ($file === null) {
                    return response()->json(['ok' => false, 'message' => 'Nama berkas wajib diisi.'], 422);
                }

                $header = $data['source'] === 'gudang_masuk'
                    ? GudangMasuk::findOrFail($data['id'])
                    : GudangKeluar::findOrFail($data['id']);

                // Kolom foto menyimpan daftar nama berkas dipisah koma.
                $tersisa = array_values(array_filter(
                    array_map('trim', explode(',', (string) $header->foto)),
                    fn ($nama) => $nama !== '' && $nama !== $file
                ));

                $header->update(['foto' => $tersisa ? implode(',', $tersisa) : null]);

                foreach ($header->getMedia('attachments') as $media) {
                    if ($media->file_name === $file) {
                        $media->delete();
                    }
                }

                GudangController::hapusBerkasGudang($file);

                Aktivitas::catat('hapus', 'Inventory', (string) $header->id, 'Foto ' . $file);

                return response()->json(['ok' => true, 'foto' => $tersisa]);
        }

        return response()->json(['ok' => false, 'message' => 'Sumber foto tidak dikenal.'], 422);
    }

    /** Buang seluruh berkas media pada satu koleksi milik model. */
    private function hapusMedia($model, string $koleksi): void
    {
        foreach ($model->getMedia($koleksi) as $media) {
            $media->delete();
        }
    }

    /** Hapus berkas fisik bila ada; tidak melempar bila sudah hilang. */
    private function hapusBerkas(string $path): void
    {
        if (is_file($path)) {
            @unlink($path);
        }
    }
}
