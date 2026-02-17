# 🌍 Гайд з міграції на багатомовність (i18n)

## ✅ Що вже готово:

1. ✅ Встановлено `next-intl`
2. ✅ Створено файли перекладів (PL + UK)
3. ✅ Налаштовано конфігурацію i18n
4. ✅ Створено middleware для локалей
5. ✅ Створено компонент Language Switcher
6. ✅ Підготовлено оновлений Sidebar з підтримкою i18n

## 📋 Покрокова міграція:

### Крок 1: Оновити структуру app

Потрібно перемістити всі сторінки в `app/[locale]/`:

```bash
# Поточна структура:
app/
  ├── dashboard/
  ├── drivers/
  ├── login/
  └── page.tsx

# Нова структура:
app/
  ├── [locale]/
  │   ├── dashboard/
  │   ├── drivers/
  │   ├── login/
  │   ├── layout.tsx (вже створено)
  │   └── page.tsx
  └── layout.tsx (кореневий)
```

### Крок 2: Оновити app/layout.tsx

```tsx
import { locales } from '@/i18n';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children; // Layout тепер в [locale]/layout.tsx
}
```

### Крок 3: Перемістити сторінки

```bash
cd frontend/app
mv dashboard [locale]/
mv drivers [locale]/
mv login [locale]/
mv page.tsx [locale]/
```

### Крок 4: Оновити компоненти на переклади

#### Приклад 1: Використання перекладів у компоненті

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('drivers'); // namespace з messages/pl.json

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('subtitle')}</p>
    </div>
  );
}
```

#### Приклад 2: Переклади з параметрами

```tsx
const t = useTranslations('drivers');

// В pl.json: "deleteConfirmMessage": "Czy na pewno chcesz usunąć kierowcę {name}?"
t('deleteConfirmMessage', { name: 'Jan Kowalski' })
```

### Крок 5: Оновити Sidebar

Замінити `components/layout/Sidebar/index.tsx` на вміст з `index-i18n.tsx`:

```bash
cp components/layout/Sidebar/index-i18n.tsx components/layout/Sidebar/index.tsx
```

### Крок 6: Оновити посилання

Всі внутрішні посилання повинні використовувати `Link` з next-intl:

```tsx
import { Link } from '@/navigation'; // Створити navigation.ts

// Або використовувати useRouter з next-intl:
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/dashboard'); // Автоматично додасть локаль
```

## 🔧 Створити navigation.ts

```typescript
// frontend/navigation.ts
import { createSharedPathnamesNavigation } from 'next-intl/navigation';
import { locales } from './i18n';

export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation({ locales });
```

## 📝 Оновлення ключових файлів:

### 1. DriverForm.tsx

Замінити всі жорстко закодовані тексти на:

```tsx
const t = useTranslations('driverForm');

// Label
<label>{t('firstName')} <span>*</span></label>

// Placeholder
<input placeholder={t('placeholders.firstName')} />

// Error
{errors.first_name && <p>{t('errors.firstNameRequired')}</p>}

// Button
<button>{isLoading ? t('saving') : (initialData ? t('updateDriver') : t('addDriver'))}</button>
```

### 2. Drivers Page

```tsx
const t = useTranslations('drivers');
const tCommon = useTranslations('common');

<h1>{t('title')}</h1>
<p>{t('subtitle')}</p>
<button>{t('addDriver')}</button>
```

### 3. DriverTable.tsx

```tsx
const t = useTranslations('drivers');

<th>{t('firstName')}</th>
<th>{t('lastName')}</th>
<th>{t('phoneNumber')}</th>
<th>{t('hasVehicle')}</th>
<th>{t('isActive')}</th>
```

### 4. Dashboard

```tsx
const t = useTranslations('dashboard');

<h1>{t('title')}</h1>
<p>{t('welcome')}, {user?.email}</p>
```

### 5. Login Page

```tsx
const t = useTranslations('auth');

<button>{t('login')}</button>
<input placeholder={t('email')} />
<input placeholder={t('password')} />
```

## 🎯 Швидкий старт (Мінімальна міграція):

Якщо потрібно швидко запустити:

1. **Тимчасове рішення**: Додати `locale` параметр до поточних роутів без переміщення файлів:
   - Оновити `middleware.ts` щоб не перенаправляти
   - Додати переклади тільки до ключових компонентів

2. **Повна міграція** (рекомендовано):
   - Виділіть 1-2 години
   - Перемістіть файли покроково
   - Тестуйте кожен крок

## 🔄 Автоматична міграція тексту

Пошук всіх жорстко закодованих текстів:

```bash
# Знайти всі українські тексти
grep -r "Водії\|Додати\|Видалити" components/ app/

# Знайти всі польські тексти
grep -r "Kierowcy\|Dodaj\|Usuń" components/ app/
```

## 🧪 Тестування:

1. Запустити dev сервер: `npm run dev`
2. Перевірити URL: `http://localhost:3000` (PL - default)
3. Перевірити URL: `http://localhost:3000/uk` (українська)
4. Перемикати мови через Language Switcher

## 📚 Додаткові ресурси:

- [next-intl документація](https://next-intl-docs.vercel.app/)
- Файли перекладів: `messages/pl.json`, `messages/uk.json`
- Приклад компоненту: `components/layout/Sidebar/index-i18n.tsx`

## ❓ Troubleshooting:

**Помилка: "locale" is not defined**
- Перевірте чи правильно налаштовано `[locale]` folder structure

**Переклади не працюють**
- Перевірте чи імпортуєте `useTranslations` з 'next-intl'
- Перевірте namespace в `t()` відповідає ключу в JSON

**404 на всіх сторінках**
- Перевірте middleware.ts
- Перевірте чи файли в правильній папці `[locale]`
