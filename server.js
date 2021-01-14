var _ = require('underscore');
var BigNumber = require('bignumber.js');
var bodyParser = require('body-parser');
var express = require('express');
var exphbr = require('express-handlebars');
var session = require('express-session');
var app = express();

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

	res.render('home', {
		username: req.session.user.name,
		balance: accounts[req.session.user.name] || 0
	});
});

var validLogins = [
	{ username: 'bob',password: 'password' }
];

var accounts = {
	'bob': 'if you give a mouse a cookie then the mouse will ask for a glass of milk \
when you give the mouse the milk he will ask you for a straw \
when the mouse is finished he will ask for a napkin \
the mouse will want to look in a mirror to see if he has a milk moustache \
when the mouse looks in the mirror the mouse will see his hair needs a trim \
after the mouse trims his hair the mouse will want a broom \
the mouse might sweep every room in the house \
the mouse then will want to take a nap you will have to find him a little box with a blanket and a pillow \
the mouse will make himself comfortable and ask you to read a story \
he will ask to see the picture and will want to draw \
the mouse will draw with crayons and paper \
when the picture is finished the mouse will want to sign his name with a pen \
the mouse will want to hang his picture on the refrigerator so the mouse will ask for tape \
the mouse will hang up his picture and look at it \
the mouse will remember that he is thirsty and ask for a glass of milk \
with the glass of milk he will want a cookie \
flag{but_not_of_the_edible_variety_if_you_know_what_i_mean_wink_wink_nudge_nudge}'
};

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

	var user = _.find(validLogins, function(login) {
		return login.username === req.body.username && login.password === req.body.password;
	});

	if (!user) {
		return res.status(400).send('Invalid username or password.');
	}

	req.session.regenerate(function(error) {

		if (error) {
			console.log(error);
			return res.status(500).send('An unexpected error occurred.');
		}

		req.session.user = { name: user.username };
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

	var user = _.find(validLogins, function (login) {
		return login.username === req.body.username;
	});

	if (user) {
		return res.status(400).send('That username has been taken, please pick a different one.');
	}

	var newLogin = { username: req.body.username, password: req.body.password };
	validLogins.push(newLogin);
	accounts[req.body.username] = accounts['bob'].substring(0, 1044);

	user = _.find(validLogins, function (login) {
		return login.username === req.body.username && login.password === req.body.password;
	});

	req.session.regenerate(function (error) {

		if (error) {
			console.log(error);
			return res.status(500).send('An unexpected error occurred.');
		}

		req.session.user = { name: user.username };
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

var transferFunds = function(to, from, start, amount, cb) {

	if (!to) {
		return cb(new Error('"To account" is required.'));
	}

	if (!from) {
		return cb(new Error('"From account" is required.'));
	}

	if (!accounts[to]) {
		return cb(new Error('Cannot transfer funds to non-existent account ("' + to + '").'));
	}

	if (!accounts[from]) {
		return cb(new Error('Cannot transfer funds from non-existent account ("' + from + '").'));
	}

	if (!start) {
		return cb(new Error('"Start" is required.'));
	}

	if (!amount) {
		return cb(new Error('"Amount" is required.'));
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

	if (amount.gt(BigNumber(82))) {
		return cb(new Error('Oopsy daisy, baby tried asking for too many words. The secret ending isn\'t that long silly!'));
    }

	console.log('Transferring funds (' + amount + ') starting from "'+ start +'" from "' + from + '" to "' + to + '"');

	accounts[to] = accounts[to].concat(accounts[from].substr(start, amount));

	console.log('New account balances:');
	console.log(JSON.stringify(accounts, null, 2));

	cb();
};

var withdrawFunds = function (from, amount, cb) {

	if (!from) {
		return cb(new Error('"From account" is required.'));
	}

	if (!accounts[from]) {
		return cb(new Error('Cannot withdraw funds from non-existent account ("' + from + '").'));
	}

	if (!amount) {
		return cb(new Error('"Amount" is required.'));
	}

	try {
		amount = new BigNumber(amount);
	} catch (error) {
		return cb(new Error('Amount must be a valid number.'));
	}

	var balance = new BigNumber(accounts[from].length);

	console.log(amount.gt(balance));

	if (amount.gt(balance)) {
		return cb(new Error('Oops, baby is trying to withdraw more than they have. That\'s not how banks work silly baby.'));
	}

	console.log('Withdrawing funds (' + amount + ') from ' + from);

	accounts[from] = accounts[from].substr(0, balance.minus(amount));

	console.log('New account balances:');
	console.log(JSON.stringify(accounts, null, 2));

	cb();
};

app.listen(3000, function() {
	console.log('Server started and listening at localhost:3000');
});

/*var evilApp = express();

evilApp.engine('html', exphbr({
	defaultLayout: 'main',
	extname: '.html'
}));

evilApp.set('view engine', 'html');
evilApp.use(express.static(__dirname + '/views'));

evilApp.get('/', function (req, res, next) {
	res.render('evil-examples');
});

evilApp.get('/malicious-form', function (req, res, next) {
	res.render('malicious-form');
});

evilApp.listen(3001, function () {
	console.log('"Evil" server started and listening at localhost:3001');
});*/

