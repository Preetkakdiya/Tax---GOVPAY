require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    const User = require('./models/User');
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log("No admin found in the database.");
      process.exit();
    }
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash('admin123', salt);
    await admin.save();
    console.log("SUCCESS: Admin password successfully reset to 'admin123'");
    console.log("Admin Email:", admin.email);
    process.exit(0);
  })
  .catch(err => {
    console.error("Database connection Error:", err);
    process.exit(1);
  });
