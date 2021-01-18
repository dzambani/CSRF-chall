'use strict'
var _ = require('underscore');
var BigNumber = require('bignumber.js');
var bodyParser = require('body-parser');
var express = require('express');
var exphbr = require('express-handlebars');
var session = require('express-session');
var app = express();
const fs = require('fs');
const bcrypt = require('bcrypt');
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({
	secret: 'notasecretbutcyberissocool',
	resave: true,
	saveUninitialized: true,
	cookie: { secure: false, httpOnly: false }
}))

app.engine('html', exphbr({
	defaultLayout: 'main',
	extname: '.html'
}));

app.set('view engine', 'html');

var requireLogin = function(req, res, next) {

	if (!req.session.user) {
		return res.redirect('/login');
	}
	next();
};

app.get('/', requireLogin, function(req, res, next) {

	let baby_secrets = fs.readFileSync('./secret.json');
	let json_baby_secrets = JSON.parse(baby_secrets);
	let baby = json_baby_secrets.filter((x) => x.username === req.session.user.name);
	console.log(baby);

	res.render('home', {
		username: req.session.user.name,
		balance: baby[0].balance
	});
	console.log(req.session);
});

app.get('/login', function(req, res, next) {

	res.render('login');
});

app.get('/signup', function (req, res, next) {
	res.render('signup');
});

app.post('/login', function(req, res, next) {

	if (!req.body.username) {
		return res.status(400).send('Username is required.');
	}

	if (!req.body.password) {
		return res.status(400).send('Password is required.');
	}

	let baby_secrets = fs.readFileSync('./secret.json');
	let json_baby_secrets = JSON.parse(baby_secrets);
	let baby = json_baby_secrets.filter((x) => x.username === req.body.username);
	if (baby.length === 0) {
		return res.status(400).send('Invalid username.');
	}

	if (!bcrypt.compareSync(req.body.password, baby[0].password)) {
		return res.status(400).send('Invalid password.');
    }

	req.session.regenerate(function(error) {

		if (error) {
			console.log(error);
			return res.status(500).send('An unexpected error occurred.');
		}

		req.session.user = { name: req.body.username };
		res.redirect('/');
	});
});

app.post('/signup', function (req, res, next) {

	if (!req.body.username) {
		return res.status(400).send('Username is required.');
	}

	if (!req.body.password) {
		return res.status(400).send('Password is required.');
	}

	let baby_secrets = fs.readFileSync('./secret.json');
	let json_baby_secrets = JSON.parse(baby_secrets);
	let baby = json_baby_secrets.filter((x) => x.username === req.body.username);
	if (baby.length !== 0) {
		return res.status(400).send('That username has been taken, please pick a different one.');
	}

	let bigbossbaby = json_baby_secrets.filter((x) => x.username === "bigbossbaby");
	let new_baby_balance = bigbossbaby[0].balance.substr(0, 1044);

	let hash = bcrypt.hashSync(req.body.password, saltRounds);

	let new_baby = {
		username: req.body.username,
		password: hash,
		balance: new_baby_balance
	};

	json_baby_secrets.push(new_baby);
	let data = JSON.stringify(json_baby_secrets);
	fs.writeFileSync('./secret.json', data);

	req.session.regenerate(function (error) {

		if (error) {
			console.log(error);
			return res.status(500).send('An unexpected error occurred.');
		}

		req.session.user = { name: req.body.username };
		res.redirect('/');
	});
});

app.get('/logout', requireLogin, function (req, res, next) {
	req.session = null;
	res.redirect('/login');
});

app.post('/transfer', requireLogin, function(req, res, next) {

	transferFunds(
		req.body.to,
		req.session.user.name,
		req.body.start,
		req.body.amount,
		function(error) {

			if (error) {
				return res.status(400).send(error.message);
			}

			res.redirect('/');
		}
	);
});

