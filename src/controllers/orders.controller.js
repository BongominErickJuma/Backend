const db = require('../config/db.config');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ============================================
// HELPER FUNCTIONS
// ============================================

// Helper to get user ID based on login type
const getUserId = (user, loginType) => {
  switch (loginType) {
    case 'patients':
      return user.patient_id;
    case 'partner_organizations':
      return user.partner_id;
    case 'delivery_riders':
      return user.rider_id;
    case 'super_administrators':
      return user.admin_id;
    default:
      return null;
  }
};

// Helper to validate order ownership/access
const validateOrderAccess = async (orderId, user, loginType) => {
  const userId = getUserId(user, loginType);

  let query = '';
  let params = [orderId];

  switch (loginType) {
    case 'patients':
      query = 'SELECT * FROM orders WHERE order_id = ? AND patient_id = ?';
      params.push(userId);
      break;
    case 'partner_organizations':
      query = 'SELECT * FROM orders WHERE order_id = ? AND partner_org_id = ?';
      params.push(userId);
      break;
    case 'delivery_riders':
      query =
        'SELECT * FROM orders WHERE order_id = ? AND delivery_rider_id = ?';
      params.push(userId);
      break;
    case 'super_administrators':
      query = 'SELECT * FROM orders WHERE order_id = ?';
      break;
    default:
      throw new AppError('Invalid user type', 403);
  }

  const [rows] = await db.query(query, params);
  if (rows.length === 0) {
    throw new AppError('Order not found or access denied', 404);
  }

  return rows[0];
};

// Helper to update order status with history tracking
const updateOrderStatus = async (
  orderId,
  newStatus,
  user,
  loginType,
  notes = ''
) => {
  const userId = getUserId(user, loginType);

  // Update order status using the stored procedure
  await db.query('CALL update_order_status(?, ?, ?, ?, ?)', [
    orderId,
    newStatus,
    userId,
    loginType,
    notes
  ]);

  // Get updated order
  const [updatedOrder] = await db.query(
    'SELECT * FROM orders WHERE order_id = ?',
    [orderId]
  );

  return updatedOrder[0];
};

// ============================================
// PATIENT CONTROLLERS
// ============================================

// Patient: Place new order
exports.placeOrder = catchAsync(async (req, res, next) => {
  const { items, ...orderData } = req.body;
  const patientId = req.user.patient_id;
  const loginType = req.loginType;

  if (loginType !== 'patients') {
    return next(new AppError('Only patients can place orders', 403));
  }

  // In placeOrder controller, add this after patient validation:
  const currentYear = new Date().getFullYear();

  // Get last order number for this year
  const [lastOrder] = await db.query(
    'SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY order_id DESC LIMIT 1',
    [`ORD-${currentYear}-%`]
  );

  let nextNumber = 1;
  if (lastOrder.length > 0) {
    const lastNum = lastOrder[0].order_number.split('-')[2];
    nextNumber = parseInt(lastNum) + 1;
  }

  orderData.order_number = `ORD-${currentYear}-${String(nextNumber).padStart(5, '0')}`;

  // Start transaction
  await db.query('START TRANSACTION');

  try {
    // 1. Create order
    orderData.patient_id = patientId;
    orderData.order_status = 'pending';
    orderData.patient_contact = req.user.phone || orderData.patient_contact;

    const [orderResult] = await db.query('INSERT INTO orders SET ?', [
      orderData
    ]);
    const orderId = orderResult.insertId;

    // 2. Add order items
    if (items && items.length > 0) {
      for (const item of items) {
        item.order_id = orderId;
        await db.query('INSERT INTO order_items SET ?', [item]);
      }
    }

    // 3. Add to status history
    await db.query(
      'INSERT INTO order_status_history (order_id, old_status, new_status, changed_by_user_id, changed_by_user_type, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [
        orderId,
        null,
        'pending',
        patientId,
        'patient',
        'Order placed by patient'
      ]
    );

    // 4. Get complete order with items
    const [orderRows] = await db.query(
      `SELECT o.*, 
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'item_name', oi.item_name,
                  'quantity', oi.item_quantity,
                  'unit_price', oi.unit_price,
                  'total_price', oi.total_price
                )
              ) as order_items
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.order_id = ?
       GROUP BY o.order_id`,
      [orderId]
    );

    await db.query('COMMIT');

    res.status(201).json({
      status: 'success',
      message: 'Order placed successfully',
      order: orderRows[0]
    });
  } catch (error) {
    await db.query('ROLLBACK');
    return next(error);
  }
});

