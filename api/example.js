const Example = {
    
    version: 2.0, //С какой версии API можно будет использовать этот API-модуль
    
    exampleMethod: function(res, params){
        let param = params.param; //Получаем параметр из спроса. Например при обращении на такой адрес: 127.0.0.1/expample.exampleMethod?param=1&v=2.0 - вернется еденица.
        res.send("You called param: " + param); //Отправляем ответ клиенту
    }
};

module.exports = Example;