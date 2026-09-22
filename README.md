# Chat Messenger

Простой чат в реальном времени: пользователь вводит имя, попадает в общую комнату
`#general`, видит историю и общается с другими подключёнными пользователями.

## Стек

- **Backend:** Node.js, Express (REST) + Socket.IO (WebSocket), PostgreSQL
- **Redis:** адаптер Socket.IO (pub/sub) — нужен для масштабирования на несколько реплик
- **Frontend:** чистые HTML/CSS/JS, раздаётся nginx
- **Контейнеризация:** Podman / Docker Compose

## Состав сервисов

| Сервис   | Порт снаружи | Зависит от | Том   |
|----------|--------------|------------|-------|
| frontend | `7890`       | backend    | —     |
| backend  | `4000`       | Postgres (healthy) | — |
| Postgres | —            | —          | `posgres_data` |
| Redis    | —            | —          | `rediska` |
| pgAdmin  | `5679`       | Postgres   | `pgadmin` |

## Быстрый старт

```bash
cp .env.example .env     # заполни значения, если нужно
podman-compose up -d     # или docker-compose up -d
```

Затем:

- **Чат:** http://localhost:7890
- **Backend API и WebSocket:** http://localhost:4000 (health — `GET /health`)
- **pgAdmin:** http://localhost:5679

## Как работает

- Браузер ходит на backend **напрямую** (порт 4000) — и по REST, и по WebSocket,
  поэтому backend должен быть проброшен наружу, его мало быть в общей docker-сети.
- История сообщений хранится в PostgreSQL (таблица создаётся кодом при первом старте).
- Redis обеспечивает pub/sub между репликами Socket.IO (актуально при `--scale backend=2`).

## Известные ловушки / TODO

1. **Healthcheck Postgres** (`docker-compose.yml`) исправлен на `-d ${POSTGRES_DB}` —
   ранее использовался `-d ${POSTGRES_PASSWORD}`, что невалидно (`-d` ждёт имя БД).

2. **Redis без healthcheck**: backend пока не зависит от готовности Redis по
   `condition: service_healthy` — при scale-запуске добавь healthcheck и зависимость.

3. Пустые `.dockerignore`/`.gitignore` в некоторых копиях — следи, чтобы `.env` и
   `node_modules` не утекали в образ/репозиторий.

4. `nginx.conf` в `frontend` проксирует `/api` на `http://localhost:4000` —
   внутри docker-сети backend доступен как `back:4000`, а не `localhost`. Проверь
   при использовании reverse-proxy.

## Задания для дальнейшей практики

- Reverse proxy: единый вход через nginx (одна ссылка снаружи, без двух портов)
- `podman-compose up -d --scale backend=2` + проверка, что сообщения долетают всем
  через redis-adapter
- Healthcheck и `restart: unless-stopped` для всех сервисов

Подробное техническое задание — в [`PROJECT.md`](./PROJECT.md).
