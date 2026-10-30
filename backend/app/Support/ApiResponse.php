<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class ApiResponse
{
    /**
     * @param  array<string, mixed>|null  $meta
     */
    public static function success(mixed $data = null, ?array $meta = null, int $status = 200): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'meta' => $meta ?? (object) [],
            'errors' => [],
        ], $status);
    }

    /**
     * @param  list<array{message: string, field?: string, code?: string}>  $errors
     */
    public static function fail(array $errors, int $status = 400, mixed $data = null): JsonResponse
    {
        return response()->json([
            'data' => $data,
            'meta' => (object) [],
            'errors' => $errors,
        ], $status);
    }

    public static function message(string $message, int $status = 400, ?string $code = null): JsonResponse
    {
        $error = ['message' => $message];
        if ($code !== null) {
            $error['code'] = $code;
        }

        return self::fail([$error], $status);
    }

    public static function validation(ValidationException $exception): JsonResponse
    {
        $errors = [];
        foreach ($exception->errors() as $field => $messages) {
            foreach ($messages as $message) {
                $errors[] = [
                    'field' => $field,
                    'message' => $message,
                ];
            }
        }

        return self::fail($errors, 422);
    }
}
