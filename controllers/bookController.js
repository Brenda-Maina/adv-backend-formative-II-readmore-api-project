const Book = require('../models/Book');
const Author = require('../models/Author');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../middleware/asyncHandler');

const BOOK_FIELDS = ['title', 'genre', 'price', 'publishedYear', 'author'];

// Only accept the fields we expect, so clients cannot set anything else.
const pickBookFields = (body = {}) =>
  Object.fromEntries(
    BOOK_FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
  );

// ===== Business rules: START =====
const assertBookIsAllowed = async (book) => {
  // 400: required fields present and types correct
  await book.validate();

  // 400: the author must really exist (no orphan books)
  const authorExists = await Author.exists({ _id: book.author });
  if (!authorExists) {
    throw new HttpError(400, `Author with id ${book.author} does not exist`);
  }
};
// ===== Business rules: END =====

exports.createBook = asyncHandler(async (req, res) => {
  const book = new Book(pickBookFields(req.body));
  await assertBookIsAllowed(book);
  await book.save();
  await book.populate('author');
  res.status(201).json(book);
});
