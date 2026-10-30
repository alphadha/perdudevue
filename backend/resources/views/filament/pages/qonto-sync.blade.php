<x-filament-panels::page>
    <p>
        @if ($configured)
            Les clés Qonto sont présentes. La synchro réelle attend le contrat et le mapping métier (arbitrages client).
        @else
            Aucune clé <code>QONTO_SECRET</code>. La synchronisation est refusée (aucun appel API).
        @endif
    </p>
    @if ($logs->isEmpty())
        <p>Aucun journal de synchronisation pour le moment.</p>
    @else
        <ul>
            @foreach ($logs as $log)
                <li>{{ $log->ran_at?->format('d/m/Y H:i') }} — {{ $log->status }} — {{ $log->message }}</li>
            @endforeach
        </ul>
    @endif
</x-filament-panels::page>
