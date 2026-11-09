const Author = require('../models/Author');
const Book = require('../models/Book');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../middleware/asyncHandler');

const AUTHOR_FIELDS = ['name', 'country', 'bio'];

// Only accept the fields we expect, so clients cannot set anything else.
const pickAuthorFields = (body = {}) =>
  Object.fromEntries(
    AUTHOR_FIELDS.filter((field) => body[field] !== undefined).map((field) => [field, body[field]])
  );

exports.createAuthor = asyncHandler(async (req, res) => {
  const author = await Author.create(pickAuthorFields(req.body));
  res.status(201).json(author);
});

exports.getAuthors = asyncHandler(async (req, res) => {
  const authors = await Author.find().sort({ name: 1 });
  res.json(authors);
});

const findAuthorOrFail = async (id) => {
  const author = await Author.findById(id);
  if (!author) {
    throw new HttpError(404, `Author not found with id ${id}`);
  }
  return author;
};

exports.getAuthorById = asyncHandler(async (req, res) => {
  const author = await findAuthorOrFail(req.params.id);
  res.json(author);
});

exports.updateAuthor = asyncHandler(async (req, res) => {
  const author = await findAuthorOrFail(req.params.id);
  author.set(pickAuthorFields(req.body));
  await author.save();
  res.json(author);
});

exports.getAuthorBooks = asyncHandler(async (req, res) => {
  const author = await findAuthorOrFail(req.params.id);
  const books = await Book.find({ author: author._id }).sort({ title: 1 });
  res.json(books);
});

// Delete policy (Option A): block the delete while the author still has books.
exports.deleteAuthor = asyncHandler(async (req, res) => {
  const author = await findAuthorOrFail(req.params.id);

  const bookCount = await Book.countDocuments({ author: author._id });
  if (bookCount > 0) {
    throw new HttpError(
      409,
      `Cannot delete "${author.name}" because they still have ${bookCount} book(s). Delete or move those books first.`
    );
  }

  await author.deleteOne();
  res.json({ message: `Author "${author.name}" deleted` });
});

exports.getAuthorStats = asyncHandler(async (req, res) => {
  const author = await findAuthorOrFail(req.params.id);

  // Sorting by price first lets $first / $last pick the cheapest / most expensive title.
  const [stats] = await Book.aggregate([
    { $match: { author: author._id } },
    { $sort: { price: 1, title: 1 } },
    {
      $group: {
        _id: '$author',
        bookCount: { $sum: 1 },
        averagePrice: { $avg: '$price' },
        cheapestBook: { $first: '$title' },
        mostExpensiveBook: { $last: '$title' },
      },
    },
  ]);

  // No books: the count is 0 and the price-based fields are null ("no value"),
  // because 0 would wrongly suggest the books are free.
  if (!stats) {
    return res.json({
      author: author.name,
      bookCount: 0,
      averagePrice: null,
      cheapestBook: null,
      mostExpensiveBook: null,
    });
  }

  res.json({
    author: author.name,
    bookCount: stats.bookCount,
    averagePrice: Math.round(stats.averagePrice * 100) / 100,
    cheapestBook: stats.cheapestBook,
    mostExpensiveBook: stats.mostExpensiveBook,
  });
});
