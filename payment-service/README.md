# Smart Parking Payment Service

Standalone Spring Boot payment microservice for the Smart Parking project.

This service is intentionally separate from the existing NestJS backend. It owns payment records and mock payment state transitions only. Real payment gateway integration is not included yet.

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
```

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
```

### Mark Mock Failure

```http
POST http://localhost:8081/api/payments/1/mock-failure
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
```

### Get User Payments

```http
GET http://localhost:8081/api/payments/user/1
```

### Summary

```http
GET http://localhost:8081/api/payments/reports/summary
```
