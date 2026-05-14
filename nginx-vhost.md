server {
  listen 80;
  listen [::]:80;
  listen 443 quic;
  listen 443 ssl;
  listen [::]:443 quic;
  listen [::]:443 ssl;
  http2 on;
  http3 off;
  {{ssl_certificate_key}}
  {{ssl_certificate}}
  server_name kelulusan.disdiktanjungbalai.id;
  {{root}}
  index index.html index.php;

  {{nginx_access_log}}
  {{nginx_error_log}}

  if ($scheme != "https") {
    rewrite ^ https://$host$request_uri permanent;
  }

  location ~ /.well-known {
    auth_basic off;
    allow all;
  }
  location ~ \.php$ {
    proxy_pass http://127.0.0.1:8080;
    
    # [PERBAIKAN]: Teruskan header agar Nginx di port 8080 tahu ini untuk domain kelulusan
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  {{settings}}

  location / {
    {{varnish_proxy_pass}}
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_hide_header X-Varnish;
    proxy_redirect off;
    proxy_max_temp_file_size 0;
    proxy_connect_timeout      720;
    proxy_send_timeout         720;
    proxy_read_timeout         720;
    proxy_buffer_size          128k;
    proxy_buffers              4 256k;
    proxy_busy_buffers_size    256k;
    proxy_temp_file_write_size 256k;
  }

  location ~* ^.+\.(css|js|jpg|jpeg|gif|png|ico|gz|svg|svgz|ttf|otf|woff|woff2|eot|mp4|ogg|ogv|webm|webp|zip|swf|map|mjs)$ {
    add_header Access-Control-Allow-Origin "*";
    add_header alt-svc 'h3=":443"; ma=86400';
    add_header Cache-Control "public, immutable";
    expires max;
    access_log off;
  }

  location ~ /\.(ht|svn|git) {
    deny all;
  }

  if (-f $request_filename) {
    break;
  }
}

server {
  listen 8080;
  listen [::]:8080;
  server_name kelulusan.disdiktanjungbalai.id;
  {{root}}
  
  include /etc/nginx/global_settings;

  # --- [PERBAIKAN KELULUSAN APPS] ---
  
  # Log Kustom Kelulusan (Opsional, akan berjalan beriringan dengan log bawaan panel)
  access_log /var/log/nginx/kelulusan-access.log;
  error_log  /var/log/nginx/kelulusan-error.log;

  # Mencegah redirect Nginx mengarah ke IP dengan port :8080
  absolute_redirect off;
  port_in_redirect off;

  index index.html index.php;

  # Aturan Khusus: data.json jangan di-cache (agar update realtime)
  location = /data.json {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    expires 0;
  }

  # SPA Fallback ke index.html
  location / {
    try_files $uri $uri/ /index.html?$args;
  }

  # Blokir akses untuk melindungi kredensial .env
  location ~ /\.env {
    deny all;
    return 404;
  }

  # ----------------------------------------

  # Semua PHP API (termasuk /api/*.php dan /admin-upload.php) akan tertangkap otomatis di sini!
  # KITA MENGGUNAKAN KONFIGURASI BAWAAN VPS (127.0.0.1:{{php_fpm_port}}) AGAR TIDAK ERROR 502
  location ~ \.php$ {
    include fastcgi_params;
    fastcgi_intercept_errors on;
    fastcgi_index index.php;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    try_files $uri =404;
    fastcgi_read_timeout 3600;
    fastcgi_send_timeout 3600;
    fastcgi_param HTTPS "on";
    fastcgi_param SERVER_PORT 443;
    fastcgi_pass 127.0.0.1:{{php_fpm_port}};
    fastcgi_param PHP_VALUE "{{php_settings}}";
  }

  if (-f $request_filename) {
    break;
  }
}