// Patient: Get my orders
exports.getMyOrders = catchAsync(async (req, res, next) => {
  const patientId = req.user.patient_id;
  const loginType = req.loginType;

  if (loginType !== 'patients') {
    return next(new AppError('Access denied', 403));
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Filters
  const status = req.query.status;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;

  let query = `
    SELECT o.*, 
           po.facility_name as partner_organization_name,
           dr.username as delivery_rider_name,
           dr.phone_number as rider_contact,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) as item_count
    FROM orders o
    LEFT JOIN partner_organizations po ON o.partner_org_id = po.partner_id
    LEFT JOIN delivery_riders dr ON o.delivery_rider_id = dr.rider_id
    WHERE o.patient_id = ?
  `;

  let queryParams = [patientId];

  if (status) {
    query += ' AND o.order_status = ?';
    queryParams.push(status);
  }

  if (startDate) {
    query += ' AND DATE(o.created_at) >= ?';
    queryParams.push(startDate);
  }

  if (endDate) {
    query += ' AND DATE(o.created_at) <= ?';
    queryParams.push(endDate);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(limit, offset);

  const [orders] = await db.query(query, queryParams);

  // Get total count for pagination
  let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE patient_id = ?';
  let countParams = [patientId];

  if (status) {
    countQuery += ' AND order_status = ?';
    countParams.push(status);
  }

  const [countResult] = await db.query(countQuery, countParams);
  const total = countResult[0].total;

  res.status(200).json({
    status: 'success',
    results: orders.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    orders
  });
});

// Patient: Get single order
exports.getOrder = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;

  // Get order with items and location history
  const [orderWithDetails] = await db.query(
    `SELECT o.*,
            po.facility_name as partner_organization_name,
            po.facility_phone as partner_contact,
            dr.username as delivery_rider_name,
            dr.phone_number as rider_contact,
            (SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'item_id', oi.order_item_id,
                  'item_name', oi.item_name,
                  'description', oi.item_description,
                  'quantity', oi.item_quantity,
                  'unit_price', oi.unit_price,
                  'total_price', oi.total_price,
                  'dosage', oi.dosage,
                  'instructions', oi.instructions
                )
              ) FROM order_items oi WHERE oi.order_id = o.order_id
            ) as items,
            (SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'latitude', olu.latitude,
                  'longitude', olu.longitude,
                  'address', olu.address_text,
                  'timestamp', olu.created_at
                )
              ) FROM order_location_updates olu 
              WHERE olu.order_id = o.order_id 
              ORDER BY olu.created_at DESC
              LIMIT 50
            ) as location_history
     FROM orders o
     LEFT JOIN partner_organizations po ON o.partner_org_id = po.partner_id
     LEFT JOIN delivery_riders dr ON o.delivery_rider_id = dr.rider_id
     WHERE o.order_id = ?`,
    [orderId]
  );

  res.status(200).json({
    status: 'success',
    order: orderWithDetails[0]
  });
});

