const express = require('express');
const mysql = require('mysql');
const app    = express();
const port   = 3000;
app.use(express.static('public')); 

const conn = mysql.createConnection( {
	host: '10.2.0.20',     /* 'FS2.csany-zeg.local', */
	user: 'user',
	port: "3306",
	password: 'Pite137',
	database: 'ITBOLT'     /* create_it_termekek.sql */
});

function strE(s) { return s.replace("'","").replace("\"","").replace("`","").replace("\t","").replace("\\","");}

function gen_SQL(req) {
	const mezők = [ "ID_TERMEK", "NEV", "AR", "MENNYISEG", "MEEGYS"]; 
	var where = "";
	var order  = (req.query.order? parseInt(req.query.order)         :   1);
	var limit  = (req.query.limit? parseInt(req.query.limit)         : 100);
	var offset = (req.query.offset? parseInt(req.query.offset)       :   0);
	var id_kat = (req.query.kategoria? parseInt(req.query.kategoria) :  -1);
	var név    = (req.query.nev? req.query.nev :  "");
	var desc   = order < 0? "desc" : "";
	if (order < 0) { order *= -1; }

	if (id_kat > 0)      { where += `k.ID_KATEGORIA=${id_kat} and `;   }
	if (név.length > 0)  { where += `NEV like "${név}%" and `;   }
	if (where.length >0) { where = " where "+where.substring(0, where.length-4);; }

	var sql = `
		SELECT ID_TERMEK, NEV, k.KATEGORIA AS KATEGORIA, AR, MENNYISEG, MEEGYS
		FROM IT_termekek t INNER JOIN IT_kategoriak k 
		ON t.ID_KATEGORIA = k.ID_KATEGORIA ${where} ORDER BY ${mezők[order-1]} ${desc}
		limit ${limit} offset ${limit*offset};
	`;
	return (sql);
}

app.get('/tabla',(req, res) => {
	const fejlec  = [ "ID", "Név", "Ár", "Mennyiség", "meegys" ];
	const hossz   = [  10, 60, 10, 10, 10 ]; 

	var s = `<table class="table table-hover" style="cursor: pointer;"><thead><tr>`;
	for (let i = 0; i < fejlec.length ; ++i) {  
	  s += `<th onclick="orderby(${i+1})" style="width:${hossz[i]}%">${fejlec[i]}</th>`;
	}
	s += `</tr></thead><tbody>`;

	var sql = gen_SQL(req);
	conn.query(sql, (err, results) => {
		if(err) throw err;
		for (let i = 0; i < results.length ; ++i) {
			s += `
				<tr class="xsor table-${i%2==0?'primary':'light'}" id="${results[i].ID_TERMEK}">
					<td>${results[i].ID_TERMEK}</td>
					<td>${results[i].NEV}</td>
					<td>${results[i].AR}</td>
					<td>${results[i].MENNYISEG}</td>
					<td>${results[i].MEEGYS}</td>
				<tr>
			`;
		} 
		s += `</tbody></table>`;
		res.set('Content-Type', 'text/html; charset=UTF-8');
		res.end(s);
	}); 
});

app.post('/reccount', (req, res) => {
	var sql = gen_SQL(req);
	var poz = sql.toUpperCase().lastIndexOf("ORDER BY ");
	var sqlcount = "select count(*) as db from ("+sql.substring(0, poz)+") as tabla;"; 
	Send_to_JSON(req, res, sqlcount);
});

app.post('/kategoria', (req, res) => {
	var sql = "select ID_KATEGORIA, KATEGORIA from IT_kategoriak order by KATEGORIA";
	Send_to_JSON(req, res, sql);
});

app.post('/rekord/:id',(req, res) => {
	var sql = `select * from IT_termekek where ID_TERMEK=${req.params.id}`;
	Send_to_JSON(req, res, sql);
});

app.post('/delete/:id',(req, res) => {
	var sql = `delete from IT_termekek where ID_TERMEK=${req.params.id} limit 1;`;
	Send_to_JSON(req, res, sql);
});

app.post('/save/:id',(req, res) => {
	var NEV        = (req.query.mod_nev? strE(req.query.mod_nev) : "");
	var AZON       = (req.query.mod_azon? strE(req.query.mod_azon) : "");   
	var MENNYISEG  = (req.query.mod_db? parseInt(req.query.mod_db) : 0);
	var AR         = (req.query.mod_ar? parseInt(req.query.mod_ar) : 0);
	var ID_KAT     = (req.query.mod_kat? parseInt(req.query.mod_kat) : 0);
	var MEEGYS     = (req.query.mod_meegys? strE(req.query.mod_meegys): "");
	var LEIRAS     = (req.query.mod_leiras? strE(req.query.mod_leiras) : "");
	var sql = "";

	if (req.params.id > 0) {   // módosítás
			sql = `
				update IT_termekek 
				set NEV="${NEV}", ID_KATEGORIA=${ID_KAT}, AZON="${AZON}", MEEGYS="${MEEGYS}", 
				LEIRAS="${LEIRAS}", MENNYISEG=${MENNYISEG}, AR=${AR} 
				where ID_TERMEK=${req.params.id} limit 1;
			`;
	} else {
		sql = `
			insert into IT_termekek (NEV, ID_KATEGORIA, AZON, MEEGYS, LEIRAS, MENNYISEG, AR) 
			values ("${NEV}",${ID_KAT},"${AZON}","${MEEGYS}","${LEIRAS}",${MENNYISEG},${AR});
		`;
	}
	Send_to_JSON(req, res, sql);
});

function Send_to_JSON (req, res, sql) {
  conn.query(sql, (error, results) => {
	var data = error ? error : JSON.parse(JSON.stringify(results));
	console.log(sql);  
	console.log(data); 
	res.set('Content-Type', 'application/json; charset=UTF-8');
	res.send(data);
	res.end();
  }); 
}

app.listen(port, function () { console.log(`bs app listening at http://localhost:${port}`); });