const moment = require('moment');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'AADataBase',
  password: 'admin',
  port: 5432,
});

async function checkTodayOrders() {
  try {
    const today = moment().format('YYYY-MM-DD');
    console.log('Today date:', today);
    
    // First, let's check all orders
    const allOrdersQuery = `
      SELECT o.*, c.full_name as customer_name
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `;
    const allResult = await pool.query(allOrdersQuery);
    console.log('\nLast 10 orders in database:');
    allResult.rows.forEach(order => {
      console.log(`ID: ${order.id}, Customer: ${order.customer_name}, Status: ${order.order_status}, Next Delivery: ${order.next_delivery_date}, Bottles Remaining: ${order.bottles_remaining}`);
    });
    
    // Now check orders due today
    const query = `
      SELECT o.*, c.full_name as customer_name, c.customer_code, c.phone_primary as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.next_delivery_date <= $1 
      AND o.order_status IN ('pending', 'confirmed', 'in-progress')
      AND o.bottles_remaining > 0
      ORDER BY o.priority_level DESC, o.next_delivery_date ASC
    `;
    
    const result = await pool.query(query, [today]);
    console.log('\nOrders due today:', result.rows.length);
    if (result.rows.length > 0) {
      result.rows.forEach(order => {
        console.log(`ID: ${order.id}, Customer: ${order.customer_name}, Next Delivery: ${order.next_delivery_date}, Status: ${order.order_status}, Bottles: ${order.bottles_remaining}`);
      });
    }
    
    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
}

checkTodayOrders();