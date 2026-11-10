<?php

namespace App\Services;

use App\Models\EmailTemplate;

class EmailTemplateService
{
    /**
     * @return array<string, array{
     *     name: string,
     *     subject: string,
     *     heading: string,
     *     body: string,
     *     button_label: ?string,
     *     highlight_label: ?string,
     *     placeholders: list<string>
     * }>
     */
    public static function defaults(): array
    {
        return [
            'invitation' => [
                'name' => 'Invitation client',
                'subject' => 'Activez votre espace — Perdues de Vue',
                'heading' => 'Bienvenue {{firstName}}',
                'body' => "Votre opticien a créé votre compte Perdues de Vue.\n\nCliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à vos lunettes.\n\nCe lien expire dans 7 jours.",
                'button_label' => 'Définir mon mot de passe',
                'highlight_label' => null,
                'placeholders' => ['firstName'],
            ],
            'password_otp' => [
                'name' => 'Code mot de passe oublié',
                'subject' => 'Votre code de réinitialisation — Perdues de Vue',
                'heading' => 'Code de réinitialisation',
                'body' => "Saisissez ce code à 6 chiffres pour choisir un nouveau mot de passe.\n\nIl expire dans 15 minutes. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.",
                'button_label' => null,
                'highlight_label' => 'Votre code',
                'placeholders' => ['code'],
            ],
            'identity_otp' => [
                'name' => 'Code de vérification d’identité',
                'subject' => 'Code de vérification — Perdues de Vue',
                'heading' => 'Vérification d’identité',
                'body' => "Saisissez ce code à 6 chiffres pour valider la mise à jour de vos informations.\n\nIl expire dans 15 minutes.",
                'button_label' => null,
                'highlight_label' => 'Votre code',
                'placeholders' => ['code'],
            ],
            'pair_found' => [
                'name' => 'Lunettes retrouvées',
                'subject' => 'Vos lunettes ont été retrouvées — Perdues de Vue',
                'heading' => 'Vos lunettes ont été retrouvées',
                'body' => "Bonjour {{firstName}},\n\nUne paire associée à votre compte a été déposée chez {{shopName}}.\n\nPrésentez le code de restitution à l’opticien pour récupérer vos lunettes.\n\n{{shopAddress}}",
                'button_label' => 'Voir les détails',
                'highlight_label' => 'Code de restitution',
                'placeholders' => ['firstName', 'shopName', 'shopAddress', 'pickupCode'],
            ],
            'shipment_shipped' => [
                'name' => 'Lunettes en expédition',
                'subject' => 'Vos lunettes sont en cours d’expédition — Perdues de Vue',
                'heading' => 'Vos lunettes sont en cours d’expédition',
                'body' => "Bonjour {{firstName}},\n\nVotre paire {{pairTitle}} a été remise au transporteur {{carrier}}.\n\nDestination : {{destination}}\n\nVous pouvez suivre l’avancement depuis votre espace client. La date de livraison estimée sera communiquée dès que le contrat transporteur le permettra.",
                'button_label' => 'Ouvrir mon espace',
                'highlight_label' => 'Code de suivi',
                'placeholders' => ['firstName', 'pairTitle', 'carrier', 'destination', 'trackingRef'],
            ],
        ];
    }

    public function ensureDefaults(): void
    {
        foreach (self::defaults() as $slug => $default) {
            EmailTemplate::query()->firstOrCreate(['slug' => $slug], $default);
        }
    }

    public function template(string $slug): EmailTemplate
    {
        $this->ensureDefaults();
        $found = EmailTemplate::query()->where('slug', $slug)->first();
        if ($found !== null) {
            return $found;
        }

        throw new \InvalidArgumentException('Modèle e-mail inconnu : '.$slug);
    }

    /**
     * @param  array<string, string|null>  $vars
     * @return array{
     *     subject: string,
     *     heading: string,
     *     bodyHtml: string,
     *     buttonLabel: ?string,
     *     buttonUrl: ?string,
     *     highlight: ?string,
     *     highlightLabel: ?string
     * }
     */
    public function render(string $slug, array $vars = []): array
    {
        $template = $this->template($slug);
        $plain = fn (?string $text): string => $this->fill((string) $text, $vars, false);

        return [
            'subject' => $plain($template->subject),
            'heading' => $plain($template->heading),
            'bodyHtml' => nl2br($this->fill($template->body, $vars, true), false),
            'buttonLabel' => filled($template->button_label) ? $plain($template->button_label) : null,
            'buttonUrl' => $vars['url'] ?? null,
            'highlight' => filled($vars['highlight'] ?? null) ? (string) $vars['highlight'] : null,
            'highlightLabel' => $template->highlight_label,
        ];
    }

    /**
     * @param  array<string, string|null>  $vars
     */
    private function fill(string $text, array $vars, bool $escapeTemplate): string
    {
        $source = $escapeTemplate ? e($text) : $text;

        return (string) preg_replace_callback('/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/', function (array $match) use ($vars, $escapeTemplate): string {
            $value = (string) ($vars[$match[1]] ?? '');

            return $escapeTemplate ? e($value) : $value;
        }, $source);
    }
}
