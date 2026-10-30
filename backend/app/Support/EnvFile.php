<?php

namespace App\Support;

use RuntimeException;

class EnvFile
{
    public function __construct(private readonly string $path) {}

    public static function base(): self
    {
        return new self(base_path('.env'));
    }

    public function path(): string
    {
        return $this->path;
    }

    /**
     * @return array<string, string>
     */
    public function read(): array
    {
        if (! is_file($this->path)) {
            return [];
        }

        $vars = [];
        foreach (file($this->path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
            $trimmed = trim($line);
            if ($trimmed === '' || str_starts_with($trimmed, '#') || ! str_contains($trimmed, '=')) {
                continue;
            }
            [$name, $value] = explode('=', $line, 2);
            $name = trim($name);
            if ($name === '') {
                continue;
            }
            $vars[$name] = $this->unquote(trim($value));
        }

        return $vars;
    }

    public function get(string $name, ?string $default = null): ?string
    {
        $vars = $this->read();

        return array_key_exists($name, $vars) ? $vars[$name] : $default;
    }

    /**
     * @param  array<string, string|null>  $values
     */
    public function setMany(array $values): void
    {
        if (! is_file($this->path)) {
            throw new RuntimeException('Fichier .env introuvable : '.$this->path);
        }

        $content = file_get_contents($this->path);
        if ($content === false) {
            throw new RuntimeException('Impossible de lire '.$this->path);
        }

        foreach ($values as $name => $value) {
            $content = $this->upsertLine($content, $name, $value ?? '');
        }

        if (file_put_contents($this->path, $content) === false) {
            throw new RuntimeException('Impossible d’écrire '.$this->path);
        }
    }

    private function upsertLine(string $content, string $name, string $value): string
    {
        $line = $name.'='.$this->quote($value);
        $pattern = '/^'.preg_quote($name, '/').'=.*$/m';

        if (preg_match($pattern, $content) === 1) {
            return (string) preg_replace($pattern, $line, $content, 1);
        }

        $suffix = str_ends_with($content, "\n") ? '' : "\n";

        return $content.$suffix.$line."\n";
    }

    private function quote(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (preg_match('/\s|"|\'|#|\$|\\\\/', $value) === 1) {
            return '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $value).'"';
        }

        return $value;
    }

    private function unquote(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"'))
            || (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $inner = substr($value, 1, -1);

            return stripcslashes($inner);
        }

        return $value;
    }
}