// Patient: Cancel order
exports.cancelOrder = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const user = req.user;
  const loginType = req.loginType;
  const { reason } = req.body;

  if (loginType === 'delivery_riders') {
    return next(new AppError('Delivery Riders cannot cancel orders', 403));
  }

  // Check if order belongs to patient
  const order = await validateOrderAccess(orderId, user, loginType);

  // Check if order can be cancelled (not in transit)
  if (
    order.order_status === 'in_transit' ||
    order.order_status === 'delivered' ||
    order.order_status === 'approved_by_client'
  ) {
    return next(new AppError('Order cannot be cancelled at this stage', 400));
  }

  // Update order status to cancelled
  const updatedOrder = await updateOrderStatus(
    orderId,
    'cancelled',
    user,
    loginType,
    reason || 'Cancelled by patient'
  );

  // Update cancellation details
  await db.query(
    'UPDATE orders SET cancelled_by = ?, cancellation_reason = ? WHERE order_id = ?',
    ['patient', reason, orderId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Order cancelled successfully',
    order: updatedOrder
  });
});

// Patient: Approve/Disapprove delivery
exports.approveDelivery = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const user = req.user;
  const loginType = req.loginType;

  const { approved, feedback } = req.body; // approved: true/false

  if (loginType !== 'patients') {
    return next(new AppError('Only patients can approve deliveries', 403));
  }

  // Check if order belongs to patient
  const order = await validateOrderAccess(orderId, user, loginType);

  // Check if order is delivered
  if (order.order_status !== 'delivered') {
    return next(new AppError('Order must be delivered before approval', 400));
  }

  const newStatus = approved ? 'approved_by_client' : 'delivered';
  const notes = approved
    ? 'Delivery approved by patient'
    : `Delivery not approved by patient. Feedback: ${feedback || 'No feedback provided'}`;

  const updatedOrder = await updateOrderStatus(
    orderId,
    newStatus,
    user,
    loginType,
    notes
  );

  res.status(200).json({
    status: 'success',
    message: approved
      ? 'Delivery approved successfully'
      : 'Delivery feedback recorded',
    order: updatedOrder
  });
});

// ============================================
// PARTNER CONTROLLERS
// ============================================

// Partner: Get client orders (partner's orders)
exports.getClientOrders = catchAsync(async (req, res, next) => {
  const partnerId = req.user.partner_id;
  const loginType = req.loginType;

  if (loginType !== 'partner_organizations') {
    return next(new AppError('Access denied', 403));
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  // Filters
  const status = req.query.status;
  const search = req.query.search;

  let query = `
    SELECT o.*,
           p.full_name as patient_first_name,
           p.phone_number as patient_phone,
           dr.username,
           dr.phone_number as rider_contact,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) as item_count
    FROM orders o
    JOIN patients p ON o.patient_id = p.patient_id
    LEFT JOIN delivery_riders dr ON o.delivery_rider_id = dr.rider_id
    WHERE o.partner_org_id = ?
  `;

  let queryParams = [partnerId];

  if (status) {
    query += ' AND o.order_status = ?';
    queryParams.push(status);
  }

  if (search) {
    query += ' AND (o.order_number LIKE ? OR p.full_name LIKE ?)';
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(limit, offset);

  const [orders] = await db.query(query, queryParams);

  // Get total count
  let countQuery =
    'SELECT COUNT(*) as total FROM orders WHERE partner_org_id = ?';
  let countParams = [partnerId];

  if (status) {
    countQuery += ' AND order_status = ?';
    countParams.push(status);
  }

  const [countResult] = await db.query(countQuery, countParams);
  const total = countResult[0].total;

  res.status(200).json({
    status: 'success',
    results: orders.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    orders
  });
});

// Partner: Accept order
exports.acceptOrder = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const user = req.user;
  const loginType = req.loginType;

  if (loginType !== 'partner_organizations') {
    return next(new AppError('Only partners can accept orders', 403));
  }

  // Check if order belongs to partner
  const order = await validateOrderAccess(orderId, user, loginType);

  // Check if order can be accepted
  if (order.order_status !== 'pending') {
    return next(new AppError('Order cannot be accepted at this stage', 400));
  }

  const updatedOrder = await updateOrderStatus(
    orderId,
    'accepted',
    user,
    loginType,
    'Order accepted by partner'
  );

  res.status(200).json({
    status: 'success',
    message: 'Order accepted successfully',
    order: updatedOrder
  });
});

