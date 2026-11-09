const express = require('express');
const authorController = require('../controllers/authorController');

const router = express.Router();

router.post('/', authorController.createAuthor);
router.get('/', authorController.getAuthors);
router.get('/:id', authorController.getAuthorById);
router.put('/:id', authorController.updateAuthor);

module.exports = router;
