const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('[Database] MongoDB is already connected.');
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Database] ERROR: MONGODB_URI environment variable is not defined.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      autoIndex: true
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error(`[Database] MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected.');
      isConnected = false;
    });

  } catch (error) {
    console.error(`[Database] MongoDB Connection Failed: ${error.message}`);
    // Safe failure: allow server to report unhealthy if DB is down
    throw error;
  }
};

const checkDBStatus = () => {
  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const stateCode = mongoose.connection.readyState;
  return {
    state: states[stateCode] || 'unknown',
    connected: stateCode === 1
  };
};

module.exports = {
  connectDB,
  checkDBStatus
};
