const express = require('express');
const mysql   = require('mysql');
const app     = express();
const port    = 3000;
const session = require('express-session');
const util = require('util');
app.use(express.static('public')); 
var session_data;

const conn = mysql.createConnection( {
	host: '10.2.0.20',  /*195.199.230.210:3306 */
	user: 'user',
	port: "3306",
	password: 'Pite137',
	database: 'ITBOLT'
});

app.use(session({ key:'user_sid', secret:'nagyontitkos', resave:true, saveUninitialized:true }));


// console.log(util.inspect(data, false, null, true));


function strE(s) { return s.replace("'","").replace("\"","").replace("`",""),replace("\t","").replace("\\","");}

function gen_SQL(req) {

	const mezők = ["ID_TERMEK", "NEV", "AR", "MENNYISEG", "MEEGYS"];
	var where   =  "";
	var order   = (req.query.order? parseInt(req.query.order)         :   1);
	var limit   = (req.query.limit? parseInt(req.query.limit)         : 100);
	var offset  = (req.query.offset? parseInt(req.query.offset)       :   0);
	var id_kat  = (req.query.kategoria? parseInt(req.query.kategoria) :  -1);
	var név     = (req.query.nev? req.query.nev :  "");
	var desc    =  order < 0 ? "desc" : "";
	
	if (order < 0) { order *= -1; }

	if (id_kat > 0)      { where += `k.ID_KATEGORIA=${id_kat} and `; }
	if (név.length > 0)  { where += `NEV like "${név}%" and `; }
	if (where.length >0) { where  = " where "+where.substring(0, where.length-4);; }

	var sql = `
		SELECT ID_TERMEK, NEV, k.KATEGORIA AS KATEGORIA, AR, MENNYISEG, MEEGYS
		FROM IT_termekek t INNER JOIN IT_kategoriak k 
		ON t.ID_KATEGORIA = k.ID_KATEGORIA ${where} ORDER BY ${mezők[order-1]} ${desc}
		limit ${limit} offset ${limit*offset};
	`;
	return (sql);
}

app.post('/tabla', (req, res) => {  
	var sql = gen_SQL(req);
	Send_to_JSON(req, res, sql);
});

app.post('/reccount', (req, res) => {
	var sql = gen_SQL(req);
	var poz = sql.toUpperCase().lastIndexOf("ORDER BY ");
	var sqlcount = "select count(*) as db from ("+sql.substring(0, poz)+") as tabla;"; 
	Send_to_JSON(req, res, sqlcount);
});

app.post('/kategoria', (req, res) => {
	var sql = "SELECT ID_KATEGORIA, KATEGORIA from IT_kategoriak order by KATEGORIA";
	Send_to_JSON(req, res, sql);
});

app.post('/rekord/:id', (req, res) => {
	var sql = `select * from IT_termekek where ID_TERMEK=${req.params.id}`;
	Send_to_JSON(req, res, sql);
});

app.post('/delete/:id', (req, res) => {
	session_data = req.session;
	if (session_data.NEV) {
		var sql = `delete from IT_termekek where ID_TERMEK=${req.params.id} LIMIT 1;`;
		Send_to_JSON(req, res, sql);
	} else {
		res.set('Content-Type', 'application/json; charset=UTF-8');
		res.send("Bejelentkezés szükséges!");
		res.end();
	}
});


app.post('/login',  (req, res) => { 
	
	var user= (req.query.login_nev? req.query.login_nev: "");
	var psw = (req.query.login_passwd? req.query.login_passwd  : "");
	var sql = `select ID_USER, NEV, EMAIL from userek where EMAIL="${user}" and PASSWORD=md5("${psw}") limit 1;`;
	
	conn.query(sql, (error, results) => {    
		var data = error ? error : JSON.parse(JSON.stringify(results));
		if (!error && data.length == 1)  {
			session_data         = req.session;
			session_data.ID_USER = data[0].ID_USER;
			session_data.EMAIL   = data[0].EMAIL;
			session_data.NEV     = data[0].NEV;
			session_data.MOST    = Date.now();
			console.log("Setting session data:username=%s and id_user=%s", session_data.NEV, session_data.ID_USER);
		}

		res.set('Content-Type', 'application/json; charset=UTF-8');
		res.send(data);
		res.end();
	});
});

app.post('/logout', (req, res) => {  
	session_data = req.session;
	session_data.destroy(function(err) {
		res.json('Session destroyed successfully');
		res.end();
	}); 
});

function Send_to_JSON (req, res, sql) {
	conn.query(sql, (error, results) => {
		var data = error ? error : JSON.parse(JSON.stringify(results));
		res.set('Content-Type', 'application/json; charset=UTF-8');
		res.send(data);
		res.end();
	}); 
}

app.listen(port, function () { console.log(`bs app listening at http://localhost:${port}`); });