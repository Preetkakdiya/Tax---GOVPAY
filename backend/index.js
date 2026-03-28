const express = require('express');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const companyRoutes = require('./routes/companyRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/employee', employeeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GovPay+ API is running' });
});

// Serve frontend static files in production setup (e.g. Docker container)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected to GovPay DB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
global.io = io;

io.on('connection', (socket) => {
  console.log('Client connected to WebSockets:', socket.id);
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
