/**
 * @file /app.js
 * @project ssds-rpc-service
 * @author Александр Краснов
 * @todo файл для настройки express
 */

const args = require('./modules/conf')();

var createError = require('http-errors');
var express = require('express');
var favicon = require('serve-favicon');
var pth = require('path');
var cors = require('cors');
var join = pth.join;
var cookieParser = require('cookie-parser');
var fileUpload = require('express-fileupload');
var rpc = require('./modules/rpc/index');
var exists = require('./routes/exists');
var file = require('./routes/file');
var home = require('./routes/home');

var vPath = args.virtual_dir_path;

var app = express();

app.use(favicon(__dirname + '/public/images/favicon.ico'));

// view engine setup
app.set('root', __dirname);
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('json spaces', 2);

app.use(cors());
app.use(fileUpload());

// view engine setup
app.set('views', join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json({
  limit: args.memory || args.max_file_size
}));

app.use(express.urlencoded({
  limit: args.memory || args.max_file_size,
  extended: true
}));

app.use(vPath, cookieParser());
app.use(vPath, express.static(pth.join(__dirname, 'public')));
app.use(vPath, express.static(pth.join(__dirname, args.sync_storage)));

app.use(vPath, home());

app.use(vPath, rpc('basic'));
app.use(vPath + 'connect', require('./modules/sync/routes/connect')('basic'));
app.use(vPath, require('./modules/sync/routes/sync')('basic'));

// проверка на доступность сервера
app.use(vPath + 'exists', exists('basic'));

app.use(vPath + 'file', file('basic'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = args.debug == true ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;