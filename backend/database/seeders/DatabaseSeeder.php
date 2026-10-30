<?php

namespace Database\Seeders;

use App\Enums\PairStatus;
use App\Enums\Role;
use App\Models\Client;
use App\Models\Invitation;
use App\Models\NotificationLog;
use App\Models\Optician;
use App\Models\Pair;
use App\Models\PublicRestitutionToken;
use App\Models\ShopNotification;
use App\Models\User;
use App\Services\ShopInboxService;
use App\Support\SecureToken;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public const PASSWORD = 'Password1';

    public const INVITATION_C1 = 'recette-invitation-c1';

    public const PUBLIC_TOKEN_P1 = 'recette-public-p1';

    public function run(): void
    {
        $admin = $this->user('Admin', 'PDV', 'admin@perduesdevue.fr', Role::AdminPdv);

        $optA = $this->optician('Optique A', '10 rue de la Paix', 'Paris', '75002', '0142000001');
        $optB = $this->optician('L’Œil Moderne', '15 rue du Taur', 'Toulouse', '31000', '0561000002');

        $optAAdmin = $this->user('Alice', 'Martin', 'opticien.a@example.com', Role::OpticienAdmin);
        $optAUser = $this->user('Alex', 'Durand', 'opticien.a.user@example.com', Role::OpticienUser);
        $optBAdmin = $this->user('Hugo', 'Bonnet', 'opticien.b@example.com', Role::OpticienAdmin);

        $optA->users()->attach([$optAAdmin->id, $optAUser->id]);
        $optB->users()->attach($optBAdmin->id);

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
            'href' => '/opticien/restitution',
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
        ShopNotification::query()->create([
            'optician_id' => $optA->id,
            'pair_id' => $pairAtA->id,
            'type' => ShopInboxService::TYPE_WAITING_PICKUP,
            'title' => 'Lunettes en attente de retrait',
            'body' => 'Une paire de lunettes est en attente de retrait dans votre magasin.',
            'href' => '/opticien/restitution',
        ]);

        foreach ([
            ['FR6001AA', PairStatus::Active],
            ['FR6002BB', PairStatus::Perdue],
            ['FR6003CC', PairStatus::Inactive],
        ] as [$code, $status]) {
            $extra = new Pair;
            $extra->forceFill([
                'client_id' => $c2->id,
                'origin_optician_id' => $optA->id,
                'assigned_code' => $code,
                'status' => $status,
                'type' => 'Vue',
                'brand' => 'Gucci',
                'colors' => ['Noir'],
                'description' => 'Monture en titane',
                'registered_at' => now()->subMonths(2),
            ])->save();
        }

        $this->command?->info('Jeu recette prêt (mot de passe commun : '.self::PASSWORD.')');
        $this->command?->info('ADM        admin@perduesdevue.fr');
        $this->command?->info('OPT-A      opticien.a@example.com');
        $this->command?->info('OPT-B      opticien.b@example.com');
        $this->command?->info('C1 (à activer) client.c1@example.com  token='.self::INVITATION_C1);
        $this->command?->info('C2         client.c2@example.com  (paires Active / Perdue / Inactive)');
        $this->command?->info('Page publique /r/'.self::PUBLIC_TOKEN_P1);
        $this->command?->info('Admin uuid seed : '.$admin->uuid);
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
