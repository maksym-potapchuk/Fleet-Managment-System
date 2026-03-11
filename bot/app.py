import asyncio
import logging
from typing import Optional

from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BufferedInputFile, CallbackQuery, Contact, Message, ReplyKeyboardRemove

from bot.constants import BOT_TOKEN, SERVICE_TYPES
from bot.functions import (
    activate_driver_for_telegram,
    get_driver_by_telegram_id,
    get_regulation_plan_for_vehicle,
    get_vehicles_for_driver,
    get_vehicle_current_km,
)
from bot.keyboards import (
    MAIN_MENU_BUTTON,
    get_faq_keyboard,
    get_finish_photos_keyboard,
    get_main_menu_keyboard,
    get_mileage_unit_keyboard,
    get_regulation_pdf_keyboard,
    get_service_types_keyboard,
    get_share_phone_keyboard,
    get_vehicles_keyboard,
)
from bot.pdf_regulation import build_regulation_pdf
from bot.states import MileageReportStates, RegulationStates, ServiceReportStates


router = Router()


def _normalize_phone_number(raw_phone: str) -> str:
    phone = raw_phone.strip().replace(" ", "").replace("-", "")
    return phone


def _escape_html(text: str) -> str:
    """Escape &, <, > for Telegram HTML parse_mode."""
    if not text:
        return ""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


CAR_NUM_PREFIX = "🚗 "


