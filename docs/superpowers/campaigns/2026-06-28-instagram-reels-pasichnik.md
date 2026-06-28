# Кампанія: Instagram Reels "Пасічник у 58"

**Дата:** 2026-06-28  
**Платформа:** Instagram Reels  
**Аудиторія:** Job seekers (пошукачі роботи)  
**Hook:** "Мені 58. Я був пасічником. Тепер будую AI-стартап для пошуку роботи."  
**Статус:** Готово до запуску

## Ціль

Перетворити глядачів одного відео в лідів (email / WhatsApp) для раннього доступу до SofaSearch.

## Воронка

```
Instagram Reels (відео з аватаром)
  → CTA "Посилання в біо" + QR-код на екрані
  → Landing page: github.io/myReels/landing/?utm_...
  → Google Form (email) або WhatsApp (wa.me)
  → Ручний follow-up (3 повідомлення)
  → Ранній доступ / демо
```

## Landing page

- **URL:** `https://schemchuk.github.io/myReels/landing/?utm_source=instagram&utm_medium=reels&utm_campaign=pasichnik_58&utm_content=video_1`
- **Файл:** `landing/index.html`
- **QR-код:** `landing/qr-code.png`
- **Інструкція:** `landing/README.md`

## UTM-мітки

| Параметр | Значення |
|----------|----------|
| `utm_source` | `instagram` |
| `utm_medium` | `reels` |
| `utm_campaign` | `pasichnik_58` |
| `utm_content` | `video_1` |

## Що потрібно зробити вручну перед запуском

1. **Замінити Google Form URL** у `landing/index.html`.
2. **Замінити WhatsApp номер** у `landing/index.html`.
3. **Задеплоїти** landing page на GitHub Pages (див. `landing/README.md`).
4. **Поставити посилання в біо Instagram:**
   ```
   https://schemchuk.github.io/myReels/landing/?utm_source=instagram&utm_medium=reels&utm_campaign=pasichnik_58&utm_content=video_1
   ```
5. **Додати QR-код** у кінець відео на 2-3 секунди.
6. **Налаштувати Google Form** на збір відповідей у Google Sheets.

## Follow-up

Шаблони повідомлень знаходяться у файлі `landing/follow-up.md`.

## Бюджет

$0. Використовуються тільки безкоштовні інструменти:
- GitHub Pages
- Google Forms
- WhatsApp (wa.me)
- QR-код згенеровано локально

## Показники для відстеження

- Кількість переглядів відео
- Кліків за UTM (Google Analytics або Google Sheets)
- Заповнених Google Form
- Повідомлень у WhatsApp
- Конверсія в ранній доступ
