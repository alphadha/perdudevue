# Vos lunettes sont en cours d’expédition

Bonjour {{ $firstName }},

Votre paire **{{ $pair->title() }}** a été remise au transporteur **{{ $shipment->carrier }}**.

Destination : {{ $shipment->destinationSummary() }}

@if (filled($shipment->tracking_ref))
Code de suivi : **{{ $shipment->tracking_ref }}**
@endif

Vous pouvez suivre l’avancement depuis votre espace client. La date de livraison estimée sera communiquée dès que le contrat transporteur le permettra.
