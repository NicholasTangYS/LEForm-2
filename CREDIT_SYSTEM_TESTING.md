# Credit System API Testing Guide

## Overview
The credit system has been implemented with the following endpoints:

### Endpoints Added

1. **GET** `/api/credits/balance/:userId` - Get user credit balance
2. **POST** `/api/payment/mock-process` - Mock payment gateway for testing
3. **POST** `/api/discount-codes/validate` - Validate discount code
4. **POST** `/api/credits/purchase` - Purchase credits
5. **POST** `/api/credits/deduct` - Deduct credits
6. **GET** `/api/credits/transactions/:userId` - Get transaction history
7. **POST** `/api/discount-codes` - Create discount code (admin)
8. **GET** `/api/discount-codes` - List discount codes

## Testing Instructions

### Step 1: Ensure Database Tables Exist

Make sure you've created the following tables in your MySQL database:

```sql
-- 1. Credit Ledger Table
CREATE TABLE credit_ledger (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  transaction_type ENUM('PURCHASE', 'DEDUCTION', 'REFUND', 'ADJUSTMENT', 'BONUS') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  description VARCHAR(500),
  reference_type VARCHAR(50),
  reference_id VARCHAR(100),
  payment_method VARCHAR(50),
  payment_transaction_id VARCHAR(255),
  discount_code_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT,
  
  FOREIGN KEY (user_id) REFERENCES le_user(ID) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_type (transaction_type),
  INDEX idx_created_at (created_at),
  INDEX idx_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Discount Codes Table
CREATE TABLE discount_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  discount_type ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'BONUS_CREDITS') NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  min_purchase_amount DECIMAL(10, 2) DEFAULT 0.00,
  max_discount_amount DECIMAL(10, 2) NULL,
  usage_limit INT DEFAULT NULL,
  usage_count INT DEFAULT 0,
  usage_per_user INT DEFAULT 1,
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_until TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by INT,
  
  INDEX idx_code (code),
  INDEX idx_active_valid (is_active, valid_from, valid_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Discount Code Usage Table
CREATE TABLE discount_code_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  discount_code_id INT NOT NULL,
  user_id INT NOT NULL,
  credit_ledger_id INT NULL,
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES le_user(ID) ON DELETE CASCADE,
  FOREIGN KEY (credit_ledger_id) REFERENCES credit_ledger(id) ON DELETE SET NULL,
  
  INDEX idx_discount_code_id (discount_code_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Step 2: Restart Firebase Functions

```bash
cd functions
# Stop the current firebase serve if running
# Then restart:
firebase serve
```

### Step 3: Open the Test Page

Open `credit-api-tester.html` in your browser. The page will automatically:
- Connect to your local Firebase Functions at `http://127.0.0.1:5001`
- Load the balance for User ID 1
- Provide interactive forms to test all endpoints

### Step 4: Test Flow

**Recommended testing sequence:**

1. **Create a Discount Code**
   - Code: `WELCOME2025`
   - Type: `BONUS_CREDITS`
   - Value: `50`
   - Usage Limit: `100`

2. **Validate the Discount Code**
   - Enter the code you just created
   - User ID: `1`
   - Purchase Amount: `100`
   - Should show bonus credits calculation

3. **Purchase Credits**
   - User ID: `1`
   - Amount: `100`
   - Discount Code: `WELCOME2025`
   - This will:
     - Process mock payment (90% success rate)
     - Add 100 + 50 bonus = 150 credits
     - Update balance display

4. **Check Balance**
   - Should show 150.00 MYR

5. **Deduct Credits**
   - User ID: `1`
   - Amount: `10`
   - Description: `LE1 Form Generation`
   - Balance should decrease to 140.00

6. **View Transaction History**
   - User ID: `1`
   - Should show all transactions with running balance

## Mock Payment Gateway

The mock payment gateway simulates real payment processing:
- **Success Rate**: 90% (randomly fails 10% of the time for testing)
- **Processing Delay**: 1 second
- **Transaction ID Format**: `mock_[timestamp]_[random]`

## API Examples

### Get Balance
```bash
curl http://127.0.0.1:5001/le1-form/us-central1/altomateLE/api/credits/balance/1
```

### Purchase Credits
```bash
curl -X POST http://127.0.0.1:5001/le1-form/us-central1/altomateLE/api/credits/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "amount": 100,
    "paymentMethod": "MOCK",
    "paymentTransactionId": "mock_test_123",
    "discountCode": "WELCOME2025"
  }'
```

### Deduct Credits
```bash
curl -X POST http://127.0.0.1:5001/le1-form/us-central1/altomateLE/api/credits/deduct \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1,
    "amount": 10,
    "description": "LE1 Form Generation",
    "referenceType": "PROJECT",
    "referenceId": "PRJ-123"
  }'
```

## Troubleshooting

### CORS Errors
If you see CORS errors, make sure the test page is being served from an allowed origin. The current allowed origins are:
- `http://localhost:4200`
- `http://127.0.0.1:4200`
- `https://le1-form.web.app`

You may need to add `file://` or your local server to the `allowedOrigins` array in `functions/index.js`.

### Database Connection Errors
Check that:
1. Database tables are created
2. Database connection in `functions/index.js` is working
3. User with ID 1 exists in `le_user` table

### Transaction Errors
If transactions fail, check the Firebase Functions logs:
```bash
# In the functions directory
firebase functions:log
```

## Next Steps

1. **Frontend Integration**: Integrate these endpoints into your Angular app
2. **Real Payment Gateway**: Replace mock gateway with Stripe/PayPal
3. **Admin Panel**: Create UI for managing discount codes
4. **Credit Packages**: Define credit packages (e.g., 100 credits for RM 50)
5. **Usage Tracking**: Implement credit deduction when users generate forms

## Security Notes

⚠️ **Important**: The current implementation is for testing only. Before production:
1. Add authentication middleware to all endpoints
2. Add admin role check for discount code creation
3. Implement rate limiting
4. Add request validation
5. Replace mock payment with real payment gateway
6. Add webhook verification for payment confirmations
