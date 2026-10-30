# Vos lunettes ont été retrouvées

Bonjour {{ $firstName }},

Une paire de lunettes associée à votre compte a été déposée chez **{{ $shop->name }}**.

Votre code de restitution : **{{ $pickupCode }}**

Présentez-le à l’opticien pour récupérer vos lunettes :

{{ $publicUrl }}

@if($shop->address)
Lieu de retrait : {{ $shop->address }}{{ $shop->postal_code ? ', '.$shop->postal_code : '' }}{{ $shop->city ? ' '.$shop->city : '' }}
@endif
