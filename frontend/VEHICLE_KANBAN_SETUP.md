# Vehicle Kanban Dashboard Setup

## Overview
A complete Kanban dashboard for managing vehicles with drag-and-drop functionality matching your Django backend VehicleStatus model.

## Files Created

### Types
- **`types/vehicle.ts`** - TypeScript interfaces for Vehicle, VehicleStatus, and related types

### Services
- **`services/vehicle.ts`** - API service for CRUD operations on vehicles

### Components
- **`components/vehicle/VehicleKanban.tsx`** - Main Kanban board component with drag & drop
- **`components/vehicle/VehicleModal.tsx`** - Modal for creating/editing vehicles
- **`components/vehicle/index.ts`** - Export index file

### Pages
- **`app/[locale]/vehicles/page.tsx`** - Main vehicles page

## Features

### Kanban Board
- **9 Status Columns** matching backend:
  - СТО (CTO)
  - Фокус (FOCUS)
  - Хімчистка (CLEANING)
  - Підготовка (PREPARATION)
  - Готове (READY)
  - Лізинг (LEASING)
  - Оренда (RENT)
  - Продаж (SELLING)
  - Продано (SOLD)

- **Drag & Drop**: Move vehicles between columns to update status
- **Search**: Filter by car number, manufacturer, model, or VIN
- **Filters**: Filter by manufacturer and year
- **Vehicle Count**: Shows total and active vehicles

### Vehicle Cards
- Car number and manufacturer/model
- Year and cost
- Assigned driver
- VIN number
- Visual drag handle

### Vehicle Modal
- Create new vehicles
- Edit existing vehicles
- Delete vehicles
- Form validation
- All required fields with proper types

## Backend API Integration

The components expect these API endpoints:

```
GET    /api/vehicle/           # List all vehicles
GET    /api/vehicle/:id/       # Get single vehicle
POST   /api/vehicle/           # Create vehicle
PATCH  /api/vehicle/:id/       # Update vehicle
DELETE /api/vehicle/:id/       # Delete vehicle
```

## Usage

### Navigate to Vehicles Page
The vehicles link has been added to the sidebar navigation at `/vehicles`

### Add a Vehicle
1. Click "Додати авто" button
2. Fill in the form (all fields required):
   - Car Number (e.g., AA1234BB)
   - Manufacturer (dropdown)
   - Model
   - Year
   - Cost in PLN
   - Status (dropdown)
   - VIN Number (17 characters)
3. Click "Зберегти"

### Edit a Vehicle
1. Click on any vehicle card
2. Edit the fields
3. Click "Зберегти"

### Delete a Vehicle
1. Click on a vehicle card to open it
2. Click "Видалити" button
3. Confirm deletion

### Move Vehicle Status
1. Drag any vehicle card
2. Drop it on a different status column
3. Status updates automatically via API

## Status Mapping

| Backend Value | Display Label | Color |
|---------------|---------------|-------|
| CTO | СТО | Red |
| FOCUS | Фокус | Purple |
| CLEANING | Хімчистка | Cyan |
| PREPARATION | Підготовка | Indigo |
| READY | Готове | Emerald |
| LEASING | Лізинг | Blue |
| RENT | Оренда | Sky Blue |
| SELLING | Продаж | Yellow |
| SOLD | Продано | Slate |

## Next Steps

1. **Test the Integration**:
   ```bash
   # Make sure backend is running
   docker-compose up backend

   # Start frontend
   cd frontend
   npm run dev
   ```

2. **Navigate to**: http://localhost:3000/vehicles

3. **Test Features**:
   - Add a new vehicle
   - Drag vehicles between columns
   - Search and filter
   - Edit and delete vehicles

## Customization

### Add More Filters
Edit `VehicleKanban.tsx` to add additional filters like driver assignment, cost range, etc.

### Change Colors
Modify the `KANBAN_COLUMNS` array in `VehicleKanban.tsx` to customize column colors

### Add More Fields
1. Update `types/vehicle.ts` to add new fields
2. Update `VehicleModal.tsx` to include form fields
3. Update `VehicleCard` to display new fields

## Troubleshooting

### CORS Issues
Make sure your Django backend has CORS configured properly for your frontend URL.

### 401 Unauthorized
The API service includes automatic token refresh. If you get 401 errors, check your authentication setup.

### Drag & Drop Not Working
Ensure the `onUpdateStatus` callback is properly connected to the API service.
