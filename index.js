var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ejs = require('ejs');
var express = require("express");
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(express.static(__dirname + '/public'));
var expressJsonApi = require('express-json-api');
var get = expressJsonApi.controllers.get;
var getList = expressJsonApi.controllers.getList;
var patch = expressJsonApi.controllers.patch;
var post = expressJsonApi.controllers.post;
var bodyParser = require('body-parser')
var cookieParser = require('cookie-parser')
var session = require('express-session');
var sess = session;

app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
})); 
app.set('trust proxy', 1) // trust first proxy 
app.use(session({
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true,
	cookie: { secure: true }
}))

http.listen(3000, function(){
  // console.log('listening on *:3000');
});

//connection a la DB

var mysql      = require('mysql');
var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : 'root',
	database : 'intra_db'
});

connection.connect();

app.get('/', function(req, res) {
	if(!sess.role){
		res.render('index');
	}
	else {
		res.render('user');
	}
});

app.get('/event', function(req, res) {
	if(sess.role == 'admin'){
		console.log(sess.role);
		res.render('event');
	}
	else {
		res.render('list_event', {
				rows : null,
			});
	}
});

app.get('/disconnect', function(req, res) {
	req.session = null;
	res.render('index');
});

app.get('/list_event', function(req, res) {
	if(sess.role == 'admin'){
		console.log(sess.id);
		var data = connection.query("SELECT * from event" , function(err, rows, fields) {
			console.log(rows[0]);
			res.render('list_event', {
				rows : rows,
			});
		});
	}
	if(sess.role == 'student'){
		connection.query("select * from event inner join participation on participation.event_id = event.id where participation.user_id = '"+sess.id+"'" , function(err, rows, fields) {
			console.log(rows);
			res.render('list_event', {
				rows : null,
				events : rows,
			});
		});
	}
});

app.post('/auth_user', function(req, res) {
	var login = req.body.login;
	var password = req.body.password;
	connection.query("SELECT email,password,role,id from user where email = '"+login+"' and password = '"+password+"'" , function(err, rows, fields) {
		if (!err){
			if (rows[0].role == "student"){
				sess.role = rows[0].role;
				sess.id = rows[0].id;
				connection.query("SELECT current_piments from user where email = '"+login+"'" , function(err, rows, fields) {
					credits = rows[0].current_piments / 60;
					res.render('user', { 
						rows: rows[0].current_piments,
						credits : credits,
					});

				});
			}
			if (rows[0].role == "admin"){
				sess.role = rows[0].role;
				sess.id = rows[0].id;
				connection.query("SELECT promo.* from promo inner join user on promo.user_id = user.id " , function(err, rows, fields) {
					res.render('admin', { 
						rows: rows,
					});
				});
			}
		}
		else{
			console.log('Error while performing Query.');
		}
	});
});

app.post('/create_event', function(req, res) {
	var name = req.body.name;
	var desc = req.body.desc;
	var numb = req.body.number;
	var date = req.body.date;

	connection.query("insert into event (name,description,piments,date) values ('"+name+"','"+desc+"','"+numb+"','"+date+"')" , function(err, rows, fields) {
		if (!err){
			res.render('event');
		}
		else{
			res.render('user');
		}
	});
});