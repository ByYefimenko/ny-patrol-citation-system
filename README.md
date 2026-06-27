# CMP2812 Assessment 3 – NY Patrol Citation System

This project was built for the CMP2812 Full Stack Development assignment.

The backend uses FastAPI + MySQL from the earlier coursework tasks, and the frontend was built with plain HTML, CSS and JavaScript using the Fetch API (no frontend frameworks).

The system has two main areas:

- Driver portal
  - registration
  - login
  - citation dashboard
  - profile updates

- Admin portal
  - dashboard statistics
  - citation management
  - create/edit/delete notices

JWT authentication is used for login sessions and tokens are stored in `sessionStorage`.

---

# Project structure

```text
backend/                    FastAPI application
frontend/                   Static frontend
ny_patrol_traffic_db.sql    Database schema + seed data
```

Main folders:

```text
backend/app
frontend/css
frontend/js
frontend/config.js
```

---

# Running the project

## 1. Import the database

```bash
mysql -uroot -p < ny_patrol_traffic_db.sql
```

This creates the database tables and seed data used by the app. Run this from the **project root** (the folder that contains `ny_patrol_traffic_db.sql`).

---

## 2. Backend setup

Open a terminal inside the `backend` folder:

```bash
cd backend
cp .env.example .env
```

Update `.env` before starting the API:

- set your MySQL password in `DATABASE_URL` (no space before `@`, e.g. `root:mypass@localhost`)
- change `JWT_SECRET`
- update `CORS_ORIGINS` if you use another host/port (note `http://localhost:5173` and `http://127.0.0.1:5173` count as different origins)

Example:

```env
DATABASE_URL=mysql+mysqlconnector://root:yourpassword@localhost/ny_patrol_traffic_db
JWT_SECRET=replace_this_with_a_long_random_value
```

Create a virtual environment and install packages:

```bash
python -m venv .venv
source .venv/bin/activate
```

Windows:

```bash
.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Swagger docs:

```text
http://127.0.0.1:8000/docs
```

On the first run the app creates the `app_users` table and inserts a default admin account:

```text
username: admin
password: password
```

---

## 3. Frontend setup

Open another terminal:

```bash
cd frontend
python -m http.server 5173 --bind 127.0.0.1
```

Then open **`http://127.0.0.1:5173`** — this matches the default `CORS_ORIGINS` value in `.env.example`.

The frontend API URL is configured in:

```text
frontend/config.js
```

Default API address:

```text
http://127.0.0.1:8000
```

---

# Startup order

The app works best in this order:

1. Start MySQL
2. Start FastAPI / uvicorn
3. Start the frontend static server

---

# Main features

## Driver portal

- account registration
- JWT login
- citation dashboard
- profile updates
- responsive layout

## Admin portal

- admin login
- dashboard statistics
- citation CRUD (create/edit/delete with confirmations)
- validation/error handling

---

# Validation and security

Some of the validation included in the project:

- password strength checks
- email validation
- inline form errors
- duplicate citation checks
- future date validation
- role-based admin protection

Environment variables are used for:
- database connection settings
- JWT secret
- CORS origins

---

# Notes

- Frontend uses vanilla JavaScript only
- No React/Vue/frontend frameworks were used
- Tokens are stored in `sessionStorage`
- Fetch API is used for backend communication
- The layout was tested on desktop and smaller screen sizes