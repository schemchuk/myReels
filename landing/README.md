# Landing page для Instagram Reels: "Пасічник у 58"

Безкоштовна воронка для одного відео. Ніяких підписок і платних сервісів.

## Файли

- `index.html` — landing page
- `qr-code.png` — QR-код для відео (веде на landing з UTM-мітками)
- `follow-up.md` — шаблони follow-up повідомлень

## URL landing page

```
https://schemchuk.github.io/myReels/landing/?utm_source=instagram&utm_medium=reels&utm_campaign=pasichnik_58&utm_content=video_1
```

## Як задеплоїти на GitHub Pages (безкоштовно)

1. Відкрий налаштування репозиторію `myReels` на GitHub.
2. Перейди в **Settings → Pages**.
3. У розділі **Build and deployment** вибери **Deploy from a branch**.
4. Вибери гілку `main` і папку **/(root)**.
5. Натисни **Save**.
6. Через 1-2 хвилини сайт буде доступний за URL:
   `https://schemchuk.github.io/myReels/landing/`

## Що замінити в landing page

У `index.html` знайди два placeholder'и і заміни на свої:

1. **Посилання на Google Form** (для capture email):
   ```html
   href="https://docs.google.com/forms/d/e/ВАШ_ІДЕНТИФІКАТОР_ФОРМИ/viewform?usp=pp_url"
   ```

2. **WhatsApp номер**:
   ```html
   href="https://wa.me/ВАШ_НОМЕР_В_ФОРМАТІ_380XXXXXXXXX?text=..."
   ```
   Формат: міжнародний без `+` і пробілів, наприклад `380501234567`.

## Як створити Google Form для capture

1. Перейди на https://forms.new
2. Додай поля:
   - **Email** (required) — тип Email
   - **WhatsApp номер** (optional) — тип Short answer
   - **Що для вас найскладніше в пошуку роботи?** (optional) — тип Paragraph
3. Натисни **Send → Link → Shorten URL**.
4. Скопіюй URL і встав у `index.html` замість placeholder'а.
5. У налаштуваннях форми увімкни **Collect email addresses** і **Create a spreadsheet** для збору відповідей.

## Як використовувати в Instagram Reels

1. У біо Instagram встав посилання:
   ```
   https://schemchuk.github.io/myReels/landing/?utm_source=instagram&utm_medium=reels&utm_campaign=pasichnik_58&utm_content=video_1
   ```
2. У відео CTA кажи: "Посилання в біо".
3. Додай QR-код `qr-code.png` поверх відео на 2-3 секунди в кінці — це збільшить кількість переходів, бо в Instagram посилання в відео не клікабельне.

## Що відстежувати

- Переходи за UTM в Google Analytics (якщо підключиш GA4 до landing page).
- Заповнення Google Form.
- Повідомлення в WhatsApp.

## Пам'ятай

- Цей landing — під **одне відео** та **одну кампанію**.
- Для наступного відео краще зробити окремий landing або змінити UTM `utm_content=video_2`.
