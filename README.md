# SmartMushFarm API

SmartMushFarm is an Express.js API for products, categories, health checks, and image uploads to Cloudinary.

## Features

- Product CRUD APIs
- Category CRUD APIs
- Cloudinary image upload APIs
- Swagger/OpenAPI docs

## Tech Stack

- Node.js
- Express
- PostgreSQL
- Cloudinary
- Swagger UI

## Project Structure

```text
src/
  app.js
  server.js
  config/
  controllers/
  middlewares/
  models/
  routes/
  services/
  utils/
```

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Cloudinary account

## Environment Variables

Create a `.env` file in the project root:

```env
PORT=5000
SERVER_URL=http://localhost:5000
DATABASE_URL=your_postgres_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Install Dependencies

Run this once to install all dependencies:

```bash
npm install
```

## Run the Project

Development:

```bash
npm run dev
```

Production:

```bash
npm start
```

## API Documentation

Swagger UI is available at:

```text
http://localhost:5000/api-docs
```

## Main Endpoints

### Health Check

- `GET /api`

### Products

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Categories

- `GET /api/categories`
- `GET /api/categories/:id`
- `POST /api/categories`
- `PUT /api/categories/:id`
- `DELETE /api/categories/:id`

### Upload Images

- `POST /api/uploads/image`
- `POST /api/uploads/images`

## Upload Image Example

Send a `multipart/form-data` request with the field name `image`.

### cURL

```bash
curl -X POST http://localhost:5000/api/uploads/image \
  -F "image=@/path/to/image.jpg"
```

### Response Example

```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "image_url": "https://res.cloudinary.com/.../image.jpg",
  "public_id": "smartmushfarm/abc123"
}
```

## Multiple Image Upload

Send a `multipart/form-data` request with the field name `images`.

### cURL

```bash
curl -X POST http://localhost:5000/api/uploads/images \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

## Notes

- Uploaded images are stored in the Cloudinary folder `SmartMushFarm`.
- Maximum file size is 5 MB per file.
- Allowed image types: JPEG, PNG, GIF.
