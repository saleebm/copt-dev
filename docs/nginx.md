# NGINX Config

## SSL

On Ubuntu, you can run `sudo apt install certbot python3-certbot-nginx` to get certbot for nginx. Then, run `sudo certbot --nginx -d yourdomain.tld -d www.yourdomain.tld` to generate the certificates.

## Core config

```nginx
user www-data;
pid /run/nginx.pid;
worker_processes auto;
worker_rlimit_nofile 65535;

# Load modules
include /etc/nginx/modules-enabled/*.conf;

events {
    multi_accept on;
    worker_connections 65535;
}

http {
    charset utf-8;
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    server_tokens off;
    log_not_found off;
    types_hash_max_size 4096;
    types_hash_bucket_size 256;
    client_max_body_size 64M;

    # MIME
    include mime.types;
    default_type application/octet-stream;

    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log warn;

    # Limits
    # for my wordpress domains
    limit_req_log_level warn;
    limit_req_zone $binary_remote_addr zone=login:10m rate=10r/m;

    # SSL
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # Mozilla Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 1.0.0.1 [2606:4700:4700::1111] [2606:4700:4700::1001] 8.8.8.8 8.8.4.4 [2001:4860:4860::8888] [2001:4860:4860::8844] 208.67.222.222 208.67.220.220 [2620:119:35::35] [2620:119:53::53] 9.9.9.9 149.112.112.112 [2620:fe::fe] [2620:fe::9] valid=60s;
    resolver_timeout 2s;

    # Load configs
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

## Site config

```nginx
upstream copt {
    server 127.0.0.1:3000;
    keepalive 64;
}

proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=STATIC:10m inactive=7d use_temp_path=off;

map $http_origin $cors_header {
    default "";
    "~^https?://[^/]+\.copt\.dev(:[0-9]+)?$" "$http_origin";
}

# Connection header for WebSocket reverse proxy
map $http_upgrade $connection_upgrade {
    default upgrade;
    "" close;
}

map $sent_http_content_type $expires {
    default off;
    text/html epoch;
    text/css 30d;
    application/javascript 30d;
    application/json 30d;
    ~image/ max;
    font/woff2 max;
    font/woff max;
    font/ttf max;
    image/x-icon max;
    application/font-woff2 max;
}

server {
    listen [::]:443 http2 ssl; # managed by Certbot
    listen 443 http2 ssl; # managed by Certbot
    server_name copt.dev www.copt.dev;

    http2_idle_timeout 5m;
    http2_push_preload on;

    ssl_certificate /etc/letsencrypt/live/copt.dev/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/copt.dev/privkey.pem; # managed by Certbot
    ssl_trusted_certificate /etc/letsencrypt/live/copt.dev/chain.pem; # need this for ssl_stapling
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location = /favicon.ico {
        log_not_found off;
    }

    location /_next/static {
        proxy_cache STATIC;
        proxy_pass http://copt;
        include snippets/proxy.conf;
    }

    location /static {
        proxy_cache STATIC;
        proxy_ignore_headers Cache-Control;
        proxy_cache_valid 60m;
        proxy_pass http://copt;
        gzip_static on;
        include snippets/proxy.conf;
    }
    location / {
        proxy_pass http://copt;
        include snippets/proxy.conf;
    }

    add_header Access-Control-Allow-Origin $cors_header;
    add_header Access-Control-Allow-Credentials 'true';
    add_header "Access-Control-Allow-Methods" "GET, POST, OPTIONS, HEAD" always;

    ## expires map
    expires $expires;

    ## additional config
    include snippets/security.conf;
}

server {
    listen 80;
    listen [::]:80;
    server_name copt.dev www.copt.dev;

    return 301 https://$host$request_uri;
}
```

## Snippets

`snippets/proxy.conf`

```nginx
proxy_http_version                 1.1;
proxy_cache_bypass                 $http_upgrade;

# Proxy headers
proxy_set_header Upgrade           $http_upgrade;
proxy_set_header Connection        $connection_upgrade;
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host  $host;
proxy_set_header X-Forwarded-Port  $server_port;

# Proxy timeouts
proxy_connect_timeout              60s;
proxy_send_timeout                 60s;
proxy_read_timeout                 60s;
```

`snippets/security.conf`

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;

add_header Expect-CT "enforce, max-age=1200, report-uri='https://copt.dev'";
add_header Last-Modified $date_gmt;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
# . files
location ~ /\.(?!well-known) {
        deny all;
}
location ~* ^/.*\.(?:log)$ {
        deny all;
}
```
