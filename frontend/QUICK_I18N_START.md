# 🚀 Швидкий старт i18n (15 хвилин)

## ✅ Що вже зроблено:

1. ✅ Встановлено `next-intl`
2. ✅ Створено переклади PL/UK в `messages/`
3. ✅ Налаштовано конфігурацію (`i18n.ts`, `middleware.ts`, `navigation.ts`)
4. ✅ Створено Language Switcher компонент
5. ✅ Підготовлено приклади оновлених компонентів

## 🎯 Наступні кроки (ОБОВ'ЯЗКОВО):

### Крок 1: Перемістити файли (5 хв)

```bash
cd frontend/app

# Створити структуру [locale] якщо ще не створено
mkdir -p "[locale]"

# Перемістити існуючі сторінки
mv dashboard "[locale]/"
mv drivers "[locale]/"
mv login "[locale]/"
mv page.tsx "[locale]/"
```

### Крок 2: Оновити app/layout.tsx (2 хв)

Відкрити `app/layout.tsx` і **замінити весь вміст** на:

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
  return children;
}
```

### Крок 3: Оновити Sidebar з перекладами (1 хв)

```bash
cd frontend/components/layout/Sidebar

# Бекап старого файлу
cp index.tsx index.tsx.backup

# Використати новий з перекладами
cp index-i18n.tsx index.tsx
```

### Крок 4: Перезапустити dev сервер (1 хв)

```bash
# Ctrl+C щоб зупинити поточний сервер
cd frontend
npm run dev
```

### Крок 5: Тестування (2 хв)

Відкрити браузер:
- **Польська (default)**: http://localhost:3000
- **Українська**: http://localhost:3000/uk

Перемикати мови через Language Switcher в Sidebar! 🇵🇱 🇺🇦

---

## 🎨 Оновлення компонентів (поступово)

### Пріоритет 1: Drivers Page (найважливіше)

Відкрити `app/[locale]/drivers/page.tsx` та на початку додати:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export default function DriversPage() {
  const t = useTranslations('drivers');
  const tCommon = useTranslations('common');

  // ... решта коду

  // Замінити тексти:
  // "Водії" -> {t('title')}
  // "Управління водіями вашого автопарку" -> {t('subtitle')}
  // "Додати водія" -> {t('addDriver')}
}
```

### Пріоритет 2: DriverForm (форма)

Відкрити `components/driver/DriverForm.tsx`:

```tsx
'use client';
import { useTranslations } from 'next-intl';

export function DriverForm({ onSubmit, onCancel, initialData, isLoading = false }: DriverFormProps) {
  const t = useTranslations('driverForm');

  // Замінити тексти:
  // "Ім'я" -> {t('firstName')}
  // "Прізвище" -> {t('lastName')}
  // "Номер телефону" -> {t('phoneNumber')}
  // "Введіть ім'я водія" -> {t('placeholders.firstName')}
  // "Додати водія" -> {t('addDriver')}
  // "Оновити водія" -> {t('updateDriver')}
}
```

### Пріоритет 3: DriverTable

Аналогічно додати переклади для таблиці.

---

## 📝 Шпаргалка по використанню:

```tsx
// Імпорт
import { useTranslations } from 'next-intl';

// В компоненті
const t = useTranslations('namespace'); // drivers, driverForm, common, etc.

// Використання
{t('key')}                          // Простий переклад
{t('key', { name: 'John' })}       // З параметрами
{t('nested.key')}                   // Вкладені ключі
```

---

## 🆘 Якщо щось не працює:

1. **404 на всіх сторінках**
   - Перевірте чи файли в `app/[locale]/`
   - Перезапустіть dev сервер

2. **"useTranslations is not a function"**
   - Додайте `'use client'` на початку компонента

3. **Мови не перемикаються**
   - Очистіть кеш браузера (Ctrl+Shift+R)
   - Перевірте чи Sidebar оновлено на `index-i18n.tsx`

---

## 📖 Повна документація:

Детальний гайд: `I18N_MIGRATION_GUIDE.md`

Файли перекладів:
- 🇵🇱 `messages/pl.json`
- 🇺🇦 `messages/uk.json`

---

**Почніть з Кроків 1-5, решту можна робити поступово!** 🚀
