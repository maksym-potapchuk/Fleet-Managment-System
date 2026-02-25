from typing import List, Optional

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)

from bot.constants import SERVICE_TYPES


def get_share_phone_keyboard() -> ReplyKeyboardMarkup:
    button = KeyboardButton(text="Поділитися номером телефону", request_contact=True)
    keyboard = [[button]]

    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
        one_time_keyboard=True,
        input_field_placeholder="Натисніть кнопку, щоб поділитися номером",
    )


def get_main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Повідомити про Сервіс"), KeyboardButton(text="Повідоміти пробіг")],
            [KeyboardButton(text="Регламент"), KeyboardButton(text="Допомога/FAQ")],
        ],
        resize_keyboard=True,
    )


def get_vehicles_keyboard(car_numbers: List[str]) -> ReplyKeyboardMarkup:
    buttons = [[KeyboardButton(text=num)] for num in car_numbers]
    buttons.append([KeyboardButton(text="Головне меню")])
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
        prefix = "✅ " if i in selected_indices else ""
        buttons.append(
            [InlineKeyboardButton(text=f"{prefix}{name}", callback_data=f"svc_{i}")]
        )

    # Confirm button
    buttons.append(
        [InlineKeyboardButton(text="✅ Підтвердити вибір", callback_data="svc_confirm")]
    )

    return InlineKeyboardMarkup(inline_keyboard=buttons)


def get_finish_photos_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Завершити відправку фото")],
            [KeyboardButton(text="Головне меню")],
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def get_regulation_pdf_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Завантажити PDF", callback_data="reg_pdf")],
        ]
    )


MAIN_MENU_BUTTON = "Головне меню"


def get_mileage_unit_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="Кілометри"), KeyboardButton(text="Милі")],
            [KeyboardButton(text=MAIN_MENU_BUTTON)],
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def get_faq_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Що таке Fleet Manager?", callback_data="faq_what")],
            [InlineKeyboardButton(text="Як додати водія?", callback_data="faq_add_driver")],
            [InlineKeyboardButton(text="Як призначити авто водію?", callback_data="faq_assign_vehicle")],
            [InlineKeyboardButton(text="Як заповнити регламент для авто?", callback_data="faq_regulation")],
            [InlineKeyboardButton(text="Як водію переглянути регламент?", callback_data="faq_view_reg")],
            [InlineKeyboardButton(text="Контакти підтримки", callback_data="faq_contacts")],
        ]
    )

