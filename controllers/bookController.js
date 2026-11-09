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
  const filter = buildBookFilter(req.query);
  const sort = buildBookSort(req.query);

  const books = await Book.find(filter).collation(CASE_INSENSITIVE).sort(sort).populate('author');
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

// ===== Filtering and sorting helpers: START =====
const SORTABLE_FIELDS = ['price', 'title', 'publishedYear'];
const CASE_INSENSITIVE = { locale: 'en', strength: 2 };

const isPresent = (value) => value !== undefined && value !== '';

// Stops characters like "." or "(" in user input from acting as regex symbols.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseNumber = (value, name) => {
  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new HttpError(400, `${name} must be a number`);
  }
  return number;
};

// Builds the MongoDB filter from whichever query params were actually sent.
const buildBookFilter = ({ genre, author, search, minPrice, maxPrice }) => {
  const filter = {};

  if (isPresent(genre)) {
    filter.genre = new RegExp(`^${escapeRegex(String(genre).trim())}$`, 'i');
  }

  if (isPresent(author)) {
    filter.author = author;
  }

  if (isPresent(search)) {
    filter.title = new RegExp(escapeRegex(String(search).trim()), 'i');
  }

  if (isPresent(minPrice) || isPresent(maxPrice)) {
    filter.price = {};
    if (isPresent(minPrice)) {
      filter.price.$gte = parseNumber(minPrice, 'minPrice');
    }
    if (isPresent(maxPrice)) {
      filter.price.$lte = parseNumber(maxPrice, 'maxPrice');
    }
    if (filter.price.$gte > filter.price.$lte) {
      throw new HttpError(400, 'minPrice cannot be greater than maxPrice');
    }
  }

  return filter;
};

const buildBookSort = ({ sort, order }) => {
  if (isPresent(sort) && !SORTABLE_FIELDS.includes(sort)) {
    throw new HttpError(400, `sort must be one of: ${SORTABLE_FIELDS.join(', ')}`);
  }
  if (isPresent(order) && !['asc', 'desc'].includes(order)) {
    throw new HttpError(400, 'order must be "asc" or "desc"');
  }

  const field = isPresent(sort) ? sort : 'createdAt';
  const direction = order === 'desc' ? -1 : 1;

  // _id is a tie-breaker so equal values always come back in a stable order.
  return { [field]: direction, _id: 1 };
};
// ===== Filtering and sorting helpers: END =====
