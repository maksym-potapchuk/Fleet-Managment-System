from typing import List, Optional

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)

from bot.constants import SERVICE_TYPES

MAIN_MENU_BUTTON = "🏠 Меню"


def get_share_phone_keyboard() -> ReplyKeyboardMarkup:
    button = KeyboardButton(text="📱 Надіслати номер", request_contact=True)
    keyboard = [[button]]

    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
        one_time_keyboard=True,
        input_field_placeholder="Натисніть кнопку нижче ⬇️",
    )


def get_main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🔧 Сервіс"), KeyboardButton(text="📍 Пробіг")],
            [KeyboardButton(text="📋 Регламент"), KeyboardButton(text="❓ Допомога")],
        ],
        resize_keyboard=True,
    )


def get_vehicles_keyboard(car_numbers: List[str]) -> ReplyKeyboardMarkup:
    buttons = [[KeyboardButton(text=f"🚗 {num}")] for num in car_numbers]
    buttons.append([KeyboardButton(text=MAIN_MENU_BUTTON)])
    return ReplyKeyboardMarkup(
        keyboard=buttons,
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def get_service_types_keyboard(
    selected_indices: Optional[List[int]] = None,
) -> InlineKeyboardMarkup:
    if selected_indices is None:
        selected_indices = []

    buttons: List[List[InlineKeyboardButton]] = []
    for i, name in enumerate(SERVICE_TYPES):
        prefix = "✅ " if i in selected_indices else "⬜ "
        buttons.append(
            [InlineKeyboardButton(text=f"{prefix}{name}", callback_data=f"svc_{i}")]
        )

    count = len(selected_indices)
    confirm_text = f"Далі →  ({count} обрано)" if count else "Далі →"
    buttons.append(
        [InlineKeyboardButton(text=confirm_text, callback_data="svc_confirm")]
    )

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_finish_photos_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="✅ Завершити")],
            [KeyboardButton(text=MAIN_MENU_BUTTON)],
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def get_regulation_pdf_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📄 Завантажити PDF", callback_data="reg_pdf")],
        ]
    )


def get_mileage_unit_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="🔢 Кілометри"), KeyboardButton(text="🔢 Милі")],
            [KeyboardButton(text=MAIN_MENU_BUTTON)],
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def get_faq_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🤔 Що таке Fleet Manager?", callback_data="faq_what")],
            [InlineKeyboardButton(text="📍 Як оновити пробіг?", callback_data="faq_mileage")],
            [InlineKeyboardButton(text="🔧 Як повідомити про сервіс?", callback_data="faq_service")],
            [InlineKeyboardButton(text="📋 Як переглянути регламент?", callback_data="faq_view_reg")],
            [InlineKeyboardButton(text="🚗 Не бачу своє авто — що робити?", callback_data="faq_no_vehicle")],
            [InlineKeyboardButton(text="📞 Контакти підтримки", callback_data="faq_contacts")],
        ]
    )

