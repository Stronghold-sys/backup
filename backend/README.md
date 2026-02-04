# Backend API

Node.js Express backend untuk aplikasi e-commerce dengan TypeScript dan Supabase.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Buat file `.env` di root folder backend:

```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
PORT=3000
NODE_ENV=development
```

### 3. Run Development Server

```bash
npm run dev
```

Server akan berjalan di `http://localhost:3000`

### 4. Initialize Application

Setelah server berjalan, initialize aplikasi untuk seed admin dan products:

```bash
curl -X POST http://localhost:3000/make-server-adb995ba/init
```

Atau buka di browser:
```
http://localhost:3000/make-server-adb995ba/init
```

## Default Admin Credentials

- **Email**: utskelompok03@gmail.com
- **Password**: admin123

## API Endpoints

### Authentication
- `POST /make-server-adb995ba/auth/signup` - Register new user
- `POST /make-server-adb995ba/auth/verify-signup` - Verify signup code
- `POST /make-server-adb995ba/auth/signin` - Login
- `GET /make-server-adb995ba/auth/me` - Get current user

### Products
- `GET /make-server-adb995ba/products` - Get all products
- `GET /make-server-adb995ba/products/:id` - Get product by ID

### Orders
- `GET /make-server-adb995ba/orders` - Get orders (filtered by user/admin)

## Scripts

- `npm run dev` - Run development server with hot reload
- `npm run build` - Build for production
- `npm start` - Run production server

## Tech Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Supabase** - Database & Authentication
- **Nodemon** - Development hot reload
