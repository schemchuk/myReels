# Кампанія: Instagram Reels "Пасічник у 58"

**Дата:** 2026-06-28  
**Платформа:** Instagram Reels  
**Аудиторія:** Job seekers (пошукачі роботи)  
**Hook:** "Мені 58. Я був пасічником. Тепер будую AI-стартап для пошуку роботи."  
**Статус:** Готово до запуску

## Ціль

Перетворити глядачів одного відео в лідів (WhatsApp / email) для раннього доступу до SofaSearch.

## Воронка

```
Instagram Reels (відео з аватаром)
  → CTA "Посилання в біо" + QR-код overlay (останні 3 секунди, автоматично)
  → Landing page: github.io/myReels/landing/?utm_...
  → WhatsApp (wa.me) або Google Form (email)
  → Ручний follow-up (3 повідомлення)
  → Ранній доступ / демо
```

## Landing page

- **URL:** `https://schemchuk.github.io/myReels/landing/?utm_source=instagram&utm_medium=reels&utm_campaign=pasichnik_58&utm_content=video_1`
- **Шаблон:** `landing/index.template.html`
- **Згенерована сторінка:** `landing/index.html`
- **Скрипт генерації:** `npm run build:landing`
- **QR-код:** `landing/qr-code.png`
- **Інструкція:** `landing/README.md`

## UTM-мітки

| Параметр | Значення |
|----------|----------|
| `utm_source` | `instagram` |
| `utm_medium` | `reels` |
| `utm_campaign` | `pasichnik_58` |
| `utm_content` | `video_1` |

## Автоматизація

### QR-код у відео

Задай в `.env`:

```env
REEL_QR_CODE_PATH=./landing/qr-code.png
```

Тоді `processVideo` автоматично додасть QR-код у верхній правий кут на останні 3 секунди.

### Генерація landing page

Значення беруться з `.env`:

```env
WHATSAPP_NUMBER=4916091425388
GOOGLE_FORM_ID=                 # опціонально
```

Запуск:

```bash
npm run build:landing
```

## Що потрібно зробити вручну перед запуском

1. **Задеплоїти на GitHub Pages** (3 кліки в налаштуваннях репозиторію).
2. **Поставити посилання в біо Instagram.**
3. **Переконатися, що в `.env` задано `REEL_QR_CODE_PATH`.**

Опціонально:
- Створити Google Form, додати `GOOGLE_FORM_ID` в `.env` і перегенерувати landing.
- Підключити GA4 до landing page.

## Follow-up

Шаблони повідомлень знаходяться у файлі `landing/follow-up.md`.

## Бюджет

$0. Використовуються тільки безкоштовні інструменти:
- GitHub Pages
- Google Forms (опціонально)
- WhatsApp (wa.me)
- QR-код згенеровано локально

## Показники для відстеження

- Кількість переглядів відео
- Кліків за UTM
- Заповнених Google Form
- Повідомлень у WhatsApp
- Конверсія в ранній доступ
