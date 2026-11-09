const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
    },
    genre: {
      type: String,
      required: [true, 'Book genre is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Book price is required'],
    },
    publishedYear: {
      type: Number,
      required: [true, 'Book publishedYear is required'],
    },
    // The link between the two collections: the id of the book's author.
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Author',
      required: [true, 'A book must have an author id'],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Book', bookSchema);
