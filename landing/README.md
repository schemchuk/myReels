# Landing page для Instagram Reels: "Пасічник у 58"

Безкоштовна воронка для одного відео. Ніяких підписок і платних сервісів.

## Файли

- `index.template.html` — шаблон landing page
- `index.html` — згенерована сторінка (комітиться в git, щоб GitHub Pages її бачив)
- `qr-code.png` — QR-код для відео
- `follow-up.md` — шаблони follow-up повідомлень
- `../scripts/build-landing.js` — скрипт генерації `index.html` з `.env`

## URL landing page

```
https://schemchuk.github.io/myReels/landing/?utm_source=instagram&utm_medium=reels&utm_campaign=pasichnik_58&utm_content=video_1
```

## Як згенерувати landing page

Значення беруться з `.env`:

```env
WHATSAPP_NUMBER=4916091425388
GOOGLE_FORM_ID=                 # опціонально
```

Запусти:

```bash
npm run build:landing
```

Скрипт підставить WhatsApp номер і, якщо задано, Google Form ID. Якщо `GOOGLE_FORM_ID` порожній — на сторінці буде тільки кнопка WhatsApp.

## Як задеплоїти на GitHub Pages (безкоштовно)

1. Відкрий налаштування репозиторію `myReels` на GitHub.
2. Перейди в **Settings → Pages**.
3. У розділі **Build and deployment** вибери **Deploy from a branch**.
4. Вибери гілку `main` і папку **/(root)**.
5. Натисни **Save**.
6. Через 1-2 хвилини сайт буде доступний за URL:
   `https://schemchuk.github.io/myReels/landing/`

## QR-код в відео

QR-код додається автоматично в останні 3 секунди кожного відео, якщо в `.env` задано:

```env
REEL_QR_CODE_PATH=./landing/qr-code.png
```

Позиція QR: верхній правий кут, 120×120 px.

## Як створити Google Form (опціонально)

1. Перейди на https://forms.new
2. Додай поля:
   - **Email** (required) — тип Email
   - **WhatsApp номер** (optional) — тип Short answer
   - **Що для вас найскладніше в пошуку роботи?** (optional) — тип Paragraph
3. Натисни **Send → Link → Shorten URL**.
4. Скопіюй ID форми з URL (частина після `/d/e/` і до `/viewform`).
5. Додай ID в `.env`:
   ```env
   GOOGLE_FORM_ID=1FAIpQLSf...
   ```
6. Запусти `npm run build:landing` і закоміть змінений `landing/index.html`.

## Як використовувати в Instagram Reels

1. У біо Instagram встав посилання:
   ```
   https://schemchuk.github.io/myReels/landing/?utm_source=instagram&utm_medium=reels&utm_campaign=pasichnik_58&utm_content=video_1
   ```
2. У відео CTA кажи: "Посилання в біо".
3. QR-код вже вшито в кінці відео автоматично — додатково вставляти його в редакторі не треба.

## Що відстежувати

- Переходи за UTM в Google Analytics (якщо підключиш GA4 до landing page).
- Заповнення Google Form.
- Повідомлення в WhatsApp.
- Конверсія в ранній доступ.
