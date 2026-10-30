<?php

namespace App\Services;

use App\Models\Network;
use App\Models\NetworkTariff;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\QontoSyncLog;

class BillingReviewService
{
    /**
     * @return list<array{level: string, subject: string, message: string}>
     */
    public function issues(): array
    {
        $issues = [];
        $shops = Optician::query()->with(['network.tariffs'])->get();

        $siretCounts = $shops
            ->filter(fn (Optician $shop): bool => filled($shop->siret))
            ->groupBy('siret')
            ->map->count();

        foreach ($shops as $shop) {
            if (blank($shop->siret)) {
                $issues[] = $this->issue('error', $shop->name, 'SIRET manquant — facturation bloquée.');
            } elseif (! preg_match('/^\d{14}$/', (string) $shop->siret)) {
                $issues[] = $this->issue('error', $shop->name, 'SIRET invalide (14 chiffres attendus).');
            } elseif (($siretCounts[$shop->siret] ?? 0) > 1) {
                $issues[] = $this->issue('error', $shop->name, 'SIRET en doublon.');
            }

            if ($shop->network_id === null) {
                $issues[] = $this->issue('warning', $shop->name, 'Aucun réseau tarifaire rattaché.');
            } else {
                $network = $shop->network;
                if ($network !== null && ! $network->active) {
                    $issues[] = $this->issue('warning', $shop->name, 'Réseau tarifaire inactif.');
                }
                if ($network !== null && $network->tariffs->isEmpty()) {
                    $issues[] = $this->issue('error', $shop->name, 'Réseau rattaché sans tarif.');
                }
            }

            if (blank($shop->billing_email)) {
                $issues[] = $this->issue('warning', $shop->name, 'E-mail de facturation manquant.');
            }
            if (blank($shop->billing_iban)) {
                $issues[] = $this->issue('warning', $shop->name, 'IBAN manquant.');
            }
            if (blank($shop->qonto_id)) {
                $issues[] = $this->issue('warning', $shop->name, 'ID contrepartie Qonto manquant.');
            }
        }

        foreach (Network::query()->withCount('tariffs')->get() as $network) {
            if ($network->tariffs_count === 0) {
                $issues[] = $this->issue('error', $network->name, 'Réseau sans tarif.');
            }
        }

        return $issues;
    }

    /**
     * Volumes du mois civil — montants indicatifs seulement (barème de prod non tranché).
     *
     * @return list<array{shop: string, network: string, pairs: int, tariff: string, amount_label: string}>
     */
    public function previews(): array
    {
        $from = now()->startOfMonth();
        $to = now()->endOfMonth();
        $rows = [];

        foreach (Optician::query()->with(['network.tariffs'])->orderBy('name')->get() as $shop) {
            $pairCount = Pair::query()
                ->where('origin_optician_id', $shop->id)
                ->whereBetween('registered_at', [$from, $to])
                ->count();

            $tariffs = $shop->network?->tariffs
                ->filter(fn (NetworkTariff $tariff): bool => $tariff->isCurrent())
                ?? collect();

            $rows[] = [
                'shop' => $shop->name,
                'network' => $shop->network->name ?? '—',
                'pairs' => $pairCount,
                'tariff' => $tariffs->isEmpty()
                    ? 'Aucun tarif courant'
                    : $tariffs->map(fn (NetworkTariff $tariff): string => $tariff->summary())->implode(' · '),
                'amount_label' => $this->indicativeAmount($tariffs, $pairCount),
            ];
        }

        return $rows;
    }

    public function syncQonto(): QontoSyncLog
    {
        $secret = (string) config('services.qonto.secret');
        if ($secret === '') {
            return QontoSyncLog::query()->create([
                'status' => 'skipped',
                'message' => 'Clés Qonto absentes. Aucune synchronisation n’a été lancée.',
                'ran_at' => now(),
            ]);
        }

        return QontoSyncLog::query()->create([
            'status' => 'queued',
            'message' => 'Synchronisation Qonto enregistrée — implémentation API en attente du contrat client.',
            'ran_at' => now(),
        ]);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, NetworkTariff>  $tariffs
     */
    private function indicativeAmount($tariffs, int $pairCount): string
    {
        if ($tariffs->isEmpty()) {
            return 'Non calculé (barème incomplet)';
        }

        if ($tariffs->count() === 1 && $tariffs->first()->unit === 'per_pair') {
            $cents = $tariffs->first()->amount_cents * $pairCount;

            return number_format($cents / 100, 2, ',', ' ').' € (indicatif, à la paire)';
        }

        if ($tariffs->count() === 1 && $tariffs->first()->unit === 'monthly') {
            $cents = $tariffs->first()->amount_cents;

            return number_format($cents / 100, 2, ',', ' ').' € (indicatif, forfait)';
        }

        return 'Non calculé (plusieurs unités — arbitrage barème)';
    }

    /**
     * @return array{level: string, subject: string, message: string}
     */
    private function issue(string $level, string $subject, string $message): array
    {
        return compact('level', 'subject', 'message');
    }
}
