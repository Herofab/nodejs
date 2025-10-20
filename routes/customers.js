const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { isAuthenticated } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(isAuthenticated);

// Get all customers (with pagination and search)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || '';
        const status = req.query.status || '';
        const customerType = req.query.customer_type || '';

        const result = await Customer.getAll(page, limit, search, status, customerType);
        
        res.render('customers/index', {
            title: 'Customer Management',
            customers: result.customers,
            pagination: result.pagination,
            currentPage: page,
            search,
            status,
            customerType,
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        req.flash('error', 'Failed to load customers');
        res.redirect('/dashboard');
    }
});

// Show add customer form
router.get('/add', (req, res) => {
    res.render('customers/add-customer', {
        title: 'Add New Customer',
        currentUser: req.session.user
    });
});

// Create new customer
router.post('/add', async (req, res) => {
    const customerData = {
        full_name: req.body.full_name?.trim(),
        cnic: req.body.cnic?.trim(),
        phone_primary: req.body.phone_primary?.trim(),
        phone_secondary: req.body.phone_secondary?.trim(),
        email: req.body.email?.trim(),
        address_line1: req.body.address_line1?.trim(),
        address_line2: req.body.address_line2?.trim(),
        city: req.body.city?.trim(),
        area: req.body.area?.trim(),
        postal_code: req.body.postal_code?.trim(),
        landmark: req.body.landmark?.trim(),
        customer_type: req.body.customer_type,
        credit_limit: req.body.credit_limit,
        notes: req.body.notes?.trim()
    };

    try {
        const newCustomer = await Customer.create(customerData, req.user.id);
        req.flash('success', `Customer ${newCustomer.customer_code} created successfully`);
        res.redirect(`/customers/${newCustomer.id}`);
    } catch (error) {
        console.error('Error creating customer:', error);
        
        // Handle specific database constraint errors
        if (error.code === '23505' && error.constraint === 'customers_cnic_key') {
            req.flash('error', `A customer with CNIC ${customerData.cnic} already exists in the system.`);
        } else if (error.code === '23505' && error.constraint === 'customers_phone_primary_key') {
            req.flash('error', `A customer with phone number ${customerData.phone_primary} already exists in the system.`);
        } else if (error.code === '23505' && error.constraint === 'customers_email_key') {
            req.flash('error', `A customer with email ${customerData.email} already exists in the system.`);
        } else {
            req.flash('error', error.message || 'Failed to create customer');
        }
        
        res.redirect('/customers/add');
    }
});

