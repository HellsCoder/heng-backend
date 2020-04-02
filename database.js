/*
    Создаем экземпляр оболочки
*/

const mysqlWrapper = require('./lib/mysqlWrapper')({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'dbname' 
});

module.exports = mysqlWrapper;