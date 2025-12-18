// test-orders-websocket.js
const io = require('socket.io-client');
const readline = require('readline');

// Create readline interface for interactive testing
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Connect to WebSocket server
console.log('🔗 Connecting to WebSocket server...');
const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);

  showMenu();
});

// Listen for events
socket.on('order-tracking-info', data => {
  console.log('\n📦 Order Tracking Info Received:');
  console.log(JSON.stringify(data, null, 2));
  showMenu();
});

socket.on('rider-location-updated', data => {
  console.log('\n📍 Rider Location Updated:');
  console.log(`Order: ${data.orderId}, Rider: ${data.riderId}`);
  console.log(`Location: ${data.latitude}, ${data.longitude}`);
  showMenu();
});

socket.on('order-status-changed', data => {
  console.log('\n🔄 Order Status Changed:');
  console.log(`Order: ${data.orderId}, New Status: ${data.newStatus}`);
  showMenu();
});

socket.on('location-update-success', data => {
  console.log('\n✅ Location Update Successful');
  console.log(`Location ID: ${data.location_id}`);
  showMenu();
});

socket.on('status-update-success', data => {
  console.log('\n✅ Status Update Successful');
  console.log(`Order: ${data.orderId}, Status: ${data.newStatus}`);
  showMenu();
});

socket.on('error', error => {
  console.error('\n❌ WebSocket Error:', error);
  showMenu();
});

socket.on('tracking-error', error => {
  console.error('\n❌ Tracking Error:', error);
  showMenu();
});

socket.on('disconnect', () => {
  console.log('\n🔌 Disconnected from WebSocket server');
  process.exit(0);
});

// Interactive menu
function showMenu() {
  console.log('\n=================================');
  console.log('📡 ORDER SYSTEM WEBSOCKET TEST');
  console.log('=================================');
  console.log('1. Join user room');
  console.log('2. Track an order');
  console.log('3. Simulate rider location update');
  console.log('4. Simulate order status update');
  console.log('5. Exit');
  console.log('=================================');

  rl.question('\nSelect option (1-5): ', answer => {
    switch (answer.trim()) {
      case '1':
        rl.question('Enter user ID to join room: ', userId => {
          socket.emit('join-room', userId.trim());
          console.log(`✅ Joined room: user-${userId}`);
          showMenu();
        });
        break;

      case '2':
        rl.question('Enter order ID to track: ', orderId => {
          socket.emit('track-order', parseInt(orderId.trim()));
          console.log(`📡 Tracking order: ${orderId}`);
          showMenu();
        });
        break;

      case '3':
        rl.question('Enter rider ID: ', riderId => {
          rl.question('Enter order ID: ', orderId => {
            rl.question('Enter latitude: ', lat => {
              rl.question('Enter longitude: ', lng => {
                const locationData = {
                  riderId: riderId.trim(),
                  orderId: orderId.trim() ? parseInt(orderId.trim()) : null,
                  latitude: parseFloat(lat.trim()),
                  longitude: parseFloat(lng.trim()),
                  accuracy: 10.5,
                  speed: 30.0,
                  address_text: 'Test Street, Test City'
                };
                socket.emit('rider-location-update', locationData);
                console.log('📍 Sent location update');
                showMenu();
              });
            });
          });
        });
        break;

      case '4':
        rl.question('Enter order ID: ', orderId => {
          rl.question(
            'Enter new status (pending/accepted/assigned/picked_up/in_transit/delivered/approved_by_client/cancelled): ',
            status => {
              rl.question('Enter user ID: ', userId => {
                rl.question(
                  'Enter user type (patient/partner/rider/admin): ',
                  userType => {
                    const statusData = {
                      orderId: parseInt(orderId.trim()),
                      newStatus: status.trim(),
                      userId: userId.trim(),
                      userType: userType.trim(),
                      notes: 'Test status update'
                    };
                    socket.emit('order-status-update', statusData);
                    console.log('🔄 Sent status update');
                    showMenu();
                  }
                );
              });
            }
          );
        });
        break;

      case '5':
        console.log('👋 Goodbye!');
        socket.disconnect();
        rl.close();
        break;

      default:
        console.log('❌ Invalid option');
        showMenu();
    }
  });
}

// Handle Ctrl+C
rl.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  socket.disconnect();
  rl.close();
  process.exit(0);
});
