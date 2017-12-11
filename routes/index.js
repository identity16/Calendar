var express = require('express');
var router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
	var session = req.session;

	if(!session.username)
		res.redirect('/users/login');
	else
		res.render('index', { title: 'Index', username: session.username });
});



module.exports = router;
