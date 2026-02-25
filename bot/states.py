from aiogram.fsm.state import State, StatesGroup


class ServiceReportStates(StatesGroup):
    choosing_vehicle = State()
    choosing_service_type = State()
    waiting_photo = State()


class RegulationStates(StatesGroup):
    choosing_vehicle = State()
    showing_plan = State()


class MileageReportStates(StatesGroup):
    choosing_vehicle = State()
    choosing_unit = State()
    entering_value = State()
