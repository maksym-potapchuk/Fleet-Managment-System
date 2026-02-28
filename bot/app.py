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


@router.message(F.text == MAIN_MENU_BUTTON)
async def back_to_main_menu(message: Message, state: FSMContext) -> None:
    await state.clear()
    await message.answer(
        "Оберіть дію:",
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
            await message.answer(
                "Привіт! 👋 Оберіть дію:",
                reply_markup=get_main_menu_keyboard(),
            )
        else:
            await message.answer(
                "Ваш акаунт водія деактивовано. Зверніться до диспетчера.",
                reply_markup=ReplyKeyboardRemove(),
            )
        return

    await message.answer(
        "Привіт! 👋\n"
        "Щоб активувати свій акаунт водія, поділіться, будь ласка, "
        "своїм номером телефону.",
        reply_markup=get_share_phone_keyboard(),
    )


@router.message(F.contact)
async def handle_contact(message: Message) -> None:
    contact: Optional[Contact] = message.contact
    if contact is None:
        return

    if contact.user_id and message.from_user and contact.user_id != message.from_user.id:
        await message.answer(
            "Будь ласка, поділіться саме своїм номером телефону.",
            reply_markup=get_share_phone_keyboard(),
        )
        return

    phone_number = _normalize_phone_number(contact.phone_number)
    telegram_id = message.from_user.id if message.from_user else None
    if telegram_id is None:
        await message.answer(
            "Не вдалося отримати ваш Telegram ID. Спробуйте ще раз пізніше.",
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
            "Користувача з таким номером телефону не знайдено.\n"
            "Будь ласка, зверніться до диспетчера або адміністратора.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    await message.answer(
        "Вас успішно активовано як водія ✅\n"
        "Тепер ви можете користуватися ботом.",
        reply_markup=get_main_menu_keyboard(),
    )


@router.message(F.text == "Повідоміти пробіг")
async def start_mileage_report(message: Message, state: FSMContext) -> None:
    if not message.from_user:
        return

    driver = await asyncio.to_thread(
        get_driver_by_telegram_id, message.from_user.id
    )
    if not driver:
        await message.answer(
            "Спочатку активуйте акаунт через /start.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    vehicles = await asyncio.to_thread(
        get_vehicles_for_driver, message.from_user.id
    )
    if not vehicles:
        await message.answer(
            "У вас немає призначених авто. Зверніться до диспетчера.",
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
        "Оберіть авто:",
        reply_markup=get_vehicles_keyboard(car_numbers),
    )


@router.message(MileageReportStates.choosing_vehicle, F.text)
async def mileage_vehicle_chosen(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    car_numbers = data.get("mileage_vehicle_car_numbers") or []
    vehicles_by_car = data.get("mileage_vehicles_by_car") or {}
    if message.text not in car_numbers:
        return  # Головне меню або інше — обробить back_to_main_menu або ігноруємо
    vehicle_id = vehicles_by_car.get(message.text)
    if not vehicle_id:
        await message.answer("Помилка: авто не знайдено.")
        return
    await state.update_data(
        mileage_vehicle_id=vehicle_id,
        mileage_car_number=message.text,
    )
    await state.set_state(MileageReportStates.choosing_unit)
    await message.answer(
        "Оберіть одиницю пробігу:",
        reply_markup=get_mileage_unit_keyboard(),
    )


@router.message(MileageReportStates.choosing_unit, F.text.in_(["Кілометри", "Милі"]))
async def mileage_unit_chosen(message: Message, state: FSMContext) -> None:
    from uuid import UUID

    unit = message.text  # "Кілометри" або "Милі"
    await state.update_data(mileage_unit=unit)
    await state.set_state(MileageReportStates.entering_value)

    data = await state.get_data()
    vehicle_id = data.get("mileage_vehicle_id")
    current_km = 0
    if vehicle_id:
        current_km = await asyncio.to_thread(
            get_vehicle_current_km, UUID(vehicle_id)
        ) or 0

    await state.update_data(mileage_current_km=current_km)

    if unit == "Кілометри":
        await message.answer(
            f"Поточний пробіг на авто: {current_km} км.\n"
            f"Введіть новий пробіг у кілометрах (число не менше {current_km}), наприклад: 45000",
            reply_markup=ReplyKeyboardRemove(),
        )
    else:
        await message.answer(
            f"Поточний пробіг на авто: {current_km} км.\n"
            f"Введіть новий пробіг у милях (число, не менше ніж відповідає {current_km} км), наприклад: 28000",
            reply_markup=ReplyKeyboardRemove(),
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
            "Введіть одне число (наприклад 45000 або 28000.5). Без тексту."
        )
        return
    if value < 0:
        await message.answer("Пробіг не може бути від'ємним. Введіть число ≥ 0.")
        return

    if unit == "Милі":
        value_km = int(round(value * 1.60934))
    else:
        value_km = int(round(value))

    if value_km < current_km:
        await message.answer(
            f"Валідація: пробіг не може бути меншим за поточний на авто.\n"
            f"Поточний пробіг: {current_km} км. Ви ввели: {value_km} км.\n"
            f"Введіть число не менше {current_km} (у кілометрах) або відповідне значення в милях.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    await state.clear()
    unit_note = " (введено в милях)" if unit == "Милі" else ""
    await message.answer(
        f"Дякуємо, дані прийнято.\n"
        f"Авто: {car_number}, пробіг: {value_km} км{unit_note}.\n",
        reply_markup=get_main_menu_keyboard(),
    )


@router.message(F.text == "Регламент")
async def start_regulation(message: Message, state: FSMContext) -> None:
    if not message.from_user:
        return

    driver = await asyncio.to_thread(
        get_driver_by_telegram_id, message.from_user.id
    )
    if not driver:
        await message.answer(
            "Спочатку активуйте акаунт через /start.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    vehicles = await asyncio.to_thread(
        get_vehicles_for_driver, message.from_user.id
    )
    if not vehicles:
        await message.answer(
            "У вас немає призначених авто. Зверніться до диспетчера.",
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
        "Оберіть авто для перегляду регламенту:",
        reply_markup=get_vehicles_keyboard(car_numbers),
    )


@router.message(F.text == "Допомога/FAQ")
async def menu_help_faq(message: Message) -> None:
    await message.answer(
        "Допомога для Fleet Manager. Оберіть питання:",
        reply_markup=get_faq_keyboard(),
    )


@router.message(RegulationStates.choosing_vehicle, F.text)
async def regulation_vehicle_chosen(
    message: Message, state: FSMContext
) -> None:
    from uuid import UUID

    data = await state.get_data()
    car_numbers = data.get("regulation_vehicle_car_numbers") or []
    vehicles_by_car = data.get("regulation_vehicles_by_car") or {}
    if message.text not in car_numbers:
        await message.answer(
            "Оберіть авто з кнопок вище або натисніть /start для скасування."
        )
        return

    vehicle_id = vehicles_by_car.get(message.text)
    if not vehicle_id:
        await message.answer("Помилка: авто не знайдено. Спробуйте /start.")
        return

    plan = await asyncio.to_thread(
        get_regulation_plan_for_vehicle, UUID(vehicle_id)
    )
    if not plan:
        await state.clear()
        await message.answer(
            "Для цього авто немає даних регламенту. Зверніться до диспетчера.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    current_km = await asyncio.to_thread(get_vehicle_current_km, UUID(vehicle_id))
    if current_km is None:
        current_km = 0

    car_number = message.text
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
        "🛠️ <b>Регламент обслуговування</b>",
        "",
        "🚗 Авто: <b>{}</b>".format(_escape_html(car_number)),
        "📏 Поточний пробіг: <b>{} км</b>".format(_fmt_km(current_km)),
        "",
        "─────────────────────",
        "",
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
                status_text = "Потрібна заміна"
            elif remaining <= notify_km:
                status = "🟡"
                status_text = "Скоро"
            else:
                status = "🟢"
                status_text = "За планом"
            next_str = _fmt_km(next_km)
            rem_str = _fmt_km(max(0, remaining))
            detail = f"Наступна заміна: {next_str} км · Залишилось: {rem_str} км ({status_text})"
        else:
            status = "⚪"
            detail = "Даних ще немає — зверніться до диспетчера"

        lines.append(f"{status} <b>{title}</b>")
        if last_km is not None:
            lines.append(f"   Остання заміна: {_fmt_km(last_km)} км")
        lines.append(f"   {detail}")
        lines.append("")

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
        "Fleet Manager — це система керування автопарком: водії, авто, регламенти обслуговування. "
        "Диспетчер (Fleet Manager) додає водіїв, призначає їм авто та заповнює регламент через веб-додаток або команди make."
    ),
    "faq_add_driver": (
        "Водія додають у веб-додатку (розділ Водії) або через Django admin. "
        "Потрібні: ПІБ, номер телефону. Після цього водій може активуватися в боті, натиснувши /start і поділившись номером."
    ),
    "faq_assign_vehicle": (
        "У веб-додатку: розділ Авто → обрати авто → призначити водія (поле driver). "
        "Або створити водія та авто одразу: make create-driver-vehicle (тестовий водій +380663234712 та авто AA6601BB)."
    ),
    "faq_regulation": (
        "Спочатку створіть дефолтну схему регламенту: make create-reg-schema. "
        "Потім призначте регламент авто за номером: make assign-regulation CAR=AA6601BB "
        "(замість AA6601BB — номер потрібного авто). Регламент заповниться пунктами з дефолтної схеми."
    ),
    "faq_view_reg": (
        "Водій у боті натискає «Регламент» → обирає своє авто → бачить план обслуговування та може завантажити PDF. "
        "Дані беруться з регламенту, призначеного авто (через make assign-regulation або API)."
    ),
    "faq_contacts": (
        "Контакти підтримки уточнюйте у вашого адміністратора системи. "
        "Технічні питання — через розробника або внутрішню документацію проекту."
    ),
}


@router.callback_query(F.data.startswith("faq_"))
async def faq_answer(callback: CallbackQuery) -> None:
    if not callback.data or not callback.message:
        return
    text = FAQ_ANSWERS.get(callback.data)
    if text:
        await callback.message.answer(text, reply_markup=get_main_menu_keyboard())
    await callback.answer()

@router.message(F.text == "Повідомити про Сервіс")
async def start_service_report(message: Message, state: FSMContext) -> None:
    if not message.from_user:
        return

    driver = await asyncio.to_thread(
        get_driver_by_telegram_id, message.from_user.id
    )
    if not driver:
        await message.answer(
            "Спочатку активуйте акаунт через /start.",
            reply_markup=ReplyKeyboardRemove(),
        )
        return

    vehicles = await asyncio.to_thread(
        get_vehicles_for_driver, message.from_user.id
    )
    if not vehicles:
        await message.answer(
            "У вас немає призначених авто. Зверніться до диспетчера.",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    car_numbers = [v.car_number for v in vehicles]
    await state.set_state(ServiceReportStates.choosing_vehicle)
    await state.update_data(vehicle_car_numbers=car_numbers)
    await message.answer(
        "Оберіть авто (номер):",
        reply_markup=get_vehicles_keyboard(car_numbers),
    )


@router.message(ServiceReportStates.choosing_vehicle, F.text)
async def service_report_vehicle_chosen(
    message: Message, state: FSMContext
) -> None:
    data = await state.get_data()
    car_numbers = data.get("vehicle_car_numbers") or []
    if message.text not in car_numbers:
        await message.answer(
            "Оберіть авто з кнопок вище або натисніть /start для скасування."
        )
        return

    await state.update_data(
        vehicle_car_number=message.text,
        selected_service_indices=[],
    )
    await state.set_state(ServiceReportStates.choosing_service_type)
    await message.answer(
        "Оберіть тип сервісу (можна кілька):",
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
        await callback.answer("Оберіть хоча б один тип сервісу.")
        return

    service_names = [SERVICE_TYPES[i] for i in selected_indices if 0 <= i < len(SERVICE_TYPES)]
    await state.update_data(
        service_type_indices=selected_indices,
        service_type_names=service_names,
        photo_file_ids=[],
    )
    await state.set_state(ServiceReportStates.waiting_photo)

    services_text = "\n".join(f"• {name}" for name in service_names)
    await callback.message.edit_text(
        "Ви обрали такі типи сервісу:\n"
        f"{services_text}\n\n"
        "Надішліть до 10 фото підтвердження.\n"
        "Коли закінчите, натисніть «Завершити відправку фото».",
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
            "Ви вже надіслали максимально допустиму кількість фото (10).\n"
            "Натисніть «Завершити відправку фото», щоб завершити.",
            reply_markup=get_finish_photos_keyboard(),
        )
        return

    file_id = message.photo[-1].file_id
    photos.append(file_id)
    await state.update_data(photo_file_ids=photos)

    await message.answer(
        f"Фото збережено ({len(photos)} з 10).\n"
        "Можете надіслати ще або натисніть «Завершити відправку фото».",
        reply_markup=get_finish_photos_keyboard(),
    )


@router.message(ServiceReportStates.waiting_photo, F.text == "Завершити відправку фото")
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

    services = [
        SERVICE_TYPES[i] for i in selected_indices if 0 <= i < len(SERVICE_TYPES)
    ]

    count_photos = len(photos)
    count_services = len(services)

    await state.clear()
    await message.answer(
        "Дякуємо! Повідомлення прийнято. ✅\n"
        f"Кількість типів сервісу: {count_services}\n"
        f"Кількість фото: {count_photos}",
        reply_markup=get_main_menu_keyboard(),
    )


@router.message(ServiceReportStates.waiting_photo)
async def service_report_waiting_photo_other(message: Message) -> None:
    await message.answer(
        "Надішліть фото (можна кілька до 10) або натисніть "
        "«Завершити відправку фото»."
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
