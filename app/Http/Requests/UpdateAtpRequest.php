<?php

namespace App\Http\Requests;

use App\Models\AtpTemplate;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAtpRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'template_id' => 'nullable|exists:atp_templates,id',
            'nama_site' => 'required|string',
            'tanggal' => 'required|date',
            'no_po' => 'required|string',
            'region' => 'nullable|string',
            'latitude' => 'nullable|string',
            'longitude' => 'nullable|string',
            'hasil_json' => 'required|array',
            'hasil_json.items' => 'required|array',
            'verdict' => 'nullable|string',
            'verdict_notes' => 'nullable|string',
            'approval_json' => 'nullable|array',
            'bastp_json' => 'nullable|string',
            'fotos_item' => 'nullable|array',
            'files_item' => 'nullable|array',
        ];

        $templateId = $this->input('template_id');
        $template = $templateId ? AtpTemplate::find($templateId) : null;

        if ($template && is_array($template->data_json)) {
            foreach ($template->data_json as $idx => $field) {
                if (isset($field['ty']) && in_array($field['ty'], ['sec', 'sub'])) {
                    continue;
                }

                $key = $field['id'] ?? ($field['_id'] ?? "field_{$idx}");
                $type = $field['type'] ?? 'text';
                $status = $this->input("hasil_json.items.{$key}");

                $rules["hasil_json.items.{$key}"] = 'nullable|in:OK,NG,NA';

                if ($status === 'OK' || $status === 'NG') {
                    if ($type === 'number') {
                        $rules["hasil_json.hasil.{$key}"] = 'nullable|numeric';
                    }

                    $rules["fotos_item.{$key}"] = 'nullable|array';
                    $rules["fotos_item.{$key}.*.path"] = 'nullable|string';
                }
            }
        } else {
            $items = $this->input('hasil_json.items', []);
            foreach ($items as $key => $status) {
                $rules["hasil_json.items.{$key}"] = 'nullable|in:OK,NG,NA';
                if ($status === 'OK' || $status === 'NG') {
                    $rules["fotos_item.{$key}"] = 'nullable|array';
                    $rules["fotos_item.{$key}.*.path"] = 'nullable|string';
                }
            }
        }

        return $rules;
    }

    public function messages(): array
    {
        $messages = [
            'template_id.exists' => 'Template yang dipilih tidak valid.',
            'nama_site.required' => 'Nama site wajib diisi.',
            'tanggal.required' => 'Tanggal pemeriksaan wajib diisi.',
            'no_po.required' => 'Nomor PO / SPK wajib diisi.',
            'hasil_json.required' => 'Data checklist checkpoint ATP wajib diisi.',
            'hasil_json.items.required' => 'Item checklist checkpoint ATP wajib diisi.',
        ];

        $templateId = $this->input('template_id');
        $template = $templateId ? AtpTemplate::find($templateId) : null;
        $itemNames = $this->input('hasil_json.itemNames', []);

        if ($template && is_array($template->data_json)) {
            foreach ($template->data_json as $idx => $field) {
                $key = $field['id'] ?? ($field['_id'] ?? "field_{$idx}");
                $namaItem = $field['label'] ?? ($field['d'][0] ?? ($itemNames[$key] ?? "Parameter #{$idx}"));

                $messages["hasil_json.items.{$key}.in"] = "Status untuk '{$namaItem}' harus OK, NG, atau NA.";
                $messages["hasil_json.hasil.{$key}.numeric"] = "Hasil untuk '{$namaItem}' harus berupa angka numerik.";
                $messages["fotos_item.{$key}.*.path.required"] = "File foto bukti untuk '{$namaItem}' tidak valid.";
            }
        } else {
            $items = $this->input('hasil_json.items', []);
            foreach ($items as $key => $status) {
                $namaItem = $itemNames[$key] ?? $key;
                $messages["hasil_json.items.{$key}.in"] = "Status untuk '{$namaItem}' harus OK, NG, atau NA.";
                $messages["fotos_item.{$key}.*.path.required"] = "File foto untuk '{$namaItem}' tidak valid.";
            }
        }

        return $messages;
    }
}
