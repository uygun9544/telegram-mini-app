# Telegram Mini App: training + online

В проекте есть 2 режима в одной и той же игре:

- `Тренировка` (верхняя кнопка) — мгновенный старт против бота.
- `Играть` (нижняя кнопка) — поиск реального игрока онлайн.

## Локальный запуск фронта

```bash
npm install
npm run dev
```

## Локальный запуск online-сервера

```bash
cd server
npm install
npm start
```

По умолчанию сервер стартует на `ws://localhost:8787`.

## Кнопка "Играть" в сообщении бота

В проект добавлен минимальный Telegram-бот (`server/bot.js`), который отправляет кнопку Web App в сообщении (`/start` и `/play`).

### Настройка

1. В `server` создай `.env` по примеру `server/.env.example`.
2. Укажи:
	- `BOT_TOKEN` — токен бота из BotFather
	- `MINI_APP_URL` — публичный `https` URL твоей мини-аппы

### Запуск

```bash
cd server
npm install
npm run start:bot
```

После этого при `/start` бот отправит сообщение с кнопкой `Играть`, которая откроет Mini App.

Проверка здоровья сервера:

- `http://localhost:8787/health`

## Где хранятся звёзды и данные

В этом проекте сейчас нет отдельной SQL/NoSQL базы. Данные сохраняются в JSON-файлах на сервере:

- `balances.json` — баланс звёзд игроков
- `training-config.json` — настройки бота тренировки

Путь к этим файлам задаётся так:

1. Если задан `DATA_DIR`, используются файлы в этой папке.
2. Иначе, если задан `RENDER_DISK_PATH`, используется `RENDER_DISK_PATH/telegram-mini-app-data`.
3. Иначе (локально) используется `server/data`.

Для Render обязательно используй persistent disk, иначе после пересоздания инстанса данные могут обнулиться.

## Миграция на Neon Postgres (без боли)

Сервер уже поддерживает `DATABASE_URL` с автоматическим fallback на JSON.

### 1) Создай БД в Neon

- Зарегистрируйся в Neon
- Создай Project
- Скопируй `connection string` (это и есть `DATABASE_URL`)

### 2) Добавь `DATABASE_URL` в Render

В backend-сервисе Render:

- `Environment` → `Add Environment Variable`
- Key: `DATABASE_URL`
- Value: строка подключения из Neon

Сохрани и сделай redeploy.

### 3) Проверь, что сервер переключился на Postgres

Открой:

- `/health`

Там должно быть:

- `"storageMode": "postgres"`

Если `storageMode` = `json`, сервер автоматически работает по старой схеме и ничего не ломается.

### 4) Таблица игроков

Сервер автоматически создаёт таблицу `player_stats` и пишет туда:

- `player_id`
- `name`
- `balance`
- `wins`
- `losses`

Лидерборд отдаётся через:

- `GET /leaderboard`
- `GET /leaderboard?limit=20`

### Render: как сохранить звёзды навсегда

1. Открой сервис в Render.
2. Вкладка `Disks` → `Add Disk`.
3. Mount path поставь, например, `/var/data`.
4. Вкладка `Environment`:
	- `DATA_DIR=/var/data/telegram-mini-app-data`
5. Сохрани и сделай redeploy.

После этого звёзды будут храниться на диске Render и не сбрасываться при рестарте сервиса.

## Динамическая настройка бота тренировки (без перезаливки фронта)

Теперь значения бота тренировки можно менять удалённо через сервер:

- `GET /training-config` — получить текущие значения
- `POST /training-config` — обновить значения

Поддерживаемые поля:

- `reactionMinMs`
- `reactionMaxMs`
- `missChance` (0..1)

Для `POST` обязательно задай env-переменную на Render:

```bash
TRAINING_CONFIG_ADMIN_TOKEN=your_secret_token
```

Пример обновления (без деплоя фронта):

```bash
curl -X POST https://your-render-domain/training-config \
	-H "Content-Type: application/json" \
	-H "X-Admin-Token: your_secret_token" \
	-d '{"reactionMinMs":500,"reactionMaxMs":2300,"missChance":0.25}'
```

Фронтенд подхватывает эти значения автоматически (периодический рефреш).

## Настройка URL сервера для фронта

Создай `.env` в корне фронта:

```bash
VITE_MATCH_WS_URL=ws://localhost:8787
```

Для теста с другом с разных устройств укажи публичный URL твоего сервера, например:

```bash
VITE_MATCH_WS_URL=wss://your-domain.com
```

На главном экране приложения есть debug-подпись `WS: ...` — на обоих устройствах она должна показывать один и тот же адрес.

## Что уже поддержано в MVP

- очередь игроков;
- матч на 2 игроков;
- модалка подтверждения (`Принять игру` / `✕`);
- отмена поиска и отмена найденного матча;
- обмен результатом раунда между 2 игроками.

## Тапки игроков

- Тапок назначается игроку случайно при первом входе и сохраняется локально по `playerId`.
- Добавляй новые тапки в папку `src/assets/slippers` (png/jpg/webp/svg), они автоматически попадут в рандомный пул.
- Базовые тапки `default` и `default enemy` тоже остаются в пуле.
"# telegram-mini-app" 
