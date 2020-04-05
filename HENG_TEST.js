const fetch = require('node-fetch');
const scheme = require('./api/scheme.json');
const colors = require('chalk');


const CONFIG = {
    SERVER: 'http://127.0.0.1:6969',
    REQUESTS: 10,

    FIELDS: {
        token: 'AkAwVLL7aun3RMdeUriqYfvbEU0O3SR1',
        //the same fields
    },

    DEFAULT_RS: 'samestringdefault'
};


const main = async () => {
    let fails = 0;
    let success = 0;
    let averages = [];
    for(let i = 0; i < scheme.methods.length; i++){
        let method = scheme.methods[i];
        let callName = method.method;
        let fields = constructFields(method.fields);
        let times = [];
        for(let r = 0; r < CONFIG.REQUESTS; r++){
            let start = new Date().getTime();
            await fetch(CONFIG.SERVER + '/' + callName + http_build(fields));
            let stop = new Date().getTime();
            times.push(stop-start);
        }
        let average = getAverageTime(times);
        if(average > 200 && (!method.away && average > 800)){
            console.info(colors.red(`[FALURE] Requests (${CONFIG.REQUESTS}k) to ${callName} are failed, and the average response time is ${average}ms`));
            fails++;
        }else{
            console.info(colors.green(`[PASSED] Requests (${CONFIG.REQUESTS}k) to ${callName} are completed, and the average response time is ${average}ms`));
            success++;
        }
        averages.push(average);
    }
    console.info("---------------------------------------------------");
    console.info(colors.bgGreen(success+"/"+scheme.methods.length + " is PASSED"));
    if(fails > 0){
        console.info(colors.bgRed(fails+"/"+scheme.methods.length + " is FAILS"));
    }
};


const getAverageTime = (array) => {
    let sum = 0;
    for(let key in array){
        sum += array[key];
    }

    return sum/array.length;
};

const constructFields = (fields) => {
    let data = {
        v: 1
    };
    for(let i in fields){
        let field = fields[i];
        data = {
            ...data,
            [field.field]: CONFIG.FIELDS[field.field] ? CONFIG.FIELDS[field.field] : CONFIG.DEFAULT_RS
        }
    }
    return data;
}

main();


function http_build(array){
    var build = '';
    for(let i in array){
        build += i + "=" + encodeURI(array[i]) + "&";
    }   
    return "?" + build.substr(0, build.length-1);
}