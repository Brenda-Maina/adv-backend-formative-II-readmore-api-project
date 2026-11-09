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
const MIN_PUBLISHED_YEAR = 1450;

// 422: the data is well-formed but breaks a business rule the schema cannot express.
const assertBusinessRules = (book) => {
  const problems = [];
  const currentYear = new Date().getFullYear();

  if (!(book.price > 0)) {
    problems.push('price must be greater than 0');
  }

  if (!Number.isInteger(book.publishedYear)) {
    problems.push('publishedYear must be a whole number');
  } else if (book.publishedYear > currentYear) {
    problems.push(`publishedYear cannot be in the future (latest allowed year is ${currentYear})`);
  } else if (book.publishedYear < MIN_PUBLISHED_YEAR) {
    problems.push(`publishedYear cannot be before ${MIN_PUBLISHED_YEAR}`);
  }

  if (problems.length > 0) {
    throw new HttpError(422, problems.join('. '));
  }
};

// Order matters: shape (400) -> business rules (422) -> author exists (400) -> duplicate (409).
// The duplicate check needs a valid author, so it comes last.
const assertBookIsAllowed = async (book) => {
  // 400: required fields present and types correct
  await book.validate();

  // 422: price and publishedYear rules
  assertBusinessRules(book);

  // 400: the author must really exist (no orphan books)
  const authorExists = await Author.exists({ _id: book.author });
  if (!authorExists) {
    throw new HttpError(400, `Author with id ${book.author} does not exist`);
  }

  // 409: same author + same title, ignoring case. Excluding this book's own _id
  // lets an update keep its own title.
  const duplicate = await Book.findOne({
    author: book.author,
    title: book.title,
    _id: { $ne: book._id },
  }).collation({ locale: 'en', strength: 2 });

  if (duplicate) {
    throw new HttpError(409, `This author already has a book titled "${duplicate.title}"`);
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

// ===== List books: START =====
exports.getBooks = asyncHandler(async (req, res) => {
  const books = await Book.find().sort({ createdAt: 1 }).populate('author');
  res.json(books);
});
// ===== List books: END =====

const findBookOrFail = async (id) => {
  const book = await Book.findById(id);
  if (!book) {
    throw new HttpError(404, `Book not found with id ${id}`);
  }
  return book;
};

exports.getBookById = asyncHandler(async (req, res) => {
  const book = await findBookOrFail(req.params.id);
  await book.populate('author');
  res.json(book);
});

exports.updateBook = asyncHandler(async (req, res) => {
  const book = await findBookOrFail(req.params.id);
  book.set(pickBookFields(req.body));
  await assertBookIsAllowed(book);
  await book.save();
  await book.populate('author');
  res.json(book);
});

exports.deleteBook = asyncHandler(async (req, res) => {
  const book = await findBookOrFail(req.params.id);
  await book.deleteOne();
  res.json({ message: `Book "${book.title}" deleted` });
});