// Partner: Assign order to delivery rider
exports.assignOrderForDelivery = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const { rider_id, assignment_method = 'manual' } = req.body;
  const user = req.user;
  const loginType = req.loginType;

  if (
    loginType !== 'partner_organizations' &&
    loginType !== 'super_administrators'
  ) {
    return next(new AppError('Only partners or admins can assign orders', 403));
  }

  // Check if order can be accessed
  const order = await validateOrderAccess(orderId, user, loginType);

  // Check if order can be assigned
  if (order.order_status !== 'accepted') {
    return next(new AppError('Order must be accepted before assignment', 400));
  }

  // Check if rider exists
  const [riderRows] = await db.query(
    'SELECT * FROM delivery_riders WHERE rider_id = ?',
    [rider_id]
  );

  if (riderRows.length === 0) {
    return next(new AppError('Delivery rider not found', 404));
  }

  // Start transaction
  await db.query('START TRANSACTION');

  try {
    // Update order with rider assignment
    await db.query(
      'UPDATE orders SET delivery_rider_id = ?, assigned_at = NOW() WHERE order_id = ?',
      [rider_id, orderId]
    );

    // Log assignment
    await db.query(
      `INSERT INTO order_assignment_log 
       (order_id, assigned_rider_id, assignment_method, assigned_by_user_id, assigned_by_user_type, assignment_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        rider_id,
        assignment_method,
        getUserId(user, loginType),
        loginType,
        'accepted'
      ]
    );

    // Update status to assigned
    const updatedOrder = await updateOrderStatus(
      orderId,
      'assigned',
      user,
      loginType,
      `Order assigned to rider ${riderRows[0].rider_name}`
    );

    await db.query('COMMIT');

    res.status(200).json({
      status: 'success',
      message: 'Order assigned successfully',
      order: updatedOrder
    });
  } catch (error) {
    await db.query('ROLLBACK');
    return next(error);
  }
});

// ============================================
// DELIVERY RIDER CONTROLLERS
// ============================================

// Rider: Update location (for real-time tracking)
exports.updateLocation = catchAsync(async (req, res, next) => {
  const riderId = req.user.rider_id;
  const loginType = req.loginType;
  const {
    latitude,
    longitude,
    order_id,
    accuracy,
    speed,
    address_text,
    update_type = 'in_transit'
  } = req.body;

  if (loginType !== 'delivery_riders') {
    return next(new AppError('Only delivery riders can update location', 403));
  }

  if (!latitude || !longitude) {
    return next(new AppError('Latitude and longitude are required', 400));
  }

  // If order_id is provided, verify rider is assigned to this order
  if (order_id) {
    const [orderRows] = await db.query(
      'SELECT * FROM orders WHERE order_id = ? AND delivery_rider_id = ?',
      [order_id, riderId]
    );

    if (orderRows.length === 0) {
      return next(new AppError('Order not found or not assigned to you', 404));
    }
  }

  // Insert location update
  const [result] = await db.query(
    `INSERT INTO order_location_updates 
     (order_id, rider_id, latitude, longitude, accuracy, speed, address_text, update_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      order_id || null,
      riderId,
      latitude,
      longitude,
      accuracy,
      speed,
      address_text,
      update_type
    ]
  );

  // Also update rider's current location in delivery_riders table
  await db.query(
    'UPDATE delivery_riders SET last_location_latitude = ?, last_location_longitude = ?, last_location_updated_at = NOW() WHERE rider_id = ?',
    [latitude, longitude, riderId]
  );

  res.status(200).json({
    status: 'success',
    message: 'Location updated successfully',
    location_id: result.insertId
  });
});

