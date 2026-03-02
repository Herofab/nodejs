# Default User Setup

## Default Admin Account

When you run this project on a **new database** for the first time, a default admin user will be automatically created.

### Default Credentials

- **Email:** `admin@dashboard.com`
- **Password:** `admin123`
- **PIN:** `1234`
- **Role:** `admin`

### Important Notes

⚠️ **SECURITY WARNING:** Please change the default password immediately after your first login!

### How It Works

1. When the server starts, it runs the database migration
2. The migration checks if any users exist in the database
3. If no users are found (new database), it automatically creates the default admin user
4. You'll see a console message with the credentials when the user is created

### Testing on New Database

To test with a fresh database:

1. Drop your existing database (if any):
   ```sql
   DROP DATABASE IF EXISTS AADataBase;
   CREATE DATABASE AADataBase;
   ```

2. Start the server:
   ```bash
   node server.js
   ```

3. Look for these messages in the console:
   ```
   ✅ Default admin user created
   📧 Email: admin@dashboard.com
   🔑 Password: admin123
   📌 PIN: 1234
   ⚠️  IMPORTANT: Please change the default credentials after first login!
   ```

4. Navigate to `http://localhost:3000/auth/login`

5. Login with the default credentials

### Changing Default Password

After logging in as admin, you should:

1. Go to Dashboard → Users
2. Edit the admin user
3. Change the password to something secure

### If Users Already Exist

If your database already has users, the seed data will be skipped and you'll see:
```
ℹ️  Users already exist in database, skipping seed data
```

This prevents duplicate admin accounts and protects existing user data.
