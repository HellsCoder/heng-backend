const mysql = require('mysql2/promise');

/*
    Возвращаемые значения методов:
    0 - Все нормально
    1 - Нарушена уникальность поля
    2 - Ошибка валидации
*/


let _id = (length) => {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const mysqlWrapper = (data) => {

    const Types = {
        FLOAT: 0,
        NUMERIC : 1,
        DECIMAL: 2
    };

    let pool = mysql.createPool(data);

    let sendQuery = async (query, ...args) => {
        //console.info(query);
        return await pool.query(query, args);
    };

    class Schema {

        constructor(table, data){
            this.data = data;
            this.table = table;
        }

        compile(){
            let AUTO_INCREMENT;
            let increment = '';
            let data = [];
            for(let key in this.data){
                let object = this.data[key];
                let type = object.type;
                let length = object.length;
                if(!length && object.type !== Types.DECIMAL){
                    console.info("WARNING! for " + key + " length has setted to default value is 256 bytes");
                    length = 256;
                }
                let increment = '';
                if(object.AUTO_INCREMENT){
                    AUTO_INCREMENT = key;
                    increment = 'AUTO_INCREMENT';
                }

                if(type === String){
                    type = 'text';
                }
                if(type === Number){
                    type = 'int';
                }
                if(type === Types.FLOAT){
                    type = 'float';
                }
                if(type === Types.NUMERIC){
                    type = 'numeric';
                }
                if(type === Types.DECIMAL){
                    type = 'decimal';
                    length = '15,2';
                }
                if((type instanceof Object) && type !== String && type !== Number){
                    length = 32;
                    type = 'varchar';
                }    

                data.push('`'+key+'` ' + type + '('+length+') NOT NULL ' + increment);
            }
            data.push('`_id` varchar(32) NOT NULL');
            if(AUTO_INCREMENT){
                data.push('PRIMARY KEY (`'+AUTO_INCREMENT+'`)');
                increment = 'AUTO_INCREMENT = 1';
            }
    
            return `CREATE TABLE IF NOT EXISTS \``+this.table+`\` (
                  `+data.join(',')+`
           ) ENGINE=MyISAM DEFAULT CHARSET=utf8 `+increment+` ;`;
        }
    
    }

    let model = (schema) => {
        sendQuery(schema.compile());

        class ModelClass {
            constructor(data){
                if(data){
                    this.data = data;
                }
                this.schema = schema;
                this.id = null;
                this.cacheFields = {};
            }

            async save(){

                if(!this.data){
                    throw "SchemeCompileException: data cannot be empty before save";
                }
                
                if(this.id){
                    return;
                }
                for(let key in this.schema.data){
                    if(!this.data[key] && this.data[key] !== 0 && this.data[key] !== false && this.data[key] !== ""){
                        if((!this.schema.data[key].default && this.schema.data[key].default !== 0 && this.schema.data[key].default !== false && this.schema.data[key].default !== "") && !this.schema.data[key].AUTO_INCREMENT){
                            console.warn("Failed to save scheme field " + key + " has no given and not setted default value"); 
                            return 2;
                        }
                        if(!this.schema.data[key].AUTO_INCREMENT){
                            this.data[key] = this.schema.data[key].default;
                        }
                    }
                }

                let keys = [];
                let values = [];

                let id = _id(32);

                let uniques = [];

                for(let key in this.data){
                    let object = this.data[key];
                    if(!object && object !== false && object !== 0 && object !== ""){
                        throw "SchemeCompileException: key " + key + " has undefined value";
                    }
                    if(!this.schema.data[key]){
                        throw "SchemeCompileExeption: key " + key + " has no exists in scheme";
                    }
                    if(object.length > this.schema.data[key].length){
                        throw "SchemeCompileException: key " + key + " gived " + object.length + " than maximum allowed " + this.schema.data[key].length;
                    }
                    if((this.schema.data[key].type instanceof Object) && this.schema.data[key].type !== String && this.schema.data[key].type !== Number){
                        /*
                            Если в данных конструктора существует что-то кроме обычных строк и чисел(например пользовательские объекты User, Group etc..)
                        */
                        if(object.id){
                            object = object.id;
                        }
                    }
                    if(this.schema.data[key].prepare){
                        object = this.schema.data[key].prepare(object);
                        if(object === -1){
                            return 2;
                        }
                    }
                    if(this.schema.data[key].unique){
                        uniques.push("`"+key+"` = "+pool.escape(object));
                    }
                    keys.push("`"+key+"`");
                    values.push(pool.escape(object));
                }

                keys.push("`_id`");
                values.push("'"+id+"'");

                if(uniques.length > 0){
                    let uniqueQuery = 'SELECT _id FROM `'+this.schema.table+'` WHERE ' + uniques.join(' OR ');
                    const [rows, fields] = await sendQuery(uniqueQuery);
                    if(rows.length > 0){
                        return 1;
                    }
                }

                let query = 'INSERT INTO `'+this.schema.table+'` ('+keys.join(',')+') VALUES ('+values.join(',')+')';

                await sendQuery(query);

                this.id = id;
                return 0;
            }

            async findBy(data){
                let findKeys = [];
                for(let key in data){
                    let object = data[key];
                    let isCustomObject = false;
                    if(!this.schema.data[key]){
                        throw "SchemeInteractException: field " + key + " cannot find in scheme";
                    }
                    if((this.schema.data[key].type instanceof Object) && this.schema.data[key].type !== String && this.schema.data[key].type !== Number){
                        object = object.id;
                        isCustomObject = true;
                    }
                    if(this.schema.data[key].prepare && !isCustomObject){
                        object = this.schema.data[key].prepare(object);
                        if(object === -1){
                            return 2;
                        }
                    }
                    findKeys.push("`"+key+"` = "+pool.escape(object));
                }
                let query = 'SELECT * FROM `'+this.schema.table+'` WHERE ' + findKeys.join(" AND ");

                const [rows, fields] = await sendQuery(query);
                if(rows.length > 0){
                    this.id = rows[0]._id;
                }
                this.cacheFields = rows[0];
                return 0;
            }

            async get(data){
                if(!this.id){
                    throw "SchemeInteractException: before using get() this object need id";
                }
                let cachedRows = {};
                for(let key in data){
                    let obj = data[key];
                    if(this.cacheFields[obj] || this.cacheFields[obj] === false || this.cacheFields[obj] === 0){
                        cachedRows[obj] = this.cacheFields[obj];
                    }
                }
                if(cachedRows.hasOwnProperty(data[0])){
                    /*
                        Если в кеше есть что-то - возвращаем
                    */
                    return cachedRows;
                }
                let query = 'SELECT ' + data.join(',') + ' FROM `'+this.schema.table+'` WHERE `_id` = \''+this.id+'\'';
                const [rows, fields] = await sendQuery(query);
                if(rows.length <= 0){
                    return false;
                }
                return rows[0];
            }

            /*
                Получение всех строк в БД и перегонка их в объекты
                limit - ограничение
                {
                    limit: 10,
                    offset: 0
                }
                order - выборка по ключу
                {
                    key: 'user_id',
                    type: 'ASC'
                }
            */
            async getAllObjects(data, limit, order){
                let objects = [];

                let statement = '';

                let getKeys = (data) => {
                    let arr  = [];
                    for(let key in data){
                        let object = data[key];
                        if((this.schema.data[key].type instanceof Object) && this.schema.data[key].type !== String && this.schema.data[key].type !== Number){
                            arr.push("`"+key+"` = " + pool.escape(object.id));
                        }else{
                            arr.push("`"+key+"` = " + pool.escape(object));
                        }
                    }
                    return arr; 
                }

                let or = false;
                for(let key in data){
                    if(!(data[key] instanceof Object) || (data[key]['schema'])){
                        let keys = getKeys(data).join(" AND ");
                        if(!statement.includes(keys)){
                            //если таких ключей в стейте еще нет
                            statement += keys;
                        } 
                    }else{
                        or = true;
                        statement += getKeys(data[key]) + " OR ";
                    }
                }
                if(or){
                    statement = statement.substr(0, statement.length-4).split(",").join(" AND ");
                }



                let query;
                if(statement.length > 0){
                    query = 'SELECT * FROM `'+this.schema.table+'` WHERE ' + statement;
                }else{
                    query = 'SELECT * FROM `'+this.schema.table+'`';
                }

                if(order){
                    query += ' ORDER BY `' + order.key + '` ' + order.type;
                }

                if(limit){
                    query += ' LIMIT ' + limit.limit;
                    if(limit.offset){
                        query += ' OFFSET ' + limit.offset;
                    }
                }

                const [rows, fields] = await sendQuery(query);
                for(let key in rows){
                    let row = rows[key];
                    let _id = row._id;
                    let classCall = Object.create(this);
                    classCall.id = _id;
                    classCall.cacheFields = row;
                    objects.push(classCall);
                }
                return objects;
            }

            async getObject(object){
                if(!this.id){
                    throw "SchemeInteractException: before using getObject() this object need id";
                }
                let query = 'SELECT ' + object + ' FROM `' + this.schema.table + '` WHERE `_id` = \''+this.id+'\'';

                const [rows, fields] = await sendQuery(query);

                if((this.schema.data[object].type instanceof Object) && this.schema.data[object].type !== String && this.schema.data[object].type !== Number){
                    /*
                        Если в данных конструктора существует что-то кроме обычных строк и чисел(например пользовательские объекты User, Group etc..)
                    */
                    let CallClass = this.schema.data[object].type;
                    let callFunc = new CallClass();
                    callFunc.id = rows[0][object];
                    return callFunc;
                }
                return null;
            }

            async delete(){
                if(!this.id){
                    throw "SchemeInteractException: before using delete() this object need id";
                }
                let query = 'DELETE FROM `'+this.schema.table+'` WHERE `_id` = \''+this.id+'\'';
                await sendQuery(query);
            }

            async update(data){
                if(!this.id){
                    throw "SchemeInteractException: before using update() this object need id";
                }

                let updateKeys = [];
                for(let key in data){
                    let object = data[key];
                    if(!this.schema.data[key]){
                        throw "SchemeInteractException: field " + key + " cannot find in scheme";
                    }
                    if(this.schema.data[key].prepare){
                        object = this.schema.data[key].prepare(object);
                        if(object === -1){
                            return 2;
                        }
                    }
                    if(this.cacheFields[key]){
                        this.cacheFields[key] = object;
                    }
                    updateKeys.push("`"+key+"` = " + pool.escape(object));
                }
                let query = 'UPDATE `'+this.schema.table+'` SET ' + updateKeys.join(',') + ' WHERE `_id` = \''+this.id+'\'';
                await sendQuery(query); 
                return 0;
            }
        }

        return ModelClass;

    }

    return {Schema, model, Types};
}


module.exports = mysqlWrapper;