// Rider: Get my assigned orders
exports.getMyAssignedOrders = catchAsync(async (req, res, next) => {
  const riderId = req.user.rider_id;
  const loginType = req.loginType;

  if (loginType !== 'delivery_riders') {
    return next(new AppError('Access denied', 403));
  }

  const status = req.query.status;

  let query = `
    SELECT o.*,
           p.full_name as patient_first_name,
           p.phone_number as patient_contact,
           po.facility_name as pickup_location_name,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) as item_count
    FROM orders o
    JOIN patients p ON o.patient_id = p.patient_id
    JOIN partner_organizations po ON o.partner_org_id = po.partner_id
    WHERE o.delivery_rider_id = ?
  `;

  let queryParams = [riderId];

  if (status) {
    query += ' AND o.order_status = ?';
    queryParams.push(status);
  }

  query += ' ORDER BY o.created_at DESC';

  const [orders] = await db.query(query, queryParams);

  res.status(200).json({
    status: 'success',
    results: orders.length,
    orders
  });
});

// Rider: Update order status (pickup, in_transit, delivered)
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const { status } = req.body;
  const user = req.user;
  const loginType = req.loginType;

  if (loginType !== 'delivery_riders') {
    return next(
      new AppError('Only delivery riders can update order status', 403)
    );
  }

  // Validate status transition
  const validStatuses = ['picked_up', 'in_transit', 'delivered'];
  if (!validStatuses.includes(status)) {
    return next(new AppError('Invalid status update', 400));
  }

  // Check if rider is assigned to this order
  const order = await validateOrderAccess(orderId, user, loginType);

  // Validate status flow
  const statusFlow = ['assigned', 'picked_up', 'in_transit', 'delivered'];
  const currentIndex = statusFlow.indexOf(order.order_status);
  const newIndex = statusFlow.indexOf(status);

  if (newIndex <= currentIndex) {
    return next(new AppError('Invalid status transition', 400));
  }

  const updatedOrder = await updateOrderStatus(
    orderId,
    status,
    user,
    loginType,
    `Status updated to ${status} by delivery rider`
  );

  res.status(200).json({
    status: 'success',
    message: `Order status updated to ${status}`,
    order: updatedOrder
  });
});

// ============================================
// SUPER ADMIN CONTROLLERS
// ============================================