// Show customer details
router.get('/:id', async (req, res) => {
    try {
        const customer = await Customer.getById(req.params.id);
        if (!customer) {
            req.flash('error', 'Customer not found');
            return res.redirect('/customers');
        }

        // Get customer's recent orders
        const ordersResult = await Order.getAll(1, 10, { customer_id: req.params.id });
        
        res.render('customers/detail', {
            title: `Customer Details - ${customer.full_name}`,
            customer,
            orders: ordersResult.orders,
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Error fetching customer details:', error);
        req.flash('error', 'Failed to load customer details');
        res.redirect('/customers');
    }
});

// Show edit customer form
router.get('/:id/edit', async (req, res) => {
    try {
        const customer = await Customer.getById(req.params.id);
        if (!customer) {
            req.flash('error', 'Customer not found');
            return res.redirect('/customers');
        }

        res.render('customers/edit-customer', {
            title: `Edit Customer - ${customer.full_name}`,
            customer,
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Error fetching customer for edit:', error);
        req.flash('error', 'Failed to load customer');
        res.redirect('/customers');
    }
});

// Update customer
router.post('/:id/edit', async (req, res) => {
    const customerData = {
        full_name: req.body.full_name?.trim(),
        cnic: req.body.cnic?.trim(),
        phone_primary: req.body.phone_primary?.trim(),
        phone_secondary: req.body.phone_secondary?.trim(),
        email: req.body.email?.trim(),
        address_line1: req.body.address_line1?.trim(),
        address_line2: req.body.address_line2?.trim(),
        city: req.body.city?.trim(),
        area: req.body.area?.trim(),
        postal_code: req.body.postal_code?.trim(),
        landmark: req.body.landmark?.trim(),
        customer_type: req.body.customer_type,
        status: req.body.status,
        credit_limit: req.body.credit_limit,
        current_balance: req.body.current_balance,
        notes: req.body.notes?.trim()
    };

    try {
        const updatedCustomer = await Customer.update(req.params.id, customerData, req.user.id);
        req.flash('success', 'Customer updated successfully');
        res.redirect(`/customers/${updatedCustomer.id}`);
    } catch (error) {
        console.error('Error updating customer:', error);
        
        // Handle specific database constraint errors
        if (error.code === '23505' && error.constraint === 'customers_cnic_key') {
            req.flash('error', `A customer with CNIC ${customerData.cnic} already exists in the system.`);
        } else if (error.code === '23505' && error.constraint === 'customers_phone_primary_key') {
            req.flash('error', `A customer with phone number ${customerData.phone_primary} already exists in the system.`);
        } else if (error.code === '23505' && error.constraint === 'customers_email_key') {
            req.flash('error', `A customer with email ${customerData.email} already exists in the system.`);
        } else {
            req.flash('error', error.message || 'Failed to update customer');
        }
        
        res.redirect(`/customers/${req.params.id}/edit`);
    }
});

// Delete customer (soft delete)
router.post('/:id/delete', async (req, res) => {
    try {
        await Customer.delete(req.params.id);
        req.flash('success', 'Customer deactivated successfully');
        res.redirect('/customers');
    } catch (error) {
        console.error('Error deleting customer:', error);
        req.flash('error', error.message || 'Failed to delete customer');
        res.redirect('/customers');
    }
});

// Search customers (AJAX endpoint)
router.get('/api/search', async (req, res) => {
    try {
        const searchTerm = req.query.q || '';
        const limit = parseInt(req.query.limit) || 10;
        
        if (!searchTerm) {
            return res.json([]);
        }

        const customers = await Customer.search(searchTerm, limit);
        res.json(customers.map(customer => ({
            id: customer.id,
            customer_code: customer.customer_code,
            full_name: customer.full_name,
            phone_primary: customer.phone_primary,
            city: customer.city,
            customer_type: customer.customer_type
        })));
    } catch (error) {
        console.error('Error searching customers:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// Get customer statistics (AJAX endpoint)
router.get('/api/stats', async (req, res) => {
    try {
        const stats = await Customer.getStatistics();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching customer statistics:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get overdue customers
router.get('/overdue', async (req, res) => {
    try {
        const overdueCustomers = await Customer.getOverdueCustomers();
        
        res.render('customers/overdue', {
            title: 'Overdue Customers',
            customers: overdueCustomers,
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Error fetching overdue customers:', error);
        req.flash('error', 'Failed to load overdue customers');
        res.redirect('/customers');
    }
});

// Update customer balance (AJAX endpoint)
router.post('/:id/balance', async (req, res) => {
    try {
        const { amount, operation } = req.body; // operation: 'add' or 'subtract'
        
        const customer = await Customer.getById(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        let newBalance = parseFloat(customer.current_balance) || 0;
        const changeAmount = parseFloat(amount) || 0;

        if (operation === 'add') {
            newBalance += changeAmount;
        } else if (operation === 'subtract') {
            newBalance -= changeAmount;
        } else {
            return res.status(400).json({ error: 'Invalid operation' });
        }

        const updatedCustomer = await Customer.update(req.params.id, { 
            current_balance: newBalance 
        }, req.user.id);

        res.json({
            success: true,
            new_balance: updatedCustomer.current_balance,
            message: `Balance ${operation === 'add' ? 'added' : 'deducted'} successfully`
        });
    } catch (error) {
        console.error('Error updating customer balance:', error);
        res.status(500).json({ error: 'Failed to update balance' });
    }
});

// Export customers to CSV
router.get('/export/csv', async (req, res) => {
    try {
        const result = await Customer.getAll(1, 1000); // Get up to 1000 customers for export
        const customers = result.customers;

        // Set CSV headers
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=customers_export.csv');

        // CSV header
        let csvContent = 'Customer Code,Full Name,CNIC,Phone Primary,Phone Secondary,Email,Address,City,Area,Customer Type,Status,Credit Limit,Current Balance,Registration Date\n';

        // CSV data
        customers.forEach(customer => {
            const fullAddress = [customer.address_line1, customer.address_line2].filter(Boolean).join(', ');
            csvContent += [
                customer.customer_code,
                `"${customer.full_name}"`,
                customer.cnic,
                customer.phone_primary,
                customer.phone_secondary || '',
                customer.email || '',
                `"${fullAddress}"`,
                customer.city,
                customer.area || '',
                customer.customer_type,
                customer.status,
                customer.credit_limit,
                customer.current_balance,
                new Date(customer.registration_date).toLocaleDateString()
            ].join(',') + '\n';
        });

        res.send(csvContent);
    } catch (error) {
        console.error('Error exporting customers:', error);
        req.flash('error', 'Failed to export customers');
        res.redirect('/customers');
    }
});

// Check for duplicate customer data (AJAX endpoint)
router.post('/api/check-duplicate', async (req, res) => {
    try {
        const { cnic, phone_primary, email, excludeId } = req.body;
        const duplicates = {
            cnic: false,
            phone_primary: false,
            email: false
        };

        // Import pool from Customer model
        const { pool } = require('../models/database');

        // Check CNIC
        if (cnic) {
            const cnicQuery = excludeId 
                ? 'SELECT id FROM customers WHERE cnic = $1 AND id != $2 AND status != \'inactive\''
                : 'SELECT id FROM customers WHERE cnic = $1 AND status != \'inactive\'';
            const cnicParams = excludeId ? [cnic, excludeId] : [cnic];
            const cnicResult = await pool.query(cnicQuery, cnicParams);
            duplicates.cnic = cnicResult.rows.length > 0;
        }

        // Check phone
        if (phone_primary) {
            const phoneQuery = excludeId 
                ? 'SELECT id FROM customers WHERE phone_primary = $1 AND id != $2 AND status != \'inactive\''
                : 'SELECT id FROM customers WHERE phone_primary = $1 AND status != \'inactive\'';
            const phoneParams = excludeId ? [phone_primary, excludeId] : [phone_primary];
            const phoneResult = await pool.query(phoneQuery, phoneParams);
            duplicates.phone_primary = phoneResult.rows.length > 0;
        }

        // Check email
        if (email) {
            const emailQuery = excludeId 
                ? 'SELECT id FROM customers WHERE email = $1 AND id != $2 AND status != \'inactive\''
                : 'SELECT id FROM customers WHERE email = $1 AND status != \'inactive\'';
            const emailParams = excludeId ? [email, excludeId] : [email];
            const emailResult = await pool.query(emailQuery, emailParams);
            duplicates.email = emailResult.rows.length > 0;
        }

        res.json(duplicates);
    } catch (error) {
        console.error('Error checking duplicates:', error);
        res.status(500).json({ error: 'Failed to check duplicates' });
    }
});

module.exports = router;
