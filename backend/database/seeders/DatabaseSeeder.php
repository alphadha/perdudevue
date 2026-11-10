<?php

namespace Database\Seeders;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Models\Client;
use App\Models\Invitation;
use App\Models\NotificationLog;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\PairEvent;
use App\Models\PublicRestitutionToken;
use App\Models\Shipment;
use App\Models\ShopNotification;
use App\Models\User;
use App\Services\EmailTemplateService;
use App\Services\ShopInboxService;
use App\Support\SecureToken;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public const PASSWORD = 'Password1';

    public const INVITATION_C1 = 'recette-invitation-c1';

    public const INVITATION_USED = 'recette-invitation-used';

    public const PUBLIC_TOKEN_P1 = 'recette-public-p1';

    public function run(): void
    {
        app(EmailTemplateService::class)->ensureDefaults();

        $admin = $this->user('Admin', 'PDV', 'admin@perduesdevue.fr', Role::AdminPdv);

        $optA = $this->optician('Optique A', '10 rue de la Paix', 'Paris', '75002', '0142000001');
        $optB = $this->optician('L’Œil Moderne', '15 rue du Taur', 'Toulouse', '31000', '0561000002');
        $optC = $this->optician('Optique C', '1 place Vide', 'Lille', '59000', '0320000003');

        $optAAdmin = $this->user('Alice', 'Martin', 'opticien.a@example.com', Role::OpticienAdmin);
        $optAUser = $this->user('Alex', 'Durand', 'opticien.a.user@example.com', Role::OpticienUser);
        $optAPending = $this->user('Thomas', 'Roux', 'thomas.roux@example.com', Role::OpticienUser, pending: true);
        $optBAdmin = $this->user('Hugo', 'Bonnet', 'opticien.b@example.com', Role::OpticienAdmin);
        $optCAdmin = $this->user('Inès', 'Petit', 'opticien.c@example.com', Role::OpticienAdmin);

        $optA->users()->attach([$optAAdmin->id, $optAUser->id, $optAPending->id]);
        $optB->users()->attach($optBAdmin->id);
        $optC->users()->attach($optCAdmin->id);

        $c1User = $this->user('Camille', 'Leroy', 'client.c1@example.com', Role::Client, pending: true);
        $c2User = $this->user('Chloé', 'Bernard', 'client.c2@example.com', Role::Client);

        $c1 = $this->client($c1User);
        $c2 = $this->client($c2User);

        $optA->clients()->attach($c1->id);
        $optA->clients()->attach($c2->id);
        $optB->clients()->attach($c2->id);

        Invitation::query()->create([
            'user_id' => $c1User->id,
            'token_hash' => SecureToken::hash(self::INVITATION_C1),
            'expires_at' => now()->addDays(7),
        ]);
        Invitation::query()->create([
            'user_id' => $c2User->id,
            'token_hash' => SecureToken::hash(self::INVITATION_USED),
            'expires_at' => now()->addDays(7),
            'used_at' => now()->subDays(2),
        ]);
        NotificationLog::query()->create([
            'channel' => 'email',
            'recipient' => $c1User->email,
            'type' => 'invitation',
            'status' => 'sent',
        ]);

        // Dépôt chez OptB (dépositaire ≠ origine) — visible home OptB
        $pairAtB = new Pair;
        $pairAtB->forceFill([
            'client_id' => $c1->id,
            'origin_optician_id' => $optA->id,
            'depositary_optician_id' => $optB->id,
            'assigned_code' => 'FR5487OK',
            'status' => PairStatus::ARecuperer,
            'type' => 'Vue',
            'brand' => 'Gucci',
            'colors' => ['Bleu', 'Gris'],
            'description' => 'Monture en titane',
            'registered_at' => now()->subYear(),
            'found_at' => now()->subDay(),
            'restitution_ref' => 'R-2025-0001',
        ])->save();
        $pairAtB->pickup_code = 'KSKKYK';
        $pairAtB->save();
        $this->timeline($pairAtB, [
            ['registered', now()->subYear()],
            ['lost', now()->subDays(10)],
            ['found', now()->subDay()],
        ]);

        PublicRestitutionToken::query()->create([
            'pair_id' => $pairAtB->id,
            'token_hash' => SecureToken::hash(self::PUBLIC_TOKEN_P1),
            'expires_at' => now()->addDays(30),
        ]);
        ShopNotification::query()->create([
            'optician_id' => $optB->id,
            'pair_id' => $pairAtB->id,
            'type' => ShopInboxService::TYPE_WAITING_PICKUP,
            'title' => 'Lunettes en attente de retrait',
            'body' => 'Une paire de lunettes est en attente de retrait dans votre magasin.',
            'href' => '/opticien/restitution/'.$pairAtB->uuid,
        ]);

        // Dépôt chez OptA — visible home OptA (« À récupérer »)
        $pairAtA = new Pair;
        $pairAtA->forceFill([
            'client_id' => $c2->id,
            'origin_optician_id' => $optA->id,
            'depositary_optician_id' => $optA->id,
            'assigned_code' => 'FR5488OK',
            'status' => PairStatus::ARecuperer,
            'type' => 'Soleil',
            'brand' => 'Gucci',
            'colors' => ['Noir'],
            'description' => 'Monture plastique',
            'registered_at' => now()->subMonths(3),
            'found_at' => now()->subHours(2),
            'restitution_ref' => 'R-2025-0002',
        ])->save();
        $pairAtA->pickup_code = 'ABCDEF';
        $pairAtA->save();
        $this->timeline($pairAtA, [
            ['registered', now()->subMonths(3)],
            ['lost', now()->subDays(8)],
            ['found', now()->subHours(2)],
        ]);
        ShopNotification::query()->create([
            'optician_id' => $optA->id,
            'pair_id' => $pairAtA->id,
            'type' => ShopInboxService::TYPE_WAITING_PICKUP,
            'title' => 'Lunettes en attente de retrait',
            'body' => 'Une paire de lunettes est en attente de retrait dans votre magasin.',
            'href' => '/opticien/restitution/'.$pairAtA->uuid,
        ]);

        $active = $this->clientPair($c2, $optA, 'FR6001AA', PairStatus::Active);
        $this->timeline($active, [
            ['registered', now()->subMonths(2)],
        ]);

        $lost = $this->clientPair($c2, $optA, 'FR6002BB', PairStatus::Perdue);
        $this->timeline($lost, [
            ['registered', now()->subMonths(2)],
            ['lost', now()->subDays(4)],
        ]);

        $inactive = $this->clientPair($c2, $optA, 'FR6003CC', PairStatus::Inactive);
        $this->timeline($inactive, [
            ['registered', now()->subMonths(2)],
            ['lost', now()->subDays(20)],
            ['inactivated', now()->subDays(3)],
        ]);

        $deliveryRequested = $this->clientPair($c2, $optA, 'FR6102LD', PairStatus::LivraisonDemandee);
        $this->timeline($deliveryRequested, [
            ['registered', now()->subMonths(4)],
            ['lost', now()->subDays(18)],
            ['found', now()->subDays(12)],
            ['delivery_requested', now()->subDays(6)],
        ]);
        $this->shipment($deliveryRequested, $c2, 'paid', shipped: false);

        $deliveryRequestedBis = $this->clientPair($c2, $optA, 'FR6103LD', PairStatus::LivraisonDemandee, 'Soleil');
        $this->timeline($deliveryRequestedBis, [
            ['registered', now()->subMonths(3)],
            ['lost', now()->subDays(14)],
            ['found', now()->subDays(10)],
            ['delivery_requested', now()->subDays(4)],
        ]);
        $this->shipment($deliveryRequestedBis, $c2, 'paid', shipped: false);

        $inTransit = $this->clientPair($c2, $optA, 'FR6101EL', PairStatus::EnLivraison, 'Soleil');
        $this->timeline($inTransit, [
            ['registered', now()->subMonths(5)],
            ['lost', now()->subDays(25)],
            ['found', now()->subDays(16)],
            ['delivery_requested', now()->subDays(9)],
            ['shipped', now()->subDays(2)],
        ]);
        $this->shipment($inTransit, $c2, 'in_transit', shipped: true);

        $this->command?->info('Jeu recette prêt (mot de passe commun : '.self::PASSWORD.')');
        $this->command?->info('ADM        admin@perduesdevue.fr');
        $this->command?->info('OPT-A      opticien.a@example.com');
        $this->command?->info('OPT-B      opticien.b@example.com');
        $this->command?->info('OPT-C vide opticien.c@example.com');
        $this->command?->info('C1 (à activer) client.c1@example.com  token='.self::INVITATION_C1);
        $this->command?->info('C2         client.c2@example.com  (6 statuts + historiques / livraisons)');
        $this->command?->info('Invitation déjà utilisée /invitation/'.self::INVITATION_USED);
        $this->command?->info('Page publique /r/'.self::PUBLIC_TOKEN_P1);
        $this->command?->info('Admin uuid seed : '.$admin->uuid);
    }

    /**
     * @param  list<array{0: string, 1: \DateTimeInterface}>  $items
     */
    private function timeline(Pair $pair, array $items): void
    {
        foreach ($items as [$type, $at]) {
            $event = new PairEvent;
            $event->pair_id = $pair->id;
            $event->type = $type;
            $event->created_at = $at;
            $event->updated_at = $at;
            $event->save();
        }
    }

    private function clientPair(
        Client $client,
        Optician $origin,
        string $code,
        PairStatus $status,
        string $type = 'Vue',
    ): Pair {
        $inRestitution = in_array($status, [
            PairStatus::ARecuperer,
            PairStatus::LivraisonDemandee,
            PairStatus::EnLivraison,
        ], true);

        $pair = new Pair;
        $pair->forceFill([
            'client_id' => $client->id,
            'origin_optician_id' => $origin->id,
            'depositary_optician_id' => $inRestitution ? $origin->id : null,
            'assigned_code' => $code,
            'status' => $status,
            'type' => $type,
            'brand' => 'Gucci',
            'colors' => ['Noir'],
            'description' => 'Monture en titane',
            'registered_at' => now()->subMonths(2),
            'found_at' => $inRestitution ? now()->subDays(12) : null,
            'restitution_ref' => $inRestitution ? 'R-SEED-'.$code : null,
        ])->save();

        return $pair;
    }

    private function shipment(Pair $pair, Client $client, string $status, bool $shipped): void
    {
        Shipment::query()->create([
            'pair_id' => $pair->id,
            'status' => $status,
            'mode' => 'relay',
            'carrier' => 'Mondial Relay',
            'price_cents' => 690,
            'recipient_first_name' => $client->first_name,
            'recipient_last_name' => $client->last_name,
            'address_line' => '31 rue Léon Dehuz',
            'postal_code' => '08000',
            'city' => 'Charleville-Mézières',
            'relay_id' => 'FR-SEED-'.$pair->assigned_code,
            'relay_name' => 'LOCKER NETTO CHARLEVILLE MEZIER',
            'consent_address_at' => now()->subDays(8),
            'payment_ref' => 'pay-seed-'.$pair->assigned_code,
            'label_ref' => 'BL-SEED-'.$pair->assigned_code,
            'tracking_ref' => $shipped ? 'MR-SEED-'.$pair->assigned_code : null,
            'paid_at' => now()->subDays(6),
            'shipped_at' => $shipped ? now()->subDays(2) : null,
        ]);
    }

    private function user(string $first, string $last, string $email, Role $role, bool $pending = false): User
    {
        $user = new User;
        $user->first_name = $first;
        $user->last_name = $last;
        $user->email = $email;
        $user->phone = '0600000000';
        $user->role = $role;
        if (! $pending) {
            $user->password = self::PASSWORD;
            $user->password_set_at = now();
            $user->cgu_accepted_at = now();
            $user->email_verified_at = now();
        }
        $user->save();

        return $user;
    }

    private function optician(string $name, string $address, string $city, string $postal, string $phone): Optician
    {
        return Optician::query()->create([
            'name' => $name,
            'address' => $address,
            'city' => $city,
            'postal_code' => $postal,
            'phone' => $phone,
            'email' => strtolower(str_replace(' ', '', $name)).'@example.com',
        ]);
    }

    private function client(User $user): Client
    {
        return Client::query()->create([
            'user_id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'consent_email' => true,
            'consent_sms' => true,
        ]);
    }
}
