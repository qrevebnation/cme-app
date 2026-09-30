<?php

namespace App\Http\Controllers;

use App\Models\InstructionImage;
use App\Models\InstructionTable;
use App\Http\Requests\StoreInstructionRequest;
use App\Http\Requests\UpdateInstructionRequest;
use App\Support\Aktivitas;
use App\Support\Peran;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class InstructionController extends Controller
{
    public function index(Request $request): Response
    {
        $guides = InstructionTable::where('tipe', 'spesifikasi')->orderBy('id', 'desc')->get();
        return Inertia::render('Instruction/Index', [
            'guides' => $guides
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('Instruction/Create');
    }

    public function store(StoreInstructionRequest $request)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $userId = $request->session()->get('user_id');
        $title = trim($request->input('title'));

        DB::beginTransaction();
        try {
            $items = $request->input('items', []);

            // Process image uploads per item
            foreach ($items as $idx => &$item) {
                $processedImages = [];
                if (!empty($item['images'])) {
                    foreach ($item['images'] as $img) {
                        $tempPath = $img['path'] ?? null;
                        if ($tempPath && str_contains($tempPath, 'temp/')) {
                            $fullTempPath = storage_path('app/public/' . $tempPath);
                            if (file_exists($fullTempPath)) {
                                // Create an InstructionImage row
                                $instImage = InstructionImage::create([
                                    'kategori' => $title,
                                    'file_path' => basename($fullTempPath),
                                    'created_by' => $userId,
                                ]);
                                
                                // Attach media using Spatie
                                $media = $instImage->addMedia($fullTempPath)->toMediaCollection('guide');
                                
                                $processedImages[] = [
                                    'path' => $media->id,
                                    'url' => $media->getUrl(),
                                    'name' => $img['name'] ?? basename($fullTempPath),
                                ];
                            }
                        } else {
                            // Keep already processed images
                            $processedImages[] = $img;
                        }
                    }
                }
                $item['images'] = $processedImages;
            }

            InstructionTable::create([
                'kategori' => $title,
                'tipe' => 'spesifikasi',
                'data_json' => [
                    'description' => trim($request->input('description')),
                    'items' => $items,
                ],
                'updated_by' => $userId,
            ]);

            DB::commit();
            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('tambah', 'Instruksi', null, 'Panduan ' . $title);
            return redirect('/instruction')->with('success', 'Panduan teknis baru berhasil ditambahkan!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menyimpan panduan: ' . $e->getMessage());
        }
    }

    public function showItem(Request $request, $id): Response
    {
        $guide = InstructionTable::findOrFail($id);
        
        $desc = $guide->data_json['description'] ?? '';
        $items = $guide->data_json['items'] ?? [];

        return Inertia::render('Instruction/Item', [
            'id' => $guide->id,
            'kategori' => $guide->kategori,
            'description' => $desc,
            'items' => $items,
        ]);
    }

    public function edit(Request $request, $id): Response
    {
        $guide = InstructionTable::findOrFail($id);

        return Inertia::render('Instruction/Edit', [
            'guide' => $guide,
        ]);
    }

    public function update(UpdateInstructionRequest $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $guide = InstructionTable::findOrFail($id);
        $userId = $request->session()->get('user_id');
        $oldTitle = $guide->kategori;
        $newTitle = trim($request->input('title'));

        DB::beginTransaction();
        try {
            $items = $request->input('items', []);

            // Process image uploads per item
            foreach ($items as $idx => &$item) {
                $processedImages = [];
                if (!empty($item['images'])) {
                    foreach ($item['images'] as $img) {
                        $tempPath = $img['path'] ?? null;
                        if ($tempPath && str_contains($tempPath, 'temp/')) {
                            $fullTempPath = storage_path('app/public/' . $tempPath);
                            if (file_exists($fullTempPath)) {
                                // Create an InstructionImage row
                                $instImage = InstructionImage::create([
                                    'kategori' => $newTitle,
                                    'file_path' => basename($fullTempPath),
                                    'created_by' => $userId,
                                ]);
                                
                                // Attach media using Spatie
                                $media = $instImage->addMedia($fullTempPath)->toMediaCollection('guide');
                                
                                $processedImages[] = [
                                    'path' => $media->id,
                                    'url' => $media->getUrl(),
                                    'name' => $img['name'] ?? basename($fullTempPath),
                                ];
                            }
                        } else {
                            // Keep already processed images. Update title association if changed.
                            if ($oldTitle !== $newTitle) {
                                // If title has changed, we should re-associate the existing database records of InstructionImage
                                InstructionImage::where('kategori', $oldTitle)->update(['kategori' => $newTitle]);
                            }
                            $processedImages[] = $img;
                        }
                    }
                }
                $item['images'] = $processedImages;
            }

            // If the title changed, rename the category on all remaining InstructionImages
            if ($oldTitle !== $newTitle) {
                InstructionImage::where('kategori', $oldTitle)->update(['kategori' => $newTitle]);
            }

            $guide->update([
                'kategori' => $newTitle,
                'data_json' => [
                    'description' => trim($request->input('description')),
                    'items' => $items,
                ],
                'updated_by' => $userId,
            ]);

            DB::commit();
            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('ubah', 'Instruksi', (string) $guide->id, 'Panduan ' . $newTitle);
            return redirect('/instruction')->with('success', 'Panduan teknis berhasil diperbarui!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal memperbarui panduan: ' . $e->getMessage());
        }
    }

    public function delete(Request $request, $id)
    {
        abort_unless(Peran::bolehTulis(), 403, 'Akun viewer hanya boleh melihat data.');
        $guide = InstructionTable::findOrFail($id);

        DB::beginTransaction();
        try {
            // Delete associated images in Spatie MediaLibrary
            $images = InstructionImage::where('kategori', $guide->kategori)->get();
            foreach ($images as $img) {
                $img->delete(); // Spatie deletes media files automatically
            }

            $guide->delete();

            DB::commit();
            // Jejak audit: satu baris per aksi tulis.
            Aktivitas::catat('hapus', 'Instruksi', (string) $id, 'Panduan ' . $guide->kategori);
            return redirect('/instruction')->with('success', 'Panduan teknis berhasil dihapus!');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Gagal menghapus panduan: ' . $e->getMessage());
        }
    }
}
