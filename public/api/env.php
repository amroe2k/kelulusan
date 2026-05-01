<?php
/**
 * env.php — Parser .env sederhana untuk PHP
 * ──────────────────────────────────────────
 * Dibaca oleh db.php. Tidak perlu library tambahan.
 * Mendukung:
 *   - KEY=value
 *   - KEY="value dengan spasi"
 *   - # komentar
 *   - Baris kosong
 */

function loadEnv(string $envPath): void {
    if (!file_exists($envPath)) return;

    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);

        // Lewati komentar dan baris kosong
        if ($line === '' || str_starts_with($line, '#')) continue;

        // Pisahkan key=value (hanya pada = pertama)
        $eqPos = strpos($line, '=');
        if ($eqPos === false) continue;

        $key   = trim(substr($line, 0, $eqPos));
        $value = trim(substr($line, $eqPos + 1));

        // Hapus tanda kutip mengapit (single atau double)
        if (
            (str_starts_with($value, '"') && str_ends_with($value, '"')) ||
            (str_starts_with($value, "'") && str_ends_with($value, "'"))
        ) {
            $value = substr($value, 1, -1);
        }

        // Set ke $_ENV dan putenv agar bisa diakses di mana saja
        if (!array_key_exists($key, $_ENV)) {
            $_ENV[$key]   = $value;
            putenv("{$key}={$value}");
        }
    }
}

/**
 * env() — Helper untuk mengambil nilai .env dengan fallback
 * Contoh: env('DB_HOST', 'localhost')
 */
function env(string $key, mixed $default = null): mixed {
    $val = $_ENV[$key] ?? getenv($key);
    if ($val === false || $val === '') return $default;
    // Konversi string boolean
    return match (strtolower((string) $val)) {
        'true', '1', 'yes' => true,
        'false', '0', 'no' => false,
        default            => $val,
    };
}
