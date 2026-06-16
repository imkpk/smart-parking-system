# Smart Parking Payment Service

Standalone Spring Boot payment microservice for the Smart Parking project.

This service is intentionally separate from the existing NestJS backend. It owns payment records, mock payment state transitions, and optional Razorpay order creation for checkout.

## Tech Stack

- Java 21
- Spring Boot 3
- Maven
- MySQL
- Spring Web
- Spring Data JPA
- Bean Validation
- Lombok
- Spring Boot Actuator

## Service Details

```text
Service: payment-service
Port: 8081
Database: parking_payment_db
Base URL: http://localhost:8081/api/payments
```

## Database Setup

Use the same MySQL server as the main backend, but create a separate database:

```sql
CREATE DATABASE IF NOT EXISTS parking_payment_db;
GRANT ALL PRIVILEGES ON parking_payment_db.* TO 'parking_user'@'localhost';
FLUSH PRIVILEGES;
```

Do not commit real database passwords.

## Configuration

Main config:

```text
src/main/resources/application.properties
```

Example config:

```text
src/main/resources/application-example.properties
```

You can run with environment variables:

```bash
set SERVER_PORT=8081
set DB_URL=jdbc:mysql://localhost:3306/parking_payment_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
set DB_USERNAME=parking_user
set DB_PASSWORD=your_password
```

PowerShell:

```powershell
$env:SERVER_PORT="8081"
$env:DB_URL="jdbc:mysql://localhost:3306/parking_payment_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
$env:DB_USERNAME="parking_user"
$env:DB_PASSWORD="your_password"
$env:JWT_SECRET="smart_parking_dev_jwt_secret_32_chars_minimum"
```

`JWT_SECRET` must be **at least 32 characters** and must **exactly match** `JWT_SECRET` in `backend/.env`.

## Run

```bash
cd payment-service
mvn spring-boot:run
```

Build:

```bash
mvn clean package
```

Run packaged jar:

```bash
java -jar target/payment-service-0.0.1-SNAPSHOT.jar
```

## APIs

```text
GET  /api/payments/health
POST /api/payments/initiate
POST /api/payments/{id}/mock-success
POST /api/payments/{id}/mock-failure
GET  /api/payments/{id}
GET  /api/payments/user/{userId}
GET  /api/payments/reports/summary
```

## NestJS Contract (`POST /api/payments/initiate`)

Request fields (NestJS backend → payment-service):

```json
{
  "parkingEventId": 1,
  "bookingId": 1,
  "userId": 1,
  "amount": 80,
  "currency": "INR",
  "paymentMethod": "MOCK"
}
```

Response fields (`ApiResponse.data`):

```json
{
  "id": 1,
  "parkingEventId": 1,
  "bookingId": 1,
  "userId": 1,
  "amount": 80,
  "currency": "INR",
  "status": "INITIATED",
  "paymentMethod": "MOCK",
  "provider": "MOCK",
  "gatewayOrderId": null,
  "gatewayStatus": null,
  "providerReference": null,
  "failureReason": null,
  "createdAt": "2026-06-17T10:00:00",
  "updatedAt": "2026-06-17T10:00:00"
}
```

NestJS checkout forwards the caller `Authorization` header and uses `PAYMENT_SERVICE_URL` (default `http://localhost:8081`). Amount must be at least `0.01`.

## Authorization

All payment APIs except health and Swagger require a JWT from the NestJS backend.

Public:

```text
GET /api/payments/health
GET /swagger-ui/index.html
GET /v3/api-docs
```

Protected:

```text
POST /api/payments/initiate                 USER or ADMIN
POST /api/payments/{id}/mock-success        ADMIN
POST /api/payments/{id}/mock-failure        ADMIN
GET  /api/payments/{id}                     Payment owner or ADMIN
GET  /api/payments/user/{userId}            Same user or ADMIN
GET  /api/payments/reports/summary          ADMIN
```

The Spring Boot service validates the same HS256 JWT secret used by the NestJS backend:

```powershell
$env:JWT_SECRET="smart_parking_dev_jwt_secret_32_chars_minimum"
```

Use the token as:

```http
Authorization: Bearer ACCESS_TOKEN
```

## Swagger

Swagger UI:

```text
http://localhost:8081/swagger-ui/index.html
```

OpenAPI JSON:

```text
http://localhost:8081/v3/api-docs
```

The Swagger document includes request and response schemas for:

```text
InitiatePaymentRequest
MockFailureRequest
PaymentResponse
PaymentSummaryResponse
```

## Payment Providers

```text
payment.provider=MOCK      # default local/demo behavior
payment.provider=RAZORPAY  # creates Razorpay order on initiate
```

Razorpay env placeholders (never commit real keys):

```text
payment.razorpay.key-id=rzp_test_your_key_id
payment.razorpay.key-secret=your_razorpay_key_secret
payment.razorpay.currency=INR
```

MOCK provider keeps existing mock success/failure demo flow. RAZORPAY provider stores `gatewayOrderId` and `gatewayStatus` on the payment record while status remains `INITIATED` until verification is added.

## Payment Rules

- Amount must be greater than `0`.
- Currency defaults to `INR`.
- New payments start with `INITIATED` status.
- Mock success changes status to `SUCCESS`.
- Mock success generates `providerReference`.
- Mock failure changes status to `FAILED`.
- Mock failure stores `failureReason`.
- `SUCCESS` payment cannot be marked `FAILED`.
- `FAILED` payment cannot be marked `SUCCESS`; create a new payment instead.
- `REFUNDED` payments cannot be changed by mock success/failure.
- `INITIATED` can become `SUCCESS` or `FAILED`.
- USER can list/read only own payments; ADMIN can access all; SECURITY can list/read operational payments.

## Enums

```text
PaymentStatus:
- INITIATED
- SUCCESS
- FAILED
- REFUNDED

PaymentMethod:
- CASH
- CARD
- UPI
- WALLET
- MOCK
```

## Sample Requests

### Health

```http
GET http://localhost:8081/api/payments/health
```

### Initiate Payment

```http
POST http://localhost:8081/api/payments/initiate
Authorization: Bearer USER_TOKEN
Content-Type: application/json
```

```json
{
  "parkingEventId": 1,
  "bookingId": 1,
  "userId": 1,
  "amount": 80,
  "currency": "INR",
  "paymentMethod": "MOCK"
}
```

### Mark Mock Success

```http
POST http://localhost:8081/api/payments/1/mock-success
Authorization: Bearer ADMIN_TOKEN
```

### Mark Mock Failure

```http
POST http://localhost:8081/api/payments/1/mock-failure
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json
```

```json
{
  "failureReason": "Mock provider declined payment"
}
```

### Get Payment

```http
GET http://localhost:8081/api/payments/1
Authorization: Bearer USER_OR_ADMIN_TOKEN
```

### Get User Payments

```http
GET http://localhost:8081/api/payments/user/1
Authorization: Bearer USER_OR_ADMIN_TOKEN
```

### Summary

```http
GET http://localhost:8081/api/payments/reports/summary
Authorization: Bearer ADMIN_TOKEN
```