app.post('/withdraw', requireLogin, function (req, res, next) {

	withdrawFunds(
		req.session.user.name,
		req.body.amount,
		function (error) {

			if (error) {
				return res.status(400).send(error.message);
			}

			res.redirect('/');
		}
	);
});

var transferFunds = function (to, from, start, amount, cb) {

	if (!to) {
		return cb(new Error('"To account" is required.'));
	}

	if (!from) {
		return cb(new Error('"From account" is required.'));
	}

	let baby_secrets = fs.readFileSync('./secret.json');
	let json_baby_secrets = JSON.parse(baby_secrets);
	let baby_to = json_baby_secrets.filter((x) => x.username === to);
	if (baby_to.length === 0) {
		return cb(new Error('Cannot transfer funds to non-existent account ("' + to + '").'));
	}

	let baby_from = json_baby_secrets.filter((x) => x.username === from);
	if (baby_from.length === 0) {
		return cb(new Error('Cannot transfer funds from non-existent account ("' + from + '").'));
	}

	if (!start) {
		return cb(new Error('"Start" is required.'));
	}

	if (!amount) {
		return cb(new Error('"Amount" is required.'));
	}

	if (to === from) {
		return cb(new Error('You can\'t send to yourself!'));
	}

	try {
		amount = new BigNumber(amount);
	} catch (error) {
		return cb(new Error('Amount must be a valid number.'));
	}

	try {
		start = new BigNumber(start);
	} catch (error) {
		return cb(new Error('Start must be a valid number.'));
	}

	if (!start.eq(1044)) {
		return cb(new Error('Uhohh, looks like baby started the secret ending in the wrong place. Try again.'));
	}

	if (amount.gt(new BigNumber(82))) {
		return cb(new Error('Oopsy daisy, baby tried asking for too many words. The secret ending isn\'t that long silly!'));
	}

	baby_secrets = fs.readFileSync('./secret.json');
	json_baby_secrets = JSON.parse(baby_secrets);

	for (var i = 0; i < json_baby_secrets.length; i++) {
		if (json_baby_secrets[i].username === to) {
			json_baby_secrets[i].balance = baby_to[0].balance.concat(baby_from[0].balance.substr(start, amount));
        }
    }

	console.log('Transferring funds (' + amount + ') starting from "'+ start +'" from "' + from + '" to "' + to + '"');

	let data = JSON.stringify(json_baby_secrets);
	fs.writeFileSync('./secret.json', data);

	console.log('New account balances:');

	cb();
};

var withdrawFunds = function (from, amount, cb) {

	if (!from) {
		return cb(new Error('"From account" is required.'));
	}

	let baby_secrets = fs.readFileSync('./secret.json');
	let json_baby_secrets = JSON.parse(baby_secrets);
	let baby_from = json_baby_secrets.filter((x) => x.username === from);
	if (baby_from.length === 0) {
		return cb(new Error('Cannot transfer funds from non-existent account ("' + from + '").'));
	}

	if (!amount) {
		return cb(new Error('"Amount" is required.'));
	}

	try {
		amount = new BigNumber(amount);
	} catch (error) {
		return cb(new Error('Amount must be a valid number.'));
	}

	var cur_balance = new BigNumber(baby_from[0].balance.length);
	console.log(cur_balance);


	if (amount.gt(cur_balance)) {
		return cb(new Error('Oops, baby is trying to withdraw more than they have. That\'s not how banks work silly baby.'));
	}

	console.log('Withdrawing funds (' + amount + ') from ' + from);


	baby_secrets = fs.readFileSync('./secret.json');
	json_baby_secrets = JSON.parse(baby_secrets);
	for (var i = 0; i < json_baby_secrets.length; i++) {
		if (json_baby_secrets[i].username === from) {
			json_baby_secrets[i].balance = baby_from[0].balance.substr(0, cur_balance - amount);
		}
	}

	let data = JSON.stringify(json_baby_secrets);
	fs.writeFileSync('./secret.json', data);

	console.log('New account balances:');
	cb();
};

app.listen(443, function() {
	console.log('Server started and listening at port 443');
});

