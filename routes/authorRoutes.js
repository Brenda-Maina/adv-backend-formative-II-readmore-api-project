const express = require('express');
const authorController = require('../controllers/authorController');

const router = express.Router();

router.post('/', authorController.createAuthor);
router.get('/', authorController.getAuthors);
router.get('/:id', authorController.getAuthorById);
router.put('/:id', authorController.updateAuthor);
router.get('/:id/books', authorController.getAuthorBooks);
router.delete('/:id', authorController.deleteAuthor);

module.exports = router;