// Admin: Get all orders
exports.getAllOrders = catchAsync(async (req, res, next) => {
  const loginType = req.loginType;

  if (loginType !== 'super_administrators') {
    return next(new AppError('Access denied', 403));
  }

  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  // Filters
  const status = req.query.status;
  const partnerId = req.query.partner_id;
  const riderId = req.query.rider_id;
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const search = req.query.search;

  let query = `
    SELECT o.*,
           p.full_name as patient_name,
           p.phone_number as patient_phone,
           po.facility_name as partner_organization_name,
           dr.username as delivery_rider_name,
           dr.phone_number as rider_phone,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.order_id) as item_count
    FROM orders o
    JOIN patients p ON o.patient_id = p.patient_id
    JOIN partner_organizations po ON o.partner_org_id = po.partner_id
    LEFT JOIN delivery_riders dr ON o.delivery_rider_id = dr.rider_id
    WHERE 1=1
  `;

  let countQuery = `
    SELECT COUNT(*) as total
    FROM orders o
    WHERE 1=1
  `;

  let queryParams = [];
  let countParams = [];

  if (status) {
    query += ' AND o.order_status = ?';
    countQuery += ' AND o.order_status = ?';
    queryParams.push(status);
    countParams.push(status);
  }

  if (partnerId) {
    query += ' AND o.partner_org_id = ?';
    countQuery += ' AND o.partner_org_id = ?';
    queryParams.push(partnerId);
    countParams.push(partnerId);
  }

  if (riderId) {
    query += ' AND o.delivery_rider_id = ?';
    countQuery += ' AND o.delivery_rider_id = ?';
    queryParams.push(riderId);
    countParams.push(riderId);
  }

  if (startDate) {
    query += ' AND DATE(o.created_at) >= ?';
    countQuery += ' AND DATE(o.created_at) >= ?';
    queryParams.push(startDate);
    countParams.push(startDate);
  }

  if (endDate) {
    query += ' AND DATE(o.created_at) <= ?';
    countQuery += ' AND DATE(o.created_at) <= ?';
    queryParams.push(endDate);
    countParams.push(endDate);
  }

  if (search) {
    query += ' AND (o.order_number LIKE ? OR p.full_name LIKE ?)';
    countQuery += ' AND (o.order_number LIKE ? OR p.full_name LIKE ?)';
    const searchTerm = `%${search}%`;
    queryParams.push(searchTerm, searchTerm);
    countParams.push(searchTerm, searchTerm);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  queryParams.push(limit, offset);

  const [orders] = await db.query(query, queryParams);
  const [countResult] = await db.query(countQuery, countParams);
  const total = countResult[0].total;

  res.status(200).json({
    status: 'success',
    results: orders.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    orders
  });
});

// Admin: Get order details
exports.getOrderDetails = catchAsync(async (req, res, next) => {
  const orderId = req.params.id;
  const loginType = req.loginType;

  if (loginType !== 'super_administrators') {
    return next(new AppError('Access denied', 403));
  }

  const [orderDetails] = await db.query(
    `SELECT o.*,
           p.full_name as patient_name,
            p.email as patient_email,
            p.phone_number as patient_phone,
            po.facility_name as partner_organization_name,
            po.facility_phone as partner_contact,
            dr.username as delivery_rider_name,
            dr.phone_number as rider_contact,
            dr.email as rider_email,
            (SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'item_id', oi.order_item_id,
                  'item_name', oi.item_name,
                  'description', oi.item_description,
                  'quantity', oi.item_quantity,
                  'unit_price', oi.unit_price,
                  'total_price', oi.total_price,
                  'dosage', oi.dosage,
                  'instructions', oi.instructions
                )
              ) FROM order_items oi WHERE oi.order_id = o.order_id
            ) as items,
            (SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'latitude', olu.latitude,
                  'longitude', olu.longitude,
                  'address', olu.address_text,
                  'accuracy', olu.accuracy,
                  'speed', olu.speed,
                  'update_type', olu.update_type,
                  'timestamp', olu.created_at
                )
              ) FROM order_location_updates olu 
              WHERE olu.order_id = o.order_id 
              ORDER BY olu.created_at DESC
            ) as location_history,
            (SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'old_status', osh.old_status,
                  'new_status', osh.new_status,
                  'changed_by_type', osh.changed_by_user_type,
                  'notes', osh.notes,
                  'timestamp', osh.created_at
                )
              ) FROM order_status_history osh 
              WHERE osh.order_id = o.order_id 
              ORDER BY osh.created_at DESC
            ) as status_history
     FROM orders o
     JOIN patients p ON o.patient_id = p.patient_id
     JOIN partner_organizations po ON o.partner_org_id = po.partner_id
     LEFT JOIN delivery_riders dr ON o.delivery_rider_id = dr.rider_id
     WHERE o.order_id = ?`,
    [orderId]
  );

  if (orderDetails.length === 0) {
    return next(new AppError('Order not found', 404));
  }

  res.status(200).json({
    status: 'success',
    order: orderDetails[0]
  });
});

// ============================================
// WEBSOCKET HANDLERS
// ============================================

// Store connected clients (for real-time updates)
const connectedClients = new Map(); // userId -> socket

// Initialize WebSocket
exports.initializeWebSocket = io => {
  io.on('connection', socket => {
    console.log('New client connected:', socket.id);

    // Client joins their own room for private updates
    socket.on('join-room', userId => {
      socket.join(`user-${userId}`);
      connectedClients.set(userId, socket.id);
      console.log(`User ${userId} joined room user-${userId}`);
    });

    // Delivery rider updates location
    socket.on('rider-location-update', async data => {
      try {
        const {
          riderId,
          orderId,
          latitude,
          longitude,
          accuracy,
          speed,
          address_text
        } = data;

        // Validate data
        if (!riderId || !latitude || !longitude) {
          socket.emit('error', 'Missing required fields');
          return;
        }

        // Save to database (using same logic as updateLocation controller)
        const [result] = await db.query(
          `INSERT INTO order_location_updates 
           (order_id, delivery_rider_id, latitude, longitude, accuracy, speed, address_text, update_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId || null,
            riderId,
            latitude,
            longitude,
            accuracy,
            speed,
            address_text,
            'in_transit'
          ]
        );

        // Update rider's current location
        await db.query(
          'UPDATE delivery_riders SET last_location_latitude = ?, last_location_longitude = ?, last_location_updated_at = NOW() WHERE rider_id = ?',
          [latitude, longitude, riderId]
        );

        // Notify relevant parties
        if (orderId) {
          // Get order details
          const [orderRows] = await db.query(
            'SELECT patient_id, partner_org_id FROM orders WHERE order_id = ?',
            [orderId]
          );

          if (orderRows.length > 0) {
            const order = orderRows[0];

            // Notify patient
            io.to(`user-${order.patient_id}`).emit('rider-location-updated', {
              orderId,
              riderId,
              latitude,
              longitude,
              accuracy,
              speed,
              address_text,
              timestamp: new Date().toISOString()
            });

            // Notify partner
            io.to(`user-${order.partner_org_id}`).emit(
              'rider-location-updated',
              {
                orderId,
                riderId,
                latitude,
                longitude,
                accuracy,
                speed,
                address_text,
                timestamp: new Date().toISOString()
              }
            );
          }
        }

        socket.emit('location-update-success', {
          location_id: result.insertId
        });
      } catch (error) {
        console.error('WebSocket location update error:', error);
        socket.emit('error', 'Failed to update location');
      }
    });

    // Order status updates
    socket.on('order-status-update', async data => {
      try {
        const { orderId, newStatus, userId, userType, notes } = data;

        // Update order status
        await db.query('CALL update_order_status(?, ?, ?, ?, ?)', [
          orderId,
          newStatus,
          userId,
          userType,
          notes || ''
        ]);

        // Get order details to notify relevant parties
        const [orderRows] = await db.query(
          'SELECT patient_id, partner_org_id, delivery_rider_id FROM orders WHERE order_id = ?',
          [orderId]
        );

        if (orderRows.length > 0) {
          const order = orderRows[0];
          const recipients = [
            order.patient_id,
            order.partner_org_id,
            order.delivery_rider_id
          ].filter(id => id !== null);

          // Notify all relevant users
          recipients.forEach(userId => {
            io.to(`user-${userId}`).emit('order-status-changed', {
              orderId,
              newStatus,
              timestamp: new Date().toISOString(),
              updatedBy: { userId, userType }
            });
          });
        }

        socket.emit('status-update-success', { orderId, newStatus });
      } catch (error) {
        console.error('WebSocket status update error:', error);
        socket.emit('error', 'Failed to update order status');
      }
    });

    // Track order in real-time
    socket.on('track-order', async orderId => {
      try {
        // Get order details
        const [orderRows] = await db.query(
          `SELECT o.*, dr.username, dr.phone_number as rider_phone
           FROM orders o
           LEFT JOIN delivery_riders dr ON o.delivery_rider_id = dr.rider_id
           WHERE o.order_id = ?`,
          [orderId]
        );

        if (orderRows.length === 0) {
          socket.emit('tracking-error', 'Order not found');
          return;
        }

        const order = orderRows[0];

        // Get latest location if rider is assigned
        if (order.delivery_rider_id) {
          const [locationRows] = await db.query(
            `SELECT latitude, longitude, address_text, created_at
             FROM order_location_updates
             WHERE delivery_rider_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [order.delivery_rider_id]
          );

          order.current_location = locationRows[0] || null;
        }

        socket.emit('order-tracking-info', order);

        // Join order room for real-time updates
        socket.join(`order-${orderId}`);
      } catch (error) {
        console.error('WebSocket track order error:', error);
        socket.emit('error', 'Failed to track order');
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // Remove from connected clients
      for (const [userId, socketId] of connectedClients.entries()) {
        if (socketId === socket.id) {
          connectedClients.delete(userId);
          break;
        }
      }
    });
  });
};