@router.message(F.text == MAIN_MENU_BUTTON)
async def back_to_main_menu(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer(
        "Головне меню 👇",
        reply_markup=get_main_menu_keyboard(),
    )


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    await state.clear()
    if not message.from_user:
        return

    # Якщо водія з таким telegram_id вже є — телефон не просимо (лише один раз при першому /start)
    driver_any = await asyncio.to_thread(
        get_driver_by_telegram_id, message.from_user.id, False
    )
    if driver_any:
        if driver_any.is_active_driver:
            name = driver_any.first_name or ""
            greeting = f"Привіт, {name}! 👋" if name else "Привіт! 👋"
            await message.answer(
                f"{greeting}\nОберіть, що потрібно зробити:",
                reply_markup=get_main_menu_keyboard(),
            )
        else:
            await message.answer(
                "⛔ Ваш акаунт деактивовано.\n"
                "Зверніться до диспетчера, щоб відновити доступ.",
                reply_markup=ReplyKeyboardRemove(),
            )
        return

    await message.answer(
        "Привіт! 👋\n\n"
        "Я — бот Fleet Manager. Допомагаю водіям відстежувати "
        "пробіг, сервіс та регламент авто.\n\n"
        "Для початку — поділіться номером телефону, "
        "щоб я міг вас ідентифікувати.",
        reply_markup=get_share_phone_keyboard(),
    )


@router.message(F.contact)
async def handle_contact(message: Message) -> None:
    contact: Optional[Contact] = message.contact
    if contact is None:
        return

    if contact.user_id and message.from_user and contact.user_id != message.from_user.id:
        await message.answer(
            "Потрібен саме ваш номер телефону.\n"
            "Натисніть кнопку нижче ⬇️",
            reply_markup=get_share_phone_keyboard(),
        )
        return

    phone_number = _normalize_phone_number(contact.phone_number)
    telegram_id = message.from_user.id if message.from_user else None
    if telegram_id is None:
        await message.answer(
            "Не вдалося отримати Telegram ID. Спробуйте пізніше або напишіть /start.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    driver = await asyncio.to_thread(
        activate_driver_for_telegram,
        phone_number=phone_number,
        telegram_id=telegram_id,
    )
    if driver is None:
        await message.answer(
            "Номер не знайдено в системі 😕\n\n"
            "Переконайтесь, що диспетчер додав вас у Fleet Manager "
            "із цим номером телефону.\n\n"
            "Після додавання — натисніть /start ще раз.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    name = driver.first_name or ""
    greeting = f"{name}, в" if name else "В"
    await message.answer(
        f"✅ {greeting}ас успішно активовано!\n\n"
        "Тепер ви можете оновлювати пробіг, переглядати регламент "
        "та повідомляти про сервіс.",
        reply_markup=get_main_menu_keyboard(),
    )


@router.message(F.text == "📍 Пробіг")
async def start_mileage_report(message: Message, state: FSMContext) -> None:
    if not message.from_user:
        return

    driver = await asyncio.to_thread(
        get_driver_by_telegram_id, message.from_user.id
    )
    if not driver:
        await message.answer(
            "Спочатку активуйте акаунт — натисніть /start",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    vehicles = await asyncio.to_thread(
        get_vehicles_for_driver, message.from_user.id
    )
    if not vehicles:
        await message.answer(
            "У вас поки немає призначених авто.\n"
            "Зверніться до диспетчера.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    car_numbers = [v.car_number for v in vehicles]
    await state.set_state(MileageReportStates.choosing_vehicle)
    await state.update_data(
        mileage_vehicle_car_numbers=car_numbers,
        mileage_vehicles_by_car={v.car_number: str(v.id) for v in vehicles},
    )
    await message.answer(
        "📍 <b>Оновлення пробігу</b>\n\n"
        "Оберіть авто:",
        reply_markup=get_vehicles_keyboard(car_numbers),
        parse_mode="HTML",
    )


@router.message(MileageReportStates.choosing_vehicle, F.text)
async def mileage_vehicle_chosen(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    car_numbers = data.get("mileage_vehicle_car_numbers") or []
    vehicles_by_car = data.get("mileage_vehicles_by_car") or {}
    car_number = (message.text or "").removeprefix(CAR_NUM_PREFIX)
    if car_number not in car_numbers:
        return
    vehicle_id = vehicles_by_car.get(car_number)
    if not vehicle_id:
        await message.answer("Авто не знайдено. Спробуйте ще раз.")
        return
    await state.update_data(
        mileage_vehicle_id=vehicle_id,
        mileage_car_number=car_number,
    )
    await state.set_state(MileageReportStates.choosing_unit)
    await message.answer(
        "В яких одиницях вводитимете пробіг?",
        reply_markup=get_mileage_unit_keyboard(),
    )


@router.message(MileageReportStates.choosing_unit, F.text.in_(["🔢 Кілометри", "🔢 Милі"]))
async def mileage_unit_chosen(message: Message, state: FSMContext) -> None:
    from uuid import UUID

    unit = (message.text or "").removeprefix("🔢 ")
    await state.update_data(mileage_unit=unit)
    await state.set_state(MileageReportStates.entering_value)

    data = await state.get_data()
    vehicle_id = data.get("mileage_vehicle_id")
    car_number = data.get("mileage_car_number", "")
    current_km = 0
    if vehicle_id:
        current_km = await asyncio.to_thread(
            get_vehicle_current_km, UUID(vehicle_id)
        ) or 0

    await state.update_data(mileage_current_km=current_km)

    def _fmt(km: int) -> str:
        return f"{km:,}".replace(",", " ")

    unit_label = "км" if unit == "Кілометри" else "миль"
    await message.answer(
        f"🚗 <b>{_escape_html(car_number)}</b>\n"
        f"Поточний пробіг: <b>{_fmt(current_km)} км</b>\n\n"
        f"Введіть новий пробіг ({unit_label}):",
        reply_markup=ReplyKeyboardRemove(),
        parse_mode="HTML",
    )


@router.message(MileageReportStates.entering_value, F.text)
async def mileage_value_entered(message: Message, state: FSMContext) -> None:
    from uuid import UUID

    data = await state.get_data()
    vehicle_id = data.get("mileage_vehicle_id")
    car_number = data.get("mileage_car_number", "")
    unit = data.get("mileage_unit", "Кілометри")
    current_km = data.get("mileage_current_km", 0)
    if current_km is None:
        current_km = 0
    if not vehicle_id:
        await state.clear()
        await message.answer("Помилка. Почніть знову.", reply_markup=get_main_menu_keyboard())
        return

    raw = message.text.strip().replace(" ", "").replace(",", ".")
    try:
        value = float(raw)
    except ValueError:
        await message.answer(
            "Введіть число, наприклад: <b>45000</b> або <b>28000.5</b>",
            parse_mode="HTML",
        )
        return
    if value < 0:
        await message.answer("Пробіг не може бути від'ємним. Введіть додатне число.")
        return

    if unit == "Милі":
        value_km = int(round(value * 1.60934))
    else:
        value_km = int(round(value))

    def _fmt(km: int) -> str:
        return f"{km:,}".replace(",", " ")

    if value_km < current_km:
        await message.answer(
            f"Новий пробіг не може бути менше поточного.\n\n"
            f"Зараз на авто: <b>{_fmt(current_km)} км</b>\n"
            f"Ви ввели: <b>{_fmt(value_km)} км</b>\n\n"
            f"Спробуйте ще раз.",
            parse_mode="HTML",
        )
        return

    await state.clear()
    unit_note = f" ({_fmt(int(round(value)))} миль)" if unit == "Милі" else ""
    await message.answer(
        f"✅ <b>Пробіг оновлено</b>\n\n"
        f"🚗 Авто: <b>{_escape_html(car_number)}</b>\n"
        f"📍 Новий пробіг: <b>{_fmt(value_km)} км</b>{unit_note}",
        reply_markup=get_main_menu_keyboard(),
        parse_mode="HTML",
    )


@router.message(F.text == "📋 Регламент")
async def start_regulation(message: Message, state: FSMContext) -> None:
    if not message.from_user:
        return

    driver = await asyncio.to_thread(
        get_driver_by_telegram_id, message.from_user.id
    )
    if not driver:
        await message.answer(
            "Спочатку активуйте акаунт — натисніть /start",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    vehicles = await asyncio.to_thread(
        get_vehicles_for_driver, message.from_user.id
    )
    if not vehicles:
        await message.answer(
            "У вас поки немає призначених авто.\n"
            "Зверніться до диспетчера.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    car_numbers = [v.car_number for v in vehicles]
    await state.set_state(RegulationStates.choosing_vehicle)
    await state.update_data(
        regulation_vehicle_car_numbers=car_numbers,
        regulation_vehicles_by_car={v.car_number: str(v.id) for v in vehicles},
    )
    await message.answer(
        "📋 <b>Регламент обслуговування</b>\n\n"
        "Оберіть авто:",
        reply_markup=get_vehicles_keyboard(car_numbers),
        parse_mode="HTML",
    )


@router.message(F.text == "❓ Допомога")
async def menu_help_faq(message: Message) -> None:
    await message.answer(
        "❓ <b>Часті питання</b>\n\n"
        "Оберіть тему:",
        reply_markup=get_faq_keyboard(),
        parse_mode="HTML",
    )


@router.message(RegulationStates.choosing_vehicle, F.text)
async def regulation_vehicle_chosen(
    message: Message, state: FSMContext
) -> None:
    from uuid import UUID

    data = await state.get_data()
    car_numbers = data.get("regulation_vehicle_car_numbers") or []
    vehicles_by_car = data.get("regulation_vehicles_by_car") or {}
    car_number = (message.text or "").removeprefix(CAR_NUM_PREFIX)
    if car_number not in car_numbers:
        await message.answer(
            "Оберіть авто з кнопок нижче або натисніть /start для скасування."
        )
        return

    vehicle_id = vehicles_by_car.get(car_number)
    if not vehicle_id:
        await message.answer("Авто не знайдено. Спробуйте /start")
        return

    plan = await asyncio.to_thread(
        get_regulation_plan_for_vehicle, UUID(vehicle_id)
    )
    if not plan:
        await state.clear()
        await message.answer(
            "Для цього авто ще немає регламенту.\n"
            "Зверніться до диспетчера для налаштування.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    current_km = await asyncio.to_thread(get_vehicle_current_km, UUID(vehicle_id))
    if current_km is None:
        current_km = 0
    await state.set_state(RegulationStates.showing_plan)
    await state.update_data(
        regulation_plan=plan,
        regulation_car_number=car_number,
    )

    def _fmt_km(km: int | None) -> str:
        if km is None:
            return "—"
        return f"{km:,}".replace(",", " ")

    lines = [
        "📋 <b>Регламент обслуговування</b>",
        "",
        f"🚗 Авто: <b>{_escape_html(car_number)}</b>",
        f"📏 Пробіг: <b>{_fmt_km(current_km)} км</b>",
        "",
        "─────────────────────",
    ]
    for row in plan:
        title = _escape_html((row.get("title") or "").strip() or "—")
        next_km = row.get("next_due_km")
        last_km = row.get("last_done_km")
        notify_km = row.get("notify_before_km") or 0

        if next_km is not None:
            remaining = next_km - current_km
            if remaining <= 0:
                status = "🔴"
                status_text = "Терміново"
            elif remaining <= notify_km:
                status = "🟡"
                status_text = "Скоро"
            else:
                status = "🟢"
                status_text = "Ок"
            next_str = _fmt_km(next_km)
            rem_str = _fmt_km(max(0, remaining))
            detail = f"   → {next_str} км · ще {rem_str} км ({status_text})"
        else:
            status = "⚪"
            detail = "   Немає даних"

        lines.append("")
        lines.append(f"{status} <b>{title}</b>")
        if last_km is not None:
            lines.append(f"   Востаннє: {_fmt_km(last_km)} км")
        lines.append(detail)

    text = "\n".join(lines).strip()

    await message.answer(
        text,
        reply_markup=get_regulation_pdf_keyboard(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "reg_pdf")
async def regulation_send_pdf(callback: CallbackQuery, state: FSMContext) -> None:
    if not callback.message:
        await callback.answer("Помилка.")
        return

    data = await state.get_data()
    plan = data.get("regulation_plan") or []
    car_number = data.get("regulation_car_number") or ""

    if not plan:
        await callback.answer("Немає даних для PDF.")
        return

    pdf_buf = await asyncio.to_thread(
        build_regulation_pdf, car_number, plan
    )
    safe_car = car_number.replace(" ", "_")
    filename = f"Регламент_обслуговування_{safe_car}.pdf"
    doc = BufferedInputFile(pdf_buf.read(), filename=filename)
    await callback.message.answer_document(doc)
    await callback.answer("PDF надіслано.")


FAQ_ANSWERS = {
    "faq_what": (
        "🤔 <b>Що таке Fleet Manager?</b>\n\n"
        "Це система для управління автопарком. Через бота ви можете:\n\n"
        "• 📍 Оновлювати пробіг свого авто\n"
        "• 🔧 Повідомляти про пройдений сервіс\n"
        "• 📋 Переглядати регламент обслуговування\n\n"
        "Диспетчер призначає вам авто та налаштовує регламент через веб-додаток."
    ),
    "faq_mileage": (
        "📍 <b>Як оновити пробіг?</b>\n\n"
        "1. Натисніть «📍 Пробіг» в меню\n"
        "2. Оберіть авто\n"
        "3. Оберіть одиниці (км або милі)\n"
        "4. Введіть поточне значення з одометра\n\n"
        "Пробіг не може бути менше попереднього значення."
    ),
    "faq_service": (
        "🔧 <b>Як повідомити про сервіс?</b>\n\n"
        "1. Натисніть «🔧 Сервіс» в меню\n"
        "2. Оберіть авто\n"
        "3. Відмітьте виконані роботи (можна кілька)\n"
        "4. Надішліть фото підтвердження (до 10 шт.)\n"
        "5. Натисніть «✅ Завершити»"
    ),
    "faq_view_reg": (
        "📋 <b>Як переглянути регламент?</b>\n\n"
        "1. Натисніть «📋 Регламент» в меню\n"
        "2. Оберіть авто\n"
        "3. Побачите план обслуговування зі статусами:\n\n"
        "🟢 Ок — заміна не скоро\n"
        "🟡 Скоро — наближається термін\n"
        "🔴 Терміново — потрібна заміна\n\n"
        "Також можна завантажити PDF."
    ),
    "faq_no_vehicle": (
        "🚗 <b>Не бачу своє авто</b>\n\n"
        "Авто призначає диспетчер через веб-додаток. "
        "Якщо ви не бачите свого авто в списку — зверніться до диспетчера, "
        "щоб він призначив його вам."
    ),
    "faq_contacts": (
        "📞 <b>Контакти підтримки</b>\n\n"
        "З питань роботи бота або системи — зверніться до вашого диспетчера.\n\n"
        "Він допоможе з призначенням авто, налаштуванням регламенту "
        "та іншими організаційними питаннями."
    ),
}


@router.callback_query(F.data.startswith("faq_"))
async def faq_answer(callback: CallbackQuery) -> None:
    if not callback.data or not callback.message:
        return
    text = FAQ_ANSWERS.get(callback.data)
    if text:
        await callback.message.answer(
            text, reply_markup=get_main_menu_keyboard(), parse_mode="HTML"
        )
    await callback.answer()

@router.message(F.text == "🔧 Сервіс")
async def start_service_report(message: Message, state: FSMContext) -> None:
    if not message.from_user:
        return

    driver = await asyncio.to_thread(
        get_driver_by_telegram_id, message.from_user.id
    )
    if not driver:
        await message.answer(
            "Спочатку активуйте акаунт — натисніть /start",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    vehicles = await asyncio.to_thread(
        get_vehicles_for_driver, message.from_user.id
    )
    if not vehicles:
        await message.answer(
            "У вас поки немає призначених авто.\n"
            "Зверніться до диспетчера.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    car_numbers = [v.car_number for v in vehicles]
    await state.set_state(ServiceReportStates.choosing_vehicle)
    await state.update_data(vehicle_car_numbers=car_numbers)
    await message.answer(
        "🔧 <b>Звіт про сервіс</b>\n\n"
        "Оберіть авто:",
        reply_markup=get_vehicles_keyboard(car_numbers),
        parse_mode="HTML",
    )


@router.message(ServiceReportStates.choosing_vehicle, F.text)
async def service_report_vehicle_chosen(
    message: Message, state: FSMContext
) -> None:
    data = await state.get_data()
    car_numbers = data.get("vehicle_car_numbers") or []
    car_number = (message.text or "").removeprefix(CAR_NUM_PREFIX)
    if car_number not in car_numbers:
        await message.answer(
            "Оберіть авто з кнопок нижче або натисніть /start для скасування."
        )
        return

    await state.update_data(
        vehicle_car_number=car_number,
        selected_service_indices=[],
    )
    await state.set_state(ServiceReportStates.choosing_service_type)
    await message.answer(
        "Які роботи було виконано?\n"
        "Оберіть один або кілька пунктів:",
        reply_markup=get_service_types_keyboard([]),
    )


@router.callback_query(
    ServiceReportStates.choosing_service_type, F.data == "svc_confirm"
)
async def service_report_types_confirm(
    callback: CallbackQuery, state: FSMContext
) -> None:
    if not callback.message:
        return

    data = await state.get_data()
    selected_indices = data.get("selected_service_indices") or []

    if not selected_indices:
        await callback.answer("Оберіть хоча б одну роботу")
        return

    service_names = [SERVICE_TYPES[i] for i in selected_indices if 0 <= i < len(SERVICE_TYPES)]
    await state.update_data(
        service_type_indices=selected_indices,
        service_type_names=service_names,
        photo_file_ids=[],
    )
    await state.set_state(ServiceReportStates.waiting_photo)

    services_text = "\n".join(f"  • {name}" for name in service_names)
    await callback.message.edit_text(
        f"Обрані роботи:\n{services_text}\n\n"
        "📸 Тепер надішліть фото підтвердження (до 10 шт.)\n\n"
        "Коли закінчите — натисніть «✅ Завершити»",
    )
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.answer()


@router.callback_query(
    ServiceReportStates.choosing_service_type, F.data.startswith("svc_")
)
async def service_report_type_toggled(
    callback: CallbackQuery, state: FSMContext
) -> None:
    if not callback.data or not callback.message:
        return

    raw = callback.data.replace("svc_", "")
    try:
        idx = int(raw)
    except ValueError:
        await callback.answer("Помилка вибору.")
        return

    if idx < 0 or idx >= len(SERVICE_TYPES):
        await callback.answer("Невірний тип.")
        return

    data = await state.get_data()
    selected: list[int] = data.get("selected_service_indices") or []

    if idx in selected:
        selected.remove(idx)
    else:
        selected.append(idx)

    await state.update_data(selected_service_indices=selected)
    await callback.message.edit_reply_markup(
        reply_markup=get_service_types_keyboard(selected)
    )
    await callback.answer()


@router.message(ServiceReportStates.waiting_photo, F.photo)
async def service_report_photo_received(
    message: Message, state: FSMContext
) -> None:
    data = await state.get_data()
    photos: list[str] = data.get("photo_file_ids") or []

    if len(photos) >= 10:
        await message.answer(
            "Досягнуто ліміт — 10 фото.\n"
            "Натисніть «✅ Завершити» для відправки.",
            reply_markup=get_finish_photos_keyboard(),
        )
        return

    file_id = message.photo[-1].file_id
    photos.append(file_id)
    await state.update_data(photo_file_ids=photos)

    remaining = 10 - len(photos)
    hint = f"Можна ще {remaining}" if remaining > 0 else ""
    await message.answer(
        f"📸 Фото {len(photos)}/10 збережено. {hint}\n\n"
        "Надішліть ще або натисніть «✅ Завершити».",
        reply_markup=get_finish_photos_keyboard(),
    )


@router.message(ServiceReportStates.waiting_photo, F.text == "✅ Завершити")
async def service_report_finish_photos(
    message: Message, state: FSMContext
) -> None:
    data = await state.get_data()
    photos: list[str] = data.get("photo_file_ids") or []
    selected_indices: list[int] = (
        data.get("service_type_indices")
        or data.get("selected_service_indices")
        or []
    )
    car_number = data.get("vehicle_car_number", "")

    services = [
        SERVICE_TYPES[i] for i in selected_indices if 0 <= i < len(SERVICE_TYPES)
    ]

    count_photos = len(photos)
    services_text = "\n".join(f"  • {s}" for s in services)

    await state.clear()
    await message.answer(
        f"✅ <b>Звіт про сервіс прийнято!</b>\n\n"
        f"🚗 Авто: <b>{_escape_html(car_number)}</b>\n"
        f"🔧 Роботи:\n{services_text}\n"
        f"📸 Фото: {count_photos}",
        reply_markup=get_main_menu_keyboard(),
        parse_mode="HTML",
    )


@router.message(ServiceReportStates.waiting_photo)
async def service_report_waiting_photo_other(message: Message) -> None:
    await message.answer(
        "Надішліть фото або натисніть «✅ Завершити».",
        reply_markup=get_finish_photos_keyboard(),
    )


async def main() -> None:
    if not BOT_TOKEN:
        raise RuntimeError(
            "TELEGRAM_BOT_TOKEN is not set. "
            "Please define it in your environment or .env file."
        )

    bot = Bot(token=BOT_TOKEN)
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(router)

    await dp.start_polling(bot)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    asyncio.run(main())
