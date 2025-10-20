const { pool } = require('./database');

class Customer {
    constructor(data) {
        this.id = data.id;
        this.customer_code = data.customer_code;
        this.full_name = data.full_name;
        this.cnic = data.cnic;
        this.phone_primary = data.phone_primary;
        this.phone_secondary = data.phone_secondary;
        this.email = data.email;
        this.address_line1 = data.address_line1;
        this.address_line2 = data.address_line2;
        this.city = data.city;
        this.area = data.area;
        this.postal_code = data.postal_code;
        this.landmark = data.landmark;
        this.customer_type = data.customer_type || 'residential';
        this.status = data.status || 'active';
        this.credit_limit = data.credit_limit || 0.00;
        this.current_balance = data.current_balance || 0.00;
        this.registration_date = data.registration_date;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.notes = data.notes;
    }

    // Generate unique customer code
    static async generateCustomerCode() {
        const prefix = 'CUS';
        const query = 'SELECT customer_code FROM customers WHERE customer_code LIKE $1 ORDER BY customer_code DESC LIMIT 1';
        const result = await pool.query(query, [`${prefix}%`]);
        
        let nextNumber = 1;
        if (result.rows.length > 0) {
            const lastCode = result.rows[0].customer_code;
            const lastNumber = parseInt(lastCode.substring(3));
            nextNumber = lastNumber + 1;
        }
        
        return `${prefix}${String(nextNumber).padStart(4, '0')}`;
    }

    // Validate CNIC format (Pakistani CNIC: 12345-1234567-1)
    static validateCNIC(cnic) {
        const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
        return cnicPattern.test(cnic);
    }

    // Validate phone number format
    static validatePhone(phone) {
        const phonePattern = /^(\+92|0092|92|0)?[3-9]\d{9}$/;
        return phonePattern.test(phone.replace(/[\s-]/g, ''));
    }

