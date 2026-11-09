const express = require('express');
const bookController = require('../controllers/bookController');

const router = express.Router();

router.post('/', bookController.createBook);
router.get('/', bookController.getBooks);

module.exports = router;
