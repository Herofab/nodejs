const { pool } = require('./database');

class Vehicle {
    constructor(data = {}) {
        this.id = data.id;
        this.license_plate = data.license_plate;
        this.vehicle_type = data.vehicle_type || 'truck'; // truck, van, motorcycle
        this.brand = data.brand;
        this.model = data.model;
        this.year = data.year;
        this.capacity = data.capacity || 0; // bottles capacity
        this.status = data.status || 'active'; // active, maintenance, inactive
        this.fuel_type = data.fuel_type || 'petrol'; // petrol, diesel, electric
        this.registration_date = data.registration_date;
        this.insurance_expiry = data.insurance_expiry;
        this.last_maintenance = data.last_maintenance;
        this.notes = data.notes;
        this.created_at = data.created_at;
        this.updated_at = data.updated_at;
        this.created_by = data.created_by;
    }

    // Create new vehicle
    static async create(vehicleData, userId) {
        try {
            const {
                license_plate,
                vehicle_type,
                brand,
                model,
                year,
                capacity,
                status,
                fuel_type,
                registration_date,
                insurance_expiry,
                last_maintenance,
                notes
            } = vehicleData;

            const query = `
                INSERT INTO vehicles (
                    license_plate, vehicle_type, brand, model, year, capacity,
                    status, fuel_type, registration_date, insurance_expiry,
                    last_maintenance, notes, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;

            const values = [
                license_plate,
                vehicle_type,
                brand,
                model,
                year,
                capacity,
                status,
                fuel_type,
                registration_date,
                insurance_expiry,
                last_maintenance,
                notes,
                userId
            ];

            const result = await pool.query(query, values);
            return new Vehicle(result.rows[0]);
        } catch (error) {
            throw error;
        }
    }

    // Get vehicle by ID
    static async findById(id) {
        try {
            const query = `
                SELECT v.*, u.email as created_by_email,
                       COUNT(d.id) as assigned_drivers
                FROM vehicles v
                LEFT JOIN users u ON v.created_by = u.id
                LEFT JOIN drivers d ON d.assigned_vehicle_id = v.id
                WHERE v.id = $1
                GROUP BY v.id, u.email
            `;
            
            const result = await pool.query(query, [id]);
            return result.rows.length > 0 ? new Vehicle(result.rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    // Get all vehicles with pagination and filtering
    static async findAll(filters = {}, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            let countWhereClause = 'WHERE 1=1';
            const params = [];
            let paramCount = 1;

            // Search filter
            if (filters.search) {
                whereClause += ` AND (v.license_plate ILIKE $${paramCount} OR v.brand ILIKE $${paramCount} OR v.model ILIKE $${paramCount})`;
                countWhereClause += ` AND (license_plate ILIKE $${paramCount} OR brand ILIKE $${paramCount} OR model ILIKE $${paramCount})`;
                params.push(`%${filters.search}%`);
                paramCount++;
            }

            // Status filter
            if (filters.status) {
                whereClause += ` AND v.status = $${paramCount}`;
                countWhereClause += ` AND status = $${paramCount}`;
                params.push(filters.status);
                paramCount++;
            }

            // Vehicle type filter
            if (filters.vehicle_type) {
                whereClause += ` AND v.vehicle_type = $${paramCount}`;
                countWhereClause += ` AND vehicle_type = $${paramCount}`;
                params.push(filters.vehicle_type);
                paramCount++;
            }

            // Get vehicles
            const query = `
                SELECT v.*, u.email as created_by_email,
                       COUNT(d.id) as assigned_drivers
                FROM vehicles v
                LEFT JOIN users u ON v.created_by = u.id
                LEFT JOIN drivers d ON d.assigned_vehicle_id = v.id
                ${whereClause}
                GROUP BY v.id, u.email
                ORDER BY v.created_at DESC
                LIMIT $${paramCount} OFFSET $${paramCount + 1}
            `;

            const result = await pool.query(query, [...params, limit, offset]);

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM vehicles ${countWhereClause}`;
            const countResult = await pool.query(countQuery, params.slice(0, paramCount - 1));
            const total = parseInt(countResult.rows[0].total);

            return {
                vehicles: result.rows.map(row => new Vehicle(row)),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw error;
        }
    }

    // Update vehicle
    static async update(id, updateData) {
        try {
            const allowedFields = [
                'license_plate', 'vehicle_type', 'brand', 'model', 'year',
                'capacity', 'status', 'fuel_type', 'registration_date',
                'insurance_expiry', 'last_maintenance', 'notes'
            ];

            const updateFields = [];
            const values = [];
            let paramCount = 1;

            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    updateFields.push(`${key} = $${paramCount}`);
                    values.push(value);
                    paramCount++;
                }
            }

            if (updateFields.length === 0) {
                throw new Error('No valid fields to update');
            }

            updateFields.push(`updated_at = NOW()`);
            values.push(id);

            const query = `
                UPDATE vehicles 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount}
                RETURNING *
            `;

            const result = await pool.query(query, values);
            return result.rows.length > 0 ? new Vehicle(result.rows[0]) : null;
        } catch (error) {
            throw error;
        }
    }

    // Delete vehicle (soft delete by setting status to inactive)
    static async delete(id) {
        try {
            // Check if vehicle has assigned drivers
            const driversCheck = await pool.query(
                'SELECT COUNT(*) as count FROM drivers WHERE assigned_vehicle_id = $1 AND status = $2',
                [id, 'active']
            );

            if (parseInt(driversCheck.rows[0].count) > 0) {
                throw new Error('Cannot delete vehicle with active assigned drivers');
            }

            // Soft delete
            const query = `
                UPDATE vehicles 
                SET status = 'inactive',
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
            `;

            const result = await pool.query(query, [id]);
            return result.rows.length > 0;
        } catch (error) {
            throw error;
        }
    }

    // Get available vehicles (not assigned to any driver)
    static async getAvailable() {
        try {
            const query = `
                SELECT v.* FROM vehicles v
                LEFT JOIN drivers d ON d.assigned_vehicle_id = v.id AND d.status = 'active'
                WHERE v.status = 'active' AND d.id IS NULL
                ORDER BY v.license_plate
            `;

            const result = await pool.query(query);
            return result.rows.map(row => new Vehicle(row));
        } catch (error) {
            throw error;
        }
    }

    // Get vehicle statistics
    static async getStatistics() {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_vehicles,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_vehicles,
                    COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_vehicles,
                    COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_vehicles,
                    AVG(capacity) as avg_capacity,
                    SUM(capacity) as total_capacity
                FROM vehicles
            `;

            const result = await pool.query(query);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    // Check if license plate exists
    static async checkLicensePlateExists(licensePlate, excludeId = null) {
        try {
            let query = 'SELECT id FROM vehicles WHERE license_plate = $1';
            const params = [licensePlate];

            if (excludeId) {
                query += ' AND id != $2';
                params.push(excludeId);
            }

            const result = await pool.query(query, params);
            return result.rows.length > 0;
        } catch (error) {
            throw error;
        }
    }

    // Get vehicles requiring maintenance (insurance expiry, last maintenance)
    static async getMaintenanceAlerts() {
        try {
            const query = `
                SELECT v.*, 
                       CASE 
                           WHEN insurance_expiry <= CURRENT_DATE + INTERVAL '30 days' THEN 'insurance_expiry'
                           WHEN last_maintenance <= CURRENT_DATE - INTERVAL '90 days' THEN 'maintenance_due'
                           ELSE 'none'
                       END as alert_type
                FROM vehicles v
                WHERE v.status = 'active' 
                AND (
                    insurance_expiry <= CURRENT_DATE + INTERVAL '30 days'
                    OR last_maintenance <= CURRENT_DATE - INTERVAL '90 days'
                )
                ORDER BY v.insurance_expiry, v.last_maintenance
            `;

            const result = await pool.query(query);
            return result.rows.map(row => new Vehicle(row));
        } catch (error) {
            throw error;
        }
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            license_plate: this.license_plate,
            vehicle_type: this.vehicle_type,
            brand: this.brand,
            model: this.model,
            year: this.year,
            capacity: this.capacity,
            status: this.status,
            fuel_type: this.fuel_type,
            registration_date: this.registration_date,
            insurance_expiry: this.insurance_expiry,
            last_maintenance: this.last_maintenance,
            notes: this.notes,
            created_at: this.created_at,
            updated_at: this.updated_at,
            created_by: this.created_by
        };
    }
}

module.exports = Vehicle;