    // Create new customer
    static async create(customerData, userId) {
        try {
            // Validate required fields
            if (!customerData.full_name || !customerData.cnic || !customerData.phone_primary || !customerData.address_line1 || !customerData.city) {
                throw new Error('Required fields missing: full_name, cnic, phone_primary, address_line1, city');
            }

            // Validate CNIC format
            if (!this.validateCNIC(customerData.cnic)) {
                throw new Error('Invalid CNIC format. Use format: 12345-1234567-1');
            }

            // Validate primary phone
            if (!this.validatePhone(customerData.phone_primary)) {
                throw new Error('Invalid phone number format');
            }

            // Generate customer code
            const customer_code = await this.generateCustomerCode();

            const query = `
                INSERT INTO customers (
                    customer_code, full_name, cnic, phone_primary, phone_secondary, 
                    email, address_line1, address_line2, city, area, postal_code, 
                    landmark, customer_type, credit_limit, created_by, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
                RETURNING *
            `;

            const values = [
                customer_code,
                customerData.full_name,
                customerData.cnic,
                customerData.phone_primary,
                customerData.phone_secondary || null,
                customerData.email || null,
                customerData.address_line1,
                customerData.address_line2 || null,
                customerData.city,
                customerData.area || null,
                customerData.postal_code || null,
                customerData.landmark || null,
                customerData.customer_type || 'residential',
                parseFloat(customerData.credit_limit) || 0.00,
                userId,
                customerData.notes || null
            ];

            const result = await pool.query(query, values);
            return new Customer(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Get all customers with pagination and search
    static async getAll(page = 1, limit = 20, search = '', status = '', customerType = '') {
        try {
            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            const params = [];
            let paramCount = 0;

            if (search) {
                paramCount++;
                whereClause += ` AND (
                    full_name ILIKE $${paramCount} OR 
                    customer_code ILIKE $${paramCount} OR 
                    cnic ILIKE $${paramCount} OR 
                    phone_primary ILIKE $${paramCount} OR 
                    city ILIKE $${paramCount}
                )`;
                params.push(`%${search}%`);
            }

            if (status) {
                paramCount++;
                whereClause += ` AND status = $${paramCount}`;
                params.push(status);
            }

            if (customerType) {
                paramCount++;
                whereClause += ` AND customer_type = $${paramCount}`;
                params.push(customerType);
            }

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM customers ${whereClause}`;
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].total);

            // Get customers
            const query = `
                SELECT c.*, u.email as created_by_email,
                       COUNT(o.id) as total_orders,
                       SUM(CASE WHEN o.order_status IN ('confirmed', 'in-progress') THEN 1 ELSE 0 END) as active_orders
                FROM customers c
                LEFT JOIN users u ON c.created_by = u.id
                LEFT JOIN orders o ON c.id = o.customer_id
                ${whereClause}
                GROUP BY c.id, u.email
                ORDER BY c.created_at DESC
                LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
            `;

            params.push(limit, offset);
            const result = await pool.query(query, params);

            return {
                customers: result.rows.map(row => new Customer(row)),
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Get customer by ID with order statistics
    static async getById(id) {
        try {
            const query = `
                SELECT c.*, u.email as created_by_email,
                       COUNT(o.id) as total_orders,
                       SUM(CASE WHEN o.order_status IN ('confirmed', 'in-progress') THEN 1 ELSE 0 END) as active_orders,
                       SUM(CASE WHEN o.payment_status = 'overdue' THEN o.total_amount ELSE 0 END) as overdue_amount
                FROM customers c
                LEFT JOIN users u ON c.created_by = u.id
                LEFT JOIN orders o ON c.id = o.customer_id
                WHERE c.id = $1
                GROUP BY c.id, u.email
            `;

            const result = await pool.query(query, [id]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return new Customer(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Get customer by customer code
    static async getByCode(customer_code) {
        try {
            const query = 'SELECT * FROM customers WHERE customer_code = $1';
            const result = await pool.query(query, [customer_code]);
            
            if (result.rows.length === 0) {
                return null;
            }

            return new Customer(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Update customer
    static async update(id, customerData, userId) {
        try {
            // Validate CNIC format if provided
            if (customerData.cnic && !this.validateCNIC(customerData.cnic)) {
                throw new Error('Invalid CNIC format. Use format: 12345-1234567-1');
            }

            // Validate primary phone if provided
            if (customerData.phone_primary && !this.validatePhone(customerData.phone_primary)) {
                throw new Error('Invalid phone number format');
            }

            const query = `
                UPDATE customers SET 
                    full_name = COALESCE($1, full_name),
                    cnic = COALESCE($2, cnic),
                    phone_primary = COALESCE($3, phone_primary),
                    phone_secondary = COALESCE($4, phone_secondary),
                    email = COALESCE($5, email),
                    address_line1 = COALESCE($6, address_line1),
                    address_line2 = COALESCE($7, address_line2),
                    city = COALESCE($8, city),
                    area = COALESCE($9, area),
                    postal_code = COALESCE($10, postal_code),
                    landmark = COALESCE($11, landmark),
                    customer_type = COALESCE($12, customer_type),
                    status = COALESCE($13, status),
                    credit_limit = COALESCE($14, credit_limit),
                    current_balance = COALESCE($15, current_balance),
                    notes = COALESCE($16, notes),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $17
                RETURNING *
            `;

            const values = [
                customerData.full_name,
                customerData.cnic,
                customerData.phone_primary,
                customerData.phone_secondary,
                customerData.email,
                customerData.address_line1,
                customerData.address_line2,
                customerData.city,
                customerData.area,
                customerData.postal_code,
                customerData.landmark,
                customerData.customer_type,
                customerData.status,
                customerData.credit_limit ? parseFloat(customerData.credit_limit) : null,
                customerData.current_balance ? parseFloat(customerData.current_balance) : null,
                customerData.notes,
                id
            ];

            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error('Customer not found');
            }

            return new Customer(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Delete customer (soft delete by setting status to inactive)
    static async delete(id) {
        try {
            // Check if customer has active orders
            const orderCheck = await pool.query(
                'SELECT COUNT(*) as count FROM orders WHERE customer_id = $1 AND order_status IN ($2, $3)',
                [id, 'confirmed', 'in-progress']
            );

            if (parseInt(orderCheck.rows[0].count) > 0) {
                throw new Error('Cannot delete customer with active orders');
            }

            const query = `
                UPDATE customers SET 
                    status = 'inactive',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const result = await pool.query(query, [id]);
            
            if (result.rows.length === 0) {
                throw new Error('Customer not found');
            }

            return new Customer(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Get customer statistics
    static async getStatistics() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_customers,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_customers,
                    COUNT(CASE WHEN customer_type = 'residential' THEN 1 END) as residential_customers,
                    COUNT(CASE WHEN customer_type = 'commercial' THEN 1 END) as commercial_customers,
                    COUNT(CASE WHEN customer_type = 'industrial' THEN 1 END) as industrial_customers,
                    AVG(current_balance) as average_balance,
                    SUM(current_balance) as total_balance
                FROM customers
            `;

            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Get customers with overdue payments
    static async getOverdueCustomers() {
        try {
            const query = `
                SELECT c.*, SUM(o.total_amount) as overdue_amount
                FROM customers c
                INNER JOIN orders o ON c.id = o.customer_id
                WHERE o.payment_status = 'overdue'
                GROUP BY c.id
                ORDER BY overdue_amount DESC
            `;

            const result = await pool.query(query);
            return result.rows.map(row => new Customer(row));
        } catch (error) {
            throw error;
        }
    }

    // Search customers by various criteria
    static async search(searchTerm, limit = 10) {
        try {
            const query = `
                SELECT *, 
                       CASE 
                           WHEN customer_code ILIKE $1 THEN 1
                           WHEN full_name ILIKE $1 THEN 2
                           WHEN phone_primary ILIKE $1 THEN 3
                           WHEN cnic ILIKE $1 THEN 4
                           ELSE 5
                       END as relevance
                FROM customers 
                WHERE (
                    customer_code ILIKE $1 OR 
                    full_name ILIKE $1 OR 
                    phone_primary ILIKE $1 OR 
                    cnic ILIKE $1 OR 
                    city ILIKE $1
                ) AND status = 'active'
                ORDER BY relevance, full_name
                LIMIT $2
            `;

            const result = await pool.query(query, [`%${searchTerm}%`, limit]);
            return result.rows.map(row => new Customer(row));
        } catch (error) {
            throw error;
        }
    }
}

module.exports = Customer;