<?php

namespace App\Services;

use App\Models\CodeLot;
use App\Models\CodeLotItem;
use App\Models\Pair;
use App\Support\AssignedCode;
use Illuminate\Support\Facades\DB;

class CodeLotService
{
    public function create(string $name, int $quantity): CodeLot
    {
        $quantity = max(1, min(500, $quantity));

        return DB::transaction(function () use ($name, $quantity): CodeLot {
            $lot = CodeLot::query()->create([
                'name' => $name,
                'quantity' => $quantity,
                'status' => 'generated',
            ]);

            for ($i = 0; $i < $quantity; $i++) {
                CodeLotItem::query()->create([
                    'code_lot_id' => $lot->id,
                    'code' => AssignedCode::generateUnique(),
                    'status' => 'available',
                ]);
            }

            return $lot->load('items');
        });
    }

    public function isAssigned(string $code): bool
    {
        return CodeLotItem::query()
            ->where('code', $code)
            ->where('status', 'assigned')
            ->exists();
    }

    public function markAssigned(string $code, Pair $pair): void
    {
        $item = CodeLotItem::query()
            ->where('code', $code)
            ->where('status', 'available')
            ->whereNull('pair_id')
            ->first();

        if ($item === null) {
            return;
        }

        $item->update([
            'status' => 'assigned',
            'pair_id' => $pair->id,
        ]);

        $lot = $item->lot;
        if ($lot !== null && $lot->items()->where('status', 'available')->doesntExist()) {
            $lot->status = 'consumed';
            $lot->save();
        }
    }

    public function csv(CodeLot $lot): string
    {
        $lot->loadMissing('items');
        $lines = ['code'];
        foreach ($lot->items as $item) {
            $lines[] = $item->code;
        }
        $lot->status = 'exported';
        $lot->exported_at = now();
        $lot->save();

        return implode("\n", $lines)."\n";
    }
}
