var express = require('express');
var mysql = require('mysql');
var randomcolor = require('randomcolor');
var request = require('request');

var router = express.Router();

var conn = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: 'PW',
	database : 'cal_db'
});
conn.connect();

router.use(function(req, res, next) {
	var session = req.session;

	// 로그인 되어 있지 않으면 첫 화면으로 보냄
	if(!session.username) res.redirect('/');

	next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('calendar', { title: 'Calendar' });
});

// Handlers for Tags
router.get('/tags', function(req, res, next) {
	//YYYY-MM-DD
	var session = req.session;
	var get_tags_sql = "SELECT name FROM Tags WHERE calendar_id=?";
	
	if(!session.calendar_id) {
		res.json({
			'status': 1,
			'msg': '세션의 정보가 올바르지 않습니다.'
		});
	} else {
		conn.query(get_tags_sql, [session.calendar_id], function(err, results) {
			if(err) throw err;
			if(results.length > 0) {
				res.json({
					'status': 0,
					'tags': results
				});
			} else {
				res.json({
					'status': 0,
					'tags': []
				});
			}
		});
	}
});

router.post('/tags', function(req, res, next) {
	var session = req.session;
	var query = "INSERT INTO Tags (name, color, calendar_id) VALUES (?, ?, ?)";
	var tag_color = randomcolor({
		luminosity: 'light',
		hue: 'random'
	});
	conn.query(query, [req.body.tag_name, tag_color, session.calendar_id], function(err, result) {
		if(err) {
			res.json({
				'status': 1,
				'message': 'Failed'
			});
			throw err;
		} else {
			res.json({
				'status': 0,
				'message': 'Success'
			});
		}
	});
});

// Handlers for Events
router.get('/events', function(req, res, next) {
	var session = req.session;
	var get_tags = 'SELECT tag_id, color, name FROM Tags WHERE calendar_id=?';
	var get_events = 'SELECT * FROM Events WHERE tag_id IN (';
	
	conn.query(get_tags, [session.calendar_id], function(err, results) {
		if(err) throw err;
		
		var tags = results.map(function(t) {return t.tag_id});
		var colors = results.map(function(t) {return t.color});
		var names = results.map(function(t) {return t.name});
		
		for(var i=0; i<tags.length; i++) {
			get_events += tags[i];
			if(i !== tags.length-1) get_events += ', ';
			else get_events += ')';
		}
		
		
		
		if(tags.length !== 0) {
			conn.query(get_events, function (err1, results1) {
				if (err1) throw err1;
				
				if (results1.length >= 0) {
					results1.forEach(function (r) {
						r.status = 0;
						r.color = colors[tags.indexOf(r.tag_id)];
						r.tag_name = names[tags.indexOf(r.tag_id)];
						
						return r;
					});
					res.json(results1);
				} else {
					results1.forEach(function (r) {
						r.set('status', 1);
						
						return r;
					});
					res.json(results1);
				}
			});
		} else {
			res.json([]);
		}
	
	});
});

router.post('/events', function(req, res, next) {
	var session = req.session;
	var get_tag_id_query = "SELECT tag_id FROM Tags WHERE BINARY name=? AND calendar_id=?";
	var insert_event_query = "INSERT INTO Events (title, start, end, tag_id) VALUES (?, ?, ?, ?)";
	
	conn.query(get_tag_id_query, [req.body.tag_name, session.calendar_id], function(err, results) {
		if(err) throw err;
		if(results.length == 1 && results[0].tag_id) {
			conn.query(insert_event_query,
				[req.body.event_name, req.body.start, req.body.end, results[0].tag_id], function(err1, result1) {
				if(err1) throw err1;
				if(result1) {
					res.json({
						'status': 0,
						'message': 'Success'
					});
				} else {
					res.json({
						'status': 1,
						'message': 'Fail'
					});
				}
			});
		} else {
			res.json({
				'status': 1,
				'message': 'Fail'
			});
		}
	});
});

router.put('/events/:event_id', function(req, res, next) {
	var session = req.session;
	var get_tag_id_query = "SELECT tag_id FROM Events WHERE event_id=?";
	var get_cal_id_query = "SELECT calendar_id FROM Tags WHERE tag_id IN ("+get_tag_id_query+")";
	var update_event_query = "UPDATE Events SET tag_id=?, title=? WHERE event_id=?";
	
	conn.query(get_cal_id_query, [req.params.event_id], function(err, results) {
		if(err) throw err;
		if(results.length == 1 && results[0].calendar_id == session.calendar_id) {
			conn.query(update_event_query,
				[req.body.tag_id, req.body.event_name, req.params.event_id], function(err1, result1) {
					if(err1) throw err1;
					if(result1) {
						res.json({
							'status': 0,
							'message': 'Success'
						});
					} else {
						res.json({
							'status': 1,
							'message': 'Fail'
						});
					}
				});
		} else {
			res.json({
				'status': 1,
				'message': 'Fail'
			});
		}
	});
});

router.delete('/events/:event_id', function(req, res, next) {
	var session = req.session;
	var get_tag_id_query = "SELECT tag_id FROM Events WHERE event_id=?";
	var get_cal_id_query = "SELECT calendar_id FROM Tags WHERE tag_id IN ("+get_tag_id_query+")";
	var delete_event_query = "DELETE FROM Events WHERE event_id=?";
	
	conn.query(get_cal_id_query, [req.params.event_id], function(err, results) {
		if(err) throw err;
		if(results.length == 1 && results[0].calendar_id == session.calendar_id) {
			conn.query(delete_event_query, [req.params.event_id], function(err1, result1) {
				if(err1) throw err1;
				if(result1) {
					res.json({
						'status': 0,
						'message': 'Success'
					});
				} else {
					res.json({
						'status': 1,
						'message': 'Fail'
					});
				}
			});
		} else {
			res.json({
				'status': 1,
				'message': 'Fail'
			});
		}
	});
	
});


module.exports = router;
