<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Pair;
use App\Models\User;
use Illuminate\Http\Request;

class AuditService
{
    /** @var list<string> */
    public const AUTH_ACTIONS = [
        'login',
        'login_failed',
        'logout',
    ];

    /**
     * @param  array<string, mixed>|null  $meta
     */
    public function record(?User $user, string $action, ?Request $request = null, ?array $meta = null): void
    {
        $meta = $this->sanitizeMeta($meta ?? []);
        $actorLabel = $this->actorLabel($user, $meta);
        $opticianId = $user?->primaryOptician()?->id
            ?? (isset($meta['depositary_optician_id']) ? (int) $meta['depositary_optician_id'] : null)
            ?? (isset($meta['optician_id']) ? (int) $meta['optician_id'] : null);

        AuditLog::query()->create([
            'user_id' => $user?->id,
            'actor_label' => $actorLabel,
            'optician_id' => $opticianId,
            'action' => $action,
            'summary' => $this->summarize($action, $actorLabel, $meta),
            'ip_address' => $request?->ip(),
            'meta' => $meta === [] ? null : $meta,
        ]);
    }

    /**
     * @param  array<string, mixed>  $meta
     * @return array<string, mixed>
     */
    private function sanitizeMeta(array $meta): array
    {
        foreach (['password', 'otp', 'code', 'pickup_code', 'token', 'secret'] as $key) {
            unset($meta[$key]);
        }

        if (isset($meta['email']) && is_string($meta['email'])) {
            $meta['email'] = strtolower(trim($meta['email']));
        }

        return $meta;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function actorLabel(?User $user, array $meta): string
    {
        if ($user !== null) {
            $name = trim(($user->first_name ?? '').' '.($user->last_name ?? ''));
            $role = $user->role?->value ?? 'user';

            return trim(($name !== '' ? $name : 'Utilisateur').' <'.$user->email.'> ['.$role.']');
        }

        if (! empty($meta['email']) && is_string($meta['email'])) {
            return 'Tentative <'.$meta['email'].'>';
        }

        if (($meta['via'] ?? null) === 'public_link') {
            return 'Lien public (sans session)';
        }

        return 'Acteur inconnu';
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function summarize(string $action, string $actorLabel, array $meta): string
    {
        $space = isset($meta['space']) ? $this->spaceLabel((string) $meta['space']) : null;
        $pairRef = $this->pairRef($meta);

        return match ($action) {
            'login' => sprintf('%s s’est connecté(e)%s.', $actorLabel, $space ? ' (espace '.$space.')' : ''),
            'login_failed' => sprintf(
                'Échec de connexion%s%s.',
                isset($meta['email']) ? ' pour '.$meta['email'] : '',
                $space ? ' (espace '.$space.')' : ''
            ),
            'logout' => sprintf('%s s’est déconnecté(e)%s.', $actorLabel, $space ? ' (espace '.$space.')' : ''),
            'optician_created' => sprintf('%s a créé un magasin opticien.', $actorLabel),
            'client.created' => sprintf('%s a créé un client.', $actorLabel),
            'client.attached' => sprintf('%s a rattaché un client existant au magasin.', $actorLabel),
            'client.updated' => sprintf('%s a modifié une fiche client.', $actorLabel),
            'client.unlinked' => sprintf('%s a détaché un client du magasin.', $actorLabel),
            'client.duplicate_detected' => sprintf('%s a rencontré un doublon client à la création.', $actorLabel),
            'client.identity_otp' => sprintf('%s a déclenché une vérification d’identité (OTP).', $actorLabel),
            'client.identity_otp_resend' => sprintf('%s a renvoyé un code de vérification d’identité.', $actorLabel),
            'client.profile_updated' => sprintf('%s a mis à jour son profil client.', $actorLabel),
            'client.consents_updated' => sprintf('%s a modifié ses préférences de notification.', $actorLabel),
            'account.password_changed' => sprintf('%s a changé son mot de passe.', $actorLabel),
            'account.email_changed' => sprintf('%s a changé son adresse e-mail.', $actorLabel),
            'account.deleted' => sprintf('%s a supprimé son compte.', $actorLabel),
            'shop_user.invited' => sprintf('%s a invité un utilisateur magasin.', $actorLabel),
            'shop_user.invite_resent' => sprintf('%s a renvoyé l’invitation d’un utilisateur magasin.', $actorLabel),
            'shop_user.removed' => sprintf('%s a retiré un utilisateur magasin.', $actorLabel),
            'pair.created' => sprintf(
                '%s a enregistré une paire%s%s.',
                $actorLabel,
                $pairRef ? ' '.$pairRef : '',
                isset($meta['status']) ? ' (statut '.$meta['status'].')' : ''
            ),
            'pair.engraved' => sprintf('%s a indiqué une paire comme gravée%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'pair.lost' => sprintf('%s a déclaré une paire perdue%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'pair.recovered' => sprintf('%s a annulé une déclaration de perte%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'pair.found' => sprintf('%s a signalé une paire retrouvée%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'pair.returned' => sprintf('%s a confirmé la remise en magasin%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'pair.pickup_resent' => sprintf('%s a renvoyé le code de restitution%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'pair.inactivated' => sprintf('%s a déclaré une paire inactive%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'pair.archived' => sprintf('%s a archivé / supprimé une paire%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'shipment.checkout' => sprintf('%s a démarré le paiement d’un envoi à distance%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'shipment.paid' => sprintf('%s a payé un envoi à distance%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'shipment.payment_failed' => sprintf('%s a échoué au paiement d’un envoi%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'shipment.shipped' => sprintf('%s a indiqué un colis comme en livraison%s.', $actorLabel, $pairRef ? ' '.$pairRef : ''),
            'platform_settings.updated' => sprintf(
                '%s a mis à jour les paramètres plateforme (%d clé(s)).',
                $actorLabel,
                is_array($meta['keys'] ?? null) ? count($meta['keys']) : 0
            ),
            default => sprintf('%s — action « %s ».', $actorLabel, $action),
        };
    }

    private function spaceLabel(string $space): string
    {
        return match ($space) {
            'admin' => 'admin',
            'opticien' => 'opticien',
            'client' => 'client',
            default => $space,
        };
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function pairRef(array $meta): ?string
    {
        if (! empty($meta['assigned_code']) && is_string($meta['assigned_code'])) {
            return '('.$meta['assigned_code'].')';
        }
        if (! empty($meta['assigned_code_kept']) && is_string($meta['assigned_code_kept'])) {
            return '('.$meta['assigned_code_kept'].')';
        }
        if (! empty($meta['pair_uuid']) && is_string($meta['pair_uuid'])) {
            $code = Pair::query()->where('uuid', $meta['pair_uuid'])->value('assigned_code');

            return $code ? '('.$code.')' : '(paire '.$meta['pair_uuid'].')';
        }

        return null;
    }
}
