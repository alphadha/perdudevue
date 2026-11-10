<?php

namespace App\Mail\Transports;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\MessageConverter;

/** Envoi transactionnel via l’API REST Brevo (`/v3/smtp/email`) — pas SMTP. */
class BrevoApiTransport extends AbstractTransport
{
    public function __construct(private readonly string $apiKey)
    {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        if ($this->apiKey === '') {
            throw new TransportException('Clé API Brevo absente.');
        }

        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $response = Http::withHeaders([
            'api-key' => $this->apiKey,
            'accept' => 'application/json',
            'content-type' => 'application/json',
        ])->timeout(15)->post('https://api.brevo.com/v3/smtp/email', $this->payload($email));

        if ($response->failed()) {
            throw new TransportException(
                'Brevo API HTTP '.$response->status().': '.$response->body()
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(Email $email): array
    {
        $from = $email->getFrom()[0] ?? null;
        if ($from === null) {
            throw new TransportException('Expéditeur manquant pour Brevo.');
        }

        $payload = [
            'sender' => $this->mapAddress($from),
            'to' => array_map(fn (Address $address): array => $this->mapAddress($address), $email->getTo()),
            'subject' => $email->getSubject() ?? '',
        ];

        if ($email->getCc() !== []) {
            $payload['cc'] = array_map(fn (Address $address): array => $this->mapAddress($address), $email->getCc());
        }
        if ($email->getBcc() !== []) {
            $payload['bcc'] = array_map(fn (Address $address): array => $this->mapAddress($address), $email->getBcc());
        }
        if ($email->getReplyTo() !== []) {
            $payload['replyTo'] = $this->mapAddress($email->getReplyTo()[0]);
        }

        $html = $email->getHtmlBody();
        $text = $email->getTextBody();
        if (filled($html)) {
            $payload['htmlContent'] = $html;
        }
        if (filled($text)) {
            $payload['textContent'] = $text;
        }
        if (! isset($payload['htmlContent']) && ! isset($payload['textContent'])) {
            $payload['textContent'] = $payload['subject'];
        }

        $attachments = [];
        foreach ($email->getAttachments() as $attachment) {
            $headers = $attachment->getPreparedHeaders();
            $filename = $headers->getHeaderParameter('Content-Disposition', 'filename') ?: 'piece-jointe';
            $attachments[] = [
                'name' => $filename,
                'content' => base64_encode($attachment->getBody()),
            ];
        }
        if ($attachments !== []) {
            $payload['attachment'] = $attachments;
        }

        return $payload;
    }

    /**
     * @return array{email: string, name?: string}
     */
    private function mapAddress(Address $address): array
    {
        $mapped = ['email' => $address->getAddress()];
        if ($address->getName() !== '') {
            $mapped['name'] = $address->getName();
        }

        return $mapped;
    }

    public function __toString(): string
    {
        return 'brevo+api';
    }
}
