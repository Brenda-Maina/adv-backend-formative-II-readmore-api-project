const mongoose = require('mongoose');

const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Author country is required'],
      trim: true,
    },
    // Optional: a new author may not have a bio yet.
    bio: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Author', authorSchema);
