# 🌍 Статус багатомовності (i18n)

## ✅ Що вже працює:

### Інфраструктура:
- ✅ Next-intl налаштовано (Next.js 15)
- ✅ Переклади створено (`messages/pl.json`, `messages/uk.json`)
- ✅ Middleware працює
- ✅ Роутинг працює (`/` = PL, `/uk` = UK)

### Компоненти з перекладами:
- ✅ **Sidebar** - всі пункти меню перекладені
  - Dashboard, Flota, Kierowcy тощо (PL)
  - Панель, Автопарк, Водії тощо (UK)
- ✅ **LanguageSwitcher** - перемикач мов у Sidebar (🇵🇱 / 🇺🇦)

---

## 🔄 Що ще потрібно оновити:

### Пріоритет 1 (Найважливіше):

#### 1. Drivers Page (`app/[locale]/drivers/page.tsx`)
```tsx
// Додати на початку:
const t = useTranslations('drivers');

// Замінити:
"Водії" → {t('title')}
"Управління водіями..." → {t('subtitle')}
"Додати водія" → {t('addDriver')}
```

#### 2. DriverForm (`components/driver/DriverForm.tsx`)
```tsx
// Додати:
const t = useTranslations('driverForm');

// Замінити:
"Ім'я" → {t('firstName')}
"Прізвище" → {t('lastName')}
"Номер телефону" → {t('phoneNumber')}
"Введіть ім'я водія" → {t('placeholders.firstName')}
```

#### 3. DriverTable (`components/driver/DriverTable.tsx`)
```tsx
const t = useTranslations('drivers');

// Заголовки таблиці
"Водій" → {t('firstName')}
"Телефон" → {t('phoneNumber')}
"Авто" → {t('hasVehicle')}
"Статус" → {t('isActive')}
```

#### 4. ConfirmDialog (`components/common/ConfirmDialog.tsx`)
```tsx
const t = useTranslations('common');

// Кнопки
"Підтвердити" → {t('confirm')}
"Скасувати" → {t('cancel')}
```

### Пріоритет 2:

- Login Page (`app/[locale]/login/page.tsx`)
- Dashboard (`app/[locale]/dashboard/page.tsx`)

---

## 📝 Швидка шпаргалка:

### Використання перекладів:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('namespace'); // drivers, driverForm, common

  return <h1>{t('title')}</h1>
}
```

### Переклади з параметрами:

```tsx
// В pl.json: "greeting": "Cześć, {name}!"
// В uk.json: "greeting": "Привіт, {name}!"

{t('greeting', { name: 'Jan' })}
// PL: "Cześć, Jan!"
// UK: "Привіт, Jan!"
```

---

## 🧪 Тестування:

1. Відкрити: `http://localhost:3000`
2. Подивитись на Sidebar - має бути PL (Kierowcy, Panel główny)
3. Натиснути на 🇺🇦 - має переключити на UK
4. URL змінится на `/uk`, Sidebar на українську (Водії, Панель)

---

## 🎯 Швидкий початок:

Відкрийте `app/[locale]/drivers/page.tsx` та додайте:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function DriversPage() {
  const t = useTranslations('drivers');
  // ... решта коду

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
      <button>{t('addDriver')}</button>
      {/* ... */}
    </div>
  );
}
```

Всі переклади вже є в `messages/pl.json` і `messages/uk.json`!
