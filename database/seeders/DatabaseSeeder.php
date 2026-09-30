<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Users
        DB::table('users')->insert([
            [
                'username' => 'admin',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
                'created_at' => now(),
            ],
            [
                'username' => 'pm',
                'password' => Hash::make('pm12345'),
                'role' => 'project_manager',
                'created_at' => now(),
            ],
            [
                'username' => 'teknisi',
                'password' => Hash::make('teknisi123'),
                'role' => 'technician',
                'created_at' => now(),
            ],
            [
                'username' => 'viewer',
                'password' => Hash::make('viewer123'),
                'role' => 'viewer',
                'created_at' => now(),
            ],
        ]);

        // 2. Seed Gudang Barang
        $predefined = [
            'MCB' => ['1P 6A','1P 10A','1P 16A','1P 20A','1P 32A','2P 10A','2P 16A','3P 16A','3P 32A','4P 16A','4P 32A'],
            'PDU' => ['8G','12G'],
            'Recti' => ['48V 25A','48V 50A','48V 100A'],
            'Inverter' => ['1KVA','2KVA','3KVA','5KVA'],
            'Baterai' => ['12V 7Ah','12V 100Ah','12V 150Ah','12V 200Ah'],
            'UPS' => ['1KVA Online','2KVA Online','3KVA Online','5KVA Online'],
            'Kabel' => ['NYY 2x1.5','NYY 2x2.5','NYY 4x6','NYY 4x10','NYY 4x16'],
            'Konektor' => ['RJ45 Cat6','Fiber SC','Fiber LC'],
            'Busbar' => ['100A 1P','100A 3P','Tembaga 10x3mm'],
            'Panel' => ['ATS 100A','ATS 200A','ACPDB 1 Phase','ACPDB 3 Phase'],
            'Grounding' => ['Rod 16mm 1.5m','Rod 16mm 2m','Kabel BC 10mm²','Terminal Bar 16 Port']
        ];

        $kat_satuan = [
            'MCB' => 'Pcs', 'PDU' => 'Pcs', 'Recti' => 'Pcs', 'Inverter' => 'Pcs',
            'Baterai' => 'Pcs', 'UPS' => 'Pcs', 'Kabel' => 'Meter', 'Konektor' => 'Pcs',
            'Busbar' => 'Batang', 'Panel' => 'Pcs', 'Grounding' => 'Set'
        ];

        $barang = [];
        foreach ($predefined as $kat => $tipes) {
            foreach ($tipes as $tipe) {
                $barang[] = [
                    'nama' => $kat . ' ' . $tipe,
                    'kategori' => $kat,
                    'tipe' => $tipe,
                    'stok' => rand(5, 50),
                    'satuan' => $kat_satuan[$kat] ?? 'Unit',
                    'min_stok' => 5,
                    'created_at' => now()
                ];
            }
        }
        DB::table('gudang_barang')->insert($barang);
    }
}
