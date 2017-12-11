var express = require('express');
var mysql = require('mysql');
var bcrypt = require('bcrypt');

var router = express.Router();

var conn = mysql.createConnection({
	host: 'localhost',
	user: 'root',
	password: '!dnjswns930',
	database : 'cal_db'
});
conn.connect();

// 로그인
router.get('/login', function(req, res, next) {
	if(req.session.username)
		res.redirect('/');
	else
		res.render('login', { title: 'Login' });
});

router.post('/login', function(req, res, next) {
	var session = req.session;
	var status, msg;

	if(req.session.username) {
		res.json({
			'status': 2,
			'message': '이미 로그인 되어 있습니다.'
		});
	}
	else {
		conn.query('SELECT * FROM Users WHERE BINARY username="'+req.body.username+'"', function(err, results, fields) {
			if(results.length == 0) {
				res.json({
					'status': 1,
					'message': '존재하지 않는 Username입니다.'
				});
			}
			else if(results.length == 1) {
				// Check PW
				bcrypt.compare(req.body.password, results[0]['password'], function(err, result) {
					if(result) {
						session.user_id = results[0].user_id;
						session.username = results[0].username;
						session.is_admin = results[0].is_admin;
						
						var cal_query = 'SELECT calendar_id FROM Calendars WHERE user_id=?';
						
						conn.query(cal_query, results[0].user_id, function(err, results1) {
							session.calendar_id = results1[0].calendar_id;
							res.json({
								'status': 0,
								'message': '로그인 성공!'
							});
						});
					}
					else {
						res.json({
							'status': 1,
							'message': '비밀번호가 일치하지 않습니다.'
						});
					}
					
				});
			}
			else {
				res.json({
					'status': 1,
					'message': '정상적이지 않은 정보입니다.'
				});
			}
		});

	}

});

// 회원가입
router.get('/register', function(req, res, next) {
	var session = req.session;

	if(session.username)
		res.redirect('/');
	else
		res.render('register', { title: 'register' });
});

router.post('/register', function(req, res, next) {
	var session = req.session;

	if(session.username) {
		res.json({
			'status': 2,
			'message': '로그아웃 한 후에 시도해 주세요'
		});
	}
	else if(!req.body.username || !req.body.password) {
		res.json({
			'status': 1,
			'message': 'Username 또는 PW 데이터를 받지 못했습니다.'
		});
	}
	else {
		var select_sql = 'SELECT * FROM Users WHERE BINARY username=?';

		conn.query(select_sql, [req.body.username], function(err, results, fields) {
			if (err) throw err;

			if (results.length > 0) {
				res.json({
					'status': 1,
					'message': '이미 존재하는 Username입니다.'
				});
			}
			else {

				// PW 암호화
				bcrypt.hash(req.body.password, 10, function (err, hash) {
					var insert_user_sql = 'INSERT INTO Users (username, password, is_admin) Values (?, ?, false)';
					var insert_cal_sql = 'INSERT INTO Calendars (user_id) VALUES (?)';

					// 유저 추가
					conn.query(insert_user_sql, [req.body.username, hash], function (err, result) {
						if (err) throw err;

						// 추가된 유저의 달력 추가
						conn.query(insert_cal_sql, [result.insertId], function (err, result2) {
							if (err) throw err;
						});
					});


				});




				res.json({
					'status': 0,
					'message': '회원가입을 성공적으로 마쳤습니다.'
				});

			}
		});
	}
});

// 로그아웃
router.get('/logout', function(req, res, next) {
	var session = req.session;
	if(session.username){
		req.session.destroy(function(err){
			if(err) {
				console.log(err);
			}
			else {
				res.redirect('/');
			}
		});
	}else{
		res.redirect('/');
	}
});

module.exports = router;
