// ==UserScript==
// @name	Admin Helper Test
// @namespace	43325ewtwet342225325
// @description	Additional info on admin site pages
// @version	4.0
// @include	*twist*adm*
// ==/UserScript==

//Общие функции

function dateDDMMYY(date) {
	return date.getDate() + '.' + (date.getMonth() + 1) + '.' + date.getFullYear().toString().substr(2, 2);
}

function roundToCents(val) {
//округляет число до .00
	val = val * 100;
	if (val > 0) {val = Math.round(val) / 100}
	if (val < 0) {val = Math.floor(val) / 100}
	return val;
}

function extractDateFromStringDDMMYY(s) {
	return new Date(('20' + s.substr(6, 2)) * 1, s.substr(3, 2) - 1, s.substr(0, 2) * 1);
}

var daysMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var today = document.getElementsByTagName('h5')[0].innerHTML.match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
today = new Date(today[1], today[2] - 1, today[3], today[4], today[5], today[6], 0);
if ((today.getFullYear() % 4 == 0 && today.getFullYear() % 100 != 0) || (today.getFullYear() % 400 == 0)) {daysMonth[1] = 29}
var adminLogin = document.getElementsByTagName('h5')[0].innerHTML.match(/^(.+), <.+$/)[1];

//Функции для профиля игрока

var deps;
var withs;
var wager;
var realToGive;
var operations = [];
var cash;
//var playerStatus; //обычный, Gold, VIP
var transactions;
var bonusOffers;

function getDepsAll() {
//Функция считает сумму сделанных депозитов
	var a = 0;
	var deps = 0;
	var tag = document.getElementsByTagName('*');
	do {a++} while (tag[a].innerHTML != 'System');
	do {
		a++;
		var s = tag[a].innerHTML;
		if (s.length > 0 && s[0] == '+') {deps = deps + parseFloat(s);}
	} while (tag[a].innerHTML != '');
	return roundToCents(deps);	
}

function getWithdrawsAll() {
//Функция считает сумму выплат
	var a = 0;
	var withdraws = 0;
	var tag = document.getElementsByTagName('*');
	do {a = a + 1;} while (tag[a].innerHTML != 'System');
	do {
		a = a + 1;
		var s = tag[a].innerHTML;
		if (s.length > 0 && s[0] == '-') {withdraws = withdraws - parseFloat(s);}
	} while (tag[a].innerHTML != '');
	return roundToCents(withdraws);	
}

function getOperations() {
//Кладет в массив operations операции со счетом из блока "переводы" в профиле игрока
	var tag = document.getElementsByTagName('u');
	var a = 0;
	while (tag[a].innerHTML != 'Wager') {a++}
	tag = tag[a].parentNode.parentNode.parentNode;
	var b = (tag.children.length - 3);
	if (b > 0) {
		b = Math.round(b / 2);
		for (a = 1; a <= b; a++) {
			var one = new Object();
			one.date = extractDateFromStringDDMMYY(tag.children[a * 2 - 1].children[0].innerHTML);
			one.system = tag.children[a * 2 - 1].children[1].innerHTML;
			one.admin = tag.children[a * 2].children[0].innerHTML;
			one.amount = tag.children[a * 2 - 1].children[3].innerHTML * 1;
			operations.push(one);
		}
	}
}

function getXmlHttp(){
	var xmlhttp;
	try {xmlhttp = new ActiveXObject("Msxml2.XMLHTTP")}
	catch (e) {
		try {xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");} 
		catch (E) {xmlhttp = false}
	}
	if (!xmlhttp && typeof XMLHttpRequest != 'undefined') {xmlhttp = new XMLHttpRequest()} 
	return xmlhttp;
}

function getAllTransactions() {
	var tag = document.getElementsByTagName('u');
	var a = 0; while (tag[a].innerHTML != 'ID / Date') {a++}
	tag = tag[a].parentNode.parentNode.parentNode;
	if (tag.children.length > 3) {
		var transUrl = tag.children[1].children[0].children[0].href + '&limit=all'
	} else {
		return -1
	}
	var rec = getXmlHttp();
	rec.open("GET", transUrl, false);
	rec.send(null);
	while (rec.readyState != 4) {}
	var code = rec.responseText;
	if (rec.status != 200 || code.indexOf('Internal Server Error') > -1) {return -1}
	var start = code.indexOf('<table cellspacing=3 cellpadding=1 border=0>');
	var tableOpen = 1;
	var tableClose = 0;
	a = start;
	do {
		a++;
		var s = code.substr(a, 6);
		if (s == '<table') {tableOpen++}
		if (s == '/table') {tableClose++}	
	} while (tableOpen != tableClose);
	a = a + 7;
	code = code.substring(start, a);
	code = code.substr(0, 6) + ' id="transactionsTable" style="display:none"' + code.substr(6); 
	
	document.getElementsByTagName('body')[0].innerHTML = document.getElementsByTagName('body')[0].innerHTML + code;
	
	//Собираем транзакции в массив
	var mas = new Array();
		
	tag = document.getElementById('transactionsTable');
	tag = tag.children[0];
	for (a = 1; a < tag.children.length; a++) {
		if (tag.children[a].children[3].children[0] != undefined) {var bold = true} else {bold = false}
		var temp = tag.children[a].children[0].innerHTML.match(/(\d{2})\.(\d{2})\.(\d{2}).+(\d{2}):(\d{2})/);
		var elem = new Object();
		elem.date = new Date(('20' + temp[3]) * 1, temp[2] - 1, temp[1], temp[4], temp[5], 0, 0);
		elem.status = tag.children[a].children[2].innerHTML;
		if (bold) {
			elem.amount = tag.children[a].children[3].children[0].innerHTML
		} else {
			elem.amount = tag.children[a].children[3].innerHTML
		}
		elem.amount = elem.amount * 1;
		if (elem.status.indexOf('OK') > -1) {mas.push(elem)}
	}
	
	tag = document.getElementById('transactionsTable');
	var tagParent = tag.parentNode;
	tagParent.removeChild(tag);
	return mas
}

function getStartEndDates(offer) {
	var params = offer.match(/^(\d{1,2})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}) до (\d{1,2})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{1,2}).+$/);
	var startDate = new Date(+params[3] + 2000, params[2] - 1, params[1], params[4], params[5]);
	var endDate = new Date(+params[8] + 2000, params[7] - 1, params[6], params[9], params[10]);
	return [startDate, endDate]
}

function updateBonusOffers() {
	document.all.item('bonus_offer').innerHTML = '';
	for (var a in bonusOffers) {document.all.item('bonus_offer').innerHTML += bonusOffers[a] + '\n'}
}

function depositsAmountForOffer(startDate) {
	//Определяет сумму депозитов, сделанных после начала акции, а также после последней выплаты и последнего бонуса от администратора
	if (!transactions) {transactions = getAllTransactions()}
	if (transactions == -1) {return 0}
	//Узнаем количество успешных транзакций, сделанных после начала акции
	var num = 0;
	for (var a in transactions) {
		if (transactions[a].status.indexOf('OK') != -1 && transactions[a].date >= startDate) {num++} else {break}	
	}
	if (num == 0) {return 0}
	//Определяем сумму депозитов
	var numOp = 0;
	var sum = 0;
	for (var b in operations) {
		if (operations[b].admin != '' /* бонус от администратора */ || operations[b].amount < 0 /* выплата */) {break}
		if (operations[b].system == 'Administrator' || operations[b].system.indexOf('Bonus') != -1) {continue}
		sum += operations[b].amount;
		numOp++;
		if (numOp == num) {break}	
	}
	return sum	
}

function createControl1(offer, a) { 
/* 
	Обработка акции "один бонус на следующий депозит"
	пример:
	31-09-12 23:59 до 05-10-12 00:00 [акция] один бонус на след деп, 20%, мин деп 123$, макс бон 100$, вейджер 40
	31-09-12 23:59 до 05-10-12 00:00 [акция] один бонус на след деп, 20%, мин деп 123$, макс бон 100$, вейджер 40; акция окончена
*/
	var dates = getStartEndDates(offer);
	var startDate = dates[0];
	var endDate = dates[1];
	if (endDate < today) {
		if (offer.indexOf('акция окончена') == -1) {
			bonusOffers[a] += '; акция окончена';
			updateBonusOffers();
		} 
		return
	}
	var params = offer.match(/^.+\[акция\] один бонус на след деп, (\d+)\%, мин деп (\d+)\$, макс бон (\d+)\$, вейджер (\d+).*$/);
	var percent = params[1];
	var minDep = params[2];
	var maxBon = params[3];
	var wager = params[4];
	//Определяется сумма депозитов, за которые можно дать бонус по акции
	var deps = depositsAmountForOffer(startDate);
	
	var button = document.createElement('input');
	button.type = 'button';
	button.id = 'control' + a;
	var p = document.createElement('p');
	p.innerHTML = 'Предложение бонуса на следующий депозит: ' + percent + '%, депозит от ' + minDep + '$, максимальный бонус ' + maxBon + '$, вейджер ' + wager + '.<br>У игрока имеются депозиты на сумму: ' + deps + '$.<br>';
	p.appendChild(button);
	document.all.item('bonusPanel').appendChild(p);	
	if (deps >= minDep) {
		var bonusToGive = roundToCents((percent / 100 * deps > maxBon) ? maxBon : (percent / 100 * deps));
		button.value = 'Начислить бонус ' + bonusToGive + '$';
		button.onclick = function() {
			document.all.item('fCash_Bonus_Add').value = +document.all.item('fCash_Bonus_Add').value + bonusToGive;
			document.all.item('fCash_Bonus_Wager').value = wager;
			bonusOffers[a] += '; акция окончена';
			updateBonusOffers();
			document.all.item('Comment').innerHTML = dateDDMMYY(today) + ' - бонус ' + bonusToGive + '$ по акции "один бонус на след деп" - ' + adminLogin + '\n' + document.all.item('Comment').innerHTML;
			alert('Бонус и комемнтарий указаны в соответствующих графах.\nЧтобы начислить бонус и сохранить комментарий, нажмите "Изменить".');
		}
	} else {
		button.value = 'Недостаточно депозитов';
		button.disabled = true	
	}
	if (!document.all.item('fBonus').checked) {
		button.disabled = true;
		button.value = 'Бонус можно начислить только при включенных бонусах!'	
	}
}

function createControl2(offer, a) { 
/* 
	Обработка акции "добавление реала к депозиту"
	пример:
	31-09-12 23:59 до 05-10-12 00:00 [акция] добавление реала к депу, 20%, мин деп 123$
	31-09-12 23:59 до 05-10-12 00:00 [акция] добавление реала к депу, 20%, мин деп 123$; акция окончена
*/
	var dates = getStartEndDates(offer);
	var startDate = dates[0];
	var endDate = dates[1];
	if (endDate < today) {
		if (offer.indexOf('акция окончена') == -1) {
			bonusOffers[a] += '; акция окончена';
			updateBonusOffers();
		}  
		return
	}
	var params = offer.match(/^.+\[акция\] добавление реала к депу, (\d+)\%, мин деп (\d+)\$.*$/);
	var percent = params[1];
	var minDep = params[2];
	//Определяется сумма депозитов, за которые можно дать бонус по акции
	var deps = depositsAmountForOffer(startDate);
	
	var button = document.createElement('input');
	button.type = 'button';
	button.id = 'control' + a;
	var p = document.createElement('p');
	p.innerHTML = 'Предложение добавить реал к депозиту: ' + percent + '%, депозит от ' + minDep + '$.<br>У игрока имеются депозиты на сумму: ' + deps + '$.<br>';
	p.appendChild(button);
	document.all.item('bonusPanel').appendChild(p);
	
	if (deps >= minDep) {
		var realToGive = roundToCents(percent / 100 * deps);
		button.value = 'Начислить реал ' + realToGive + '$';
		button.onclick = function() {
			document.all.item('fCash_Real').value = +document.all.item('fCash_Real').value + realToGive;
			bonusOffers[a] += '; акция окончена';
			updateBonusOffers();
			document.all.item('Comment').innerHTML = dateDDMMYY(today) + ' - реал ' + realToGive + '$ по акции "добавление реала к депу" - ' + adminLogin + '\n' + document.all.item('Comment').innerHTML;
			alert('Реал и комемнтарий внесены в соответствующие графы.\nЧтобы начислить деньги и сохранить комментарий, нажмите "Изменить".');
		}
	} else {
		button.value = 'Недостаточно депозитов';
		button.disabled = true	
	}
}

function winBackHolidayOffer() {
/*
	Акция "Отыграйся" по выходным.
	- Если игрок проиграл более 1$, то на любой депозит, внесенный в выходные, он получает бонус 75% с вейджером 40;
	- Если игрок проиграл более 50$, то на депозит, совершенный в выходные, он получает бонус 100% с вейджером 45;
	- Если игрок проиграл более 100$, то на депозит, совершенный в выходные, он получает бонус 150% с вейджером 50;
	- Бонус начисляется либо сразу после депозита, либо после проигрыша депозита;
	- Бонус не начисляется, если сумма на счете превышает размер последнего депозита более чем на 5$;
	- Акция отменяется до следующих выходных, если игрок выводит выплату;
*/	
	if (today.getDay() != 0 && today.getDay() != 6) {return 0}
	var day1 = new Date(today);
	var day2 = new Date(today);
	while (day1.getDay() != 1) {day1 = new Date(day1 - 1000 * 60 * 60 * 24)}
	while (day2.getDay() != 5) {day2 = new Date(day2 - 1000 * 60 * 60 * 24)}
	day1 = new Date(day1.getFullYear(), day1.getMonth(), day1.getDate(), 0, 0);
	day2 = new Date(day2.getFullYear(), day2.getMonth(), day2.getDate(), 23, 59);
	if (!transactions) {transactions = getAllTransactions()}
	if (transactions == -1) {return 0}
	var deps = 0;
	var withs = 0;
	var withsOnHolidays = false;
	var lastDeposit = 0;
	for (var a in transactions) {
		if (transactions[a].amount > 0 && transactions[a].status.indexOf('OK') != -1 && lastDeposit == 0) {lastDeposit = transactions[a].amount}
		if (transactions[a].date > day2 /* выходные */ && transactions[a].status.indexOf('OK') != -1 && transactions[a].amount < 0) {withsOnHolidays = true}
		if (transactions[a].date < day1 || transactions[a].date > day2) {continue}
		if (transactions[a].status.indexOf('OK') == -1) {continue}
		if (transactions[a].amount > 0) {deps += transactions[a].amount}
		if (transactions[a].amount < 0) {withs += transactions[a].amount}
	}
	var p = document.createElement('p');
	var loss = roundToCents(deps + withs);
	var s = 'Акция "Отыграйся". С понедельника по пятницу, депозиты: ' + roundToCents(deps) + '$, выплаты: ' + roundToCents(withs) + '$. Проиграно: ' + loss + '$.<br>';
	var button = document.createElement('input');
	button.type = 'button';
	if (withsOnHolidays) {
		button.disabled = true;
		button.value = 'В эти выходные были выплаты, акция прекращена для игрока'	
	} else {
	if (loss < 1) {
		button.disabled = true;
		button.value = 'На неделе проиграно недостаточно денег'
	} else {
		var percent = 0.50; 
		var wager = 40;
		if (loss >= 50) {percent = 0.75; wager = 45}
		if (loss >= 100) {percent = 1.00; wager = 50}
		var holidayDeps = depositsAmountForOffer(new Date(+day2+1000*60));
		if (holidayDeps == 0) {
			button.value = 'Недостаточно депозитов';
			button.disabled = true		
		} else {
			var bonusToGive = roundToCents(holidayDeps * percent);
			s += 'Есть депозиты на сумму ' + holidayDeps + '$, и можно дать бонус ' + bonusToGive + '$.<br>';
			button.value = 'Начислить бонус ' + bonusToGive + '$';
			button.onclick = function() {
				document.all.item('fCash_Bonus_Add').value = +document.all.item('fCash_Bonus_Add').value + bonusToGive;
				document.all.item('fCash_Bonus_Wager').value = wager;
				document.all.item('Comment').innerHTML = dateDDMMYY(today) + ' - бонус ' + bonusToGive + '$ по акции "отыграйся" - ' + adminLogin + '\n' + document.all.item('Comment').innerHTML;
				alert('Бонус и комемнтарий указаны в соответствующих графах.\nЧтобы начислить бонус и сохранить комментарий, нажмите "Изменить".');				
			}
			//проверка, включены ли бонусы
			if (!document.all.item('fBonus').checked) {
				button.disabled = true;
				button.value = 'Бонус можно начислить только при включенных бонусах!'	
			}
			//проверка, не слишком ли много денег на счете
			if (cash > lastDeposit + 5) {
				button.disabled = true;
				button.value = 'Бонус по акции "Отыграйся" дается только если на счете не больше чем (сумма последнего депозита + 5$) и если в выходные не было выплат'	
			}			
		}	
	}
	}
	p.innerHTML = s;
	p.appendChild(button);
	document.all.item('bonusPanel').appendChild(p);
}

function processBonusOffers() {
	bonusOffers = document.all.item('bonus_offer').innerHTML.match(/^.+$/gm);
	//Разбираем бонусные предложения
	for (var a in bonusOffers) {
		//Находим соответствие одному из типов бонусных предложений
		if (/акция окончена/.test(bonusOffers[a])) {continue}
		if (/^.+\[акция\] один бонус на след деп.+$/.test(bonusOffers[a])) {createControl1(bonusOffers[a], a)}
		if (/^.+\[акция\] добавление реала к депу.+$/.test(bonusOffers[a])) {createControl2(bonusOffers[a], a)}
	}
	winBackHolidayOffer();
	if (document.all.item('bonusPanel').innerHTML.length == 0) {document.all.item('bonusPanel').innerHTML = 'Сейчас нет активных персональных акций.'} else {
		var p = document.createElement('p');
		p.innerHTML = 'Внимание! На каждый депозит можно активировать только одну акцию, если есть несколько активных. Выберите одну из акций, начислите по ней бонус и сохраните.<br>Учитывается сумма депозитов, сделанных после начала акции, после последней выплаты или после последнего бонуса от администратора (берется позднее).<br>Предупредите игрока о том, что данные бонусы не начисляются автоматически. После совершения депозита нужно зайти в саппорт и попросить начислить бонус по персональной акции.';
		document.all.item('bonusPanel').appendChild(p);	
	}
	return 0;
}

function processPlayerProfile() {
//Добавляет дополнительную информацию о игроке и рекомендации по начислению бонусов	
	try {

	deps = getDepsAll();
	withs = getWithdrawsAll();
	//cash = document.getElementsByName('fCash_Real')[0].parentNode.parentNode.children[2].innerHTML;
	var a = 0; do {a++} while (document.getElementsByTagName('td')[a].innerHTML != 'реальные деньги');
	cash = document.getElementsByTagName('td')[a].parentNode.children[2].innerHTML;
	getOperations();
	//playerStatus = document.getElementsByName('status')[0].options[document.getElementsByName('status')[0].value].innerHTML;
	
	//Вставка дополнительной информации в таблицу 
	var table = document.getElementsByTagName('table')[2];
	var tr = document.createElement('tr');
	var td1 = document.createElement('td');
	var td2 = document.createElement('td');
		
	td1.style.backgroundColor = "#EEBBBB";
	td2.style.backgroundColor = "#EEBBBB";
	td2.style.padding = "5px 5px 5px 5px";
	td2.id = 'additionalinfo';
	tr.appendChild(td1);
	tr.appendChild(td2);
	table.children[1].insertBefore(tr, table.children[1].children[3]);
	
	document.getElementById('additionalinfo').innerHTML = 'Всего депозитов: ' + deps + '; выплат: ' + withs + '; итог: ' + roundToCents(deps - withs);
	
	if (typeof(document.all.item('Comment')) != 'undefined') {
	document.all.item('Comment').parentNode.innerHTML = 'Просьба более новые комменты оставлять на самом верху, перенося остальные на одну строку вниз. Так удобнее, если комментов очень много.<br>' + document.all.item('Comment').parentNode.innerHTML;
	}
	document.all.item('bonus_offer').parentNode.innerHTML = 'Каждое бонусное предложение, добавляемое вручную, располагайте на отдельной строке. Не редактируйте строки с текстом "[акция]" - они редактируются, добавляются и удаляются скриптами.<br>' + document.all.item('bonus_offer').parentNode.innerHTML + '<div id="bonusPanel"></div>';
	
	//обработка персональных акций, если есть
	processBonusOffers()
	
	} catch(e) {
		if (adminLogin != 'Phil') {alert('Произошла ошибка. Сообщите id игрока Кириллу в скайп spaze_shuttle\nКод ошибки:\n' + e.message)}
	}
}

/*

//Функции для страницы транзакций

function processTransactions() {
//функция ищет непроходящие транзакции и выводит их в отдельный блок
	var trn = new Array();
	var details = new Array();
	var table = document.getElementsByTagName('tbody')[6];
	var a = 1;
	//вносим в массив все транзакции на странице
	while (table.children[a] != undefined) {
		var project = table.children[a].children[3].innerHTML;
		var login = table.children[a].children[4].innerHTML;
		var system = table.children[a].children[6].innerHTML;
		var status = table.children[a].children[7].innerHTML
		details.push(project, login, system, status);
		trn.push(details);
		details = Array();
		a++;
	};
	//для каждого игрока собираем его попытки транзакций со всеми статусами кроме ADM
	var player = new Array(); //player[x][0] - логин игрока, player[x][1] - строка с попытками транзакций
	for (a = 0; a < trn.length; a++) {
		for (var b = 0; b < player.length; b++) {if (player[b][0] == trn[a][1]) {break}}
		if (trn[a][3] == '&nbsp;OK' || trn[a][3] == '&nbsp;ADM') {var color = 'grey'} else {var color = 'red'}
		var s = trn[a][2] + ' (<font color="' + color + '">' + trn[a][3] + ' </font>) ';
		if (player[b] == undefined || player[b][0] != trn[a][1]) {player.push([trn[a][1], s])} 
			else {player[b][1] = player[b][1] + s}
	}
	//выводим игроков, у которых совсем нет успешных транзакций
	s = 'Игроки, у которых на этой странице нет ни одной успешной транзакции:<br><br>';
	b = 0;
	for (a = 0; a < player.length; a++) {
		if (player[a][1].indexOf('&nbsp;OK') == -1 && (player[a][1].indexOf('&nbsp;ERROR') != -1 || player[a][1].indexOf('&nbsp;WAIT') != -1)) {
			s = s + player[a][0] + ' :: ' + player[a][1] + '<br>';
			b++;
		}	
	}
	if (b > 0) {document.getElementById('additionalInfo').innerHTML = s}
}

function addTagForInfo() {
	//Вставка дополнительной таблицы для информации
	var form = document.getElementsByTagName('form')[0];
	var table = document.createElement('table');
	var tr = document.createElement('tr');
	var td = document.createElement('td');
		
	table.style.backgroundColor = 'black';
	table.cellPadding = '1px';
	table.cellSpacing = '1px';
	table.style.width = '100%';
	table.style.margin = '0px 0px 5px 0px';
	
	td.style.padding = '5px 5px 5px 6px';
	td.style.backgroundColor = '#EEBBBB';
	td.id = 'additionalInfo';

	tr.appendChild(td);
	table.appendChild(tr);
	
	form.insertBefore(table, form.children[7]);

	processTransactions();
}

//Функции для работы на странице истории игр

function findLeapsOfCash() {
    var tag = document.getElementsByTagName('tr');
    for (var a = 0; tag[a].children[0].children[0].innerHTML !== 'ID'; a++) {}
    tag = tag[a].parentNode;
    
    for (a = tag.children.length - 1; a > 1; a--) {
        var cashBefore = parseFloat(tag.children[a].children[7].innerHTML);
        var bet = parseFloat(tag.children[a - 1].children[4].innerHTML);
        var win = parseFloat(tag.children[a - 1].children[5].innerHTML);
        var cashAfter = parseFloat(tag.children[a - 1].children[7].innerHTML);
        
        if (Math.abs(cashBefore - bet + win - cashAfter) > 0.001) {
            tag.children[a - 1].children[12].innerHTML = tag.children[a - 1].children[12].innerHTML + '<br><br><font color="red"><b>Между этим раундом и предыдущим <br>изменилась сумма на счете</b></font>';
        }
    }
}

*/

//Функции для работы на странице общей статистики

function addPrognosis() {
//прогноз показывается только у незавершенного месяца - для этого дата во второй строке должна быть без слова "del"
	var a = 0;
	var tag = document.getElementsByTagName('tr');
	do {a = a + 1;} while (tag[a].children[1] == undefined ||
						   tag[a].children[1].innerHTML != 'Посещаемость');
	tag = tag[a].parentNode; //tag = tbody нужной таблицы
	var s = tag.children[3].children[0].innerHTML;
	if (s.indexOf("<b>") > 0) return;
	//Добавляем строку в таблицу
	
	var newTR = document.createElement('tr');
	for (a = 0; a < 15; a++) {
		var newTD = document.createElement('td');
		newTD.style.backgroundColor = '#EEBBBB';
		newTD.style.color = 'Grey';
		newTR.appendChild(newTD);
	}
	tag.insertBefore(newTR, tag.children[2]);

	//Заполняем данными
	tag.children[2].children[0].innerHTML = '<center><b>Прогноз</b></center>';

	b = tag.children[4].children[0].innerHTML.substring(8, 10) * 1;
	if (isNaN(b)) {b = tag.children[4].children[0].children[0].innerHTML.substring(8, 10) * 1};
	var month = tag.children[4].children[0].innerHTML.substring(5, 7) * 1;
	if (isNaN(month)) {month = tag.children[4].children[0].children[0].innerHTML.substring(5, 7) * 1}
	for (var c = 0; c < 14; c++) {
		if (c != 4 && c != 5 && c != 12) {var x = parseFloat(tag.children[3].children[1 + c].children[0].innerHTML);}
		if (c == 5) {var s = tag.children[3].children[1 + c].children[0].innerHTML;
					 s = s.substring(s.indexOf("-->")+3, s.indexOf("</a>")-4);
					 x = parseFloat(s);}
		if (c == 4 || c == 12) {x = parseFloat(tag.children[3].children[1 + c].children[0].children[0].innerHTML);}	
		
		//alert(x + ' and tag = ' + tag.children[3].children[1 + c].children[0].children[0].innerHTML);
		x = x / b * daysMonth[month - 1];
		if (c != 6 && c != 8 && c!= 11) {tag.children[2].children[c + 1].innerHTML = Math.round(x);}
			else {tag.children[2].children[c + 1].innerHTML = roundToCents(x);}
	}
	for (a = 1; a < 15; a++) {tag.children[2].children[a].style.textAlign = 'right';}
	
	tag.children[2].children[14].style.textAlign = 'center';
	tag.children[2].children[13].style.textAlign = 'center';
	tag.children[2].children[6].style.textAlign = 'center';
	tag.children[2].children[5].style.textAlign = 'center';
	tag.children[2].children[4].style.textAlign = 'center';
	tag.children[2].children[3].style.textAlign = 'center';
	
	tag.children[2].children[7].innerHTML = '+' + tag.children[2].children[7].innerHTML;
	tag.children[2].children[12].innerHTML = '+' + tag.children[2].children[12].innerHTML;
}

/*

//Функции для страницы описания раунда в рулетке

function paintCells() {
	var numbers = new Array(37);
	for (var a = 0; a < 37; a++) {numbers[a] = 0}
	
	var bets = '"s0"0"s1"1"s2"2"s3"3"s4"4"s5"5"s6"6"s7"7"s8"8"s9"9"s10"10"s11"11"s12"12"s13"13"s14"14"s15"15"s16"16"s17"17"s18"1"s19"19"s20"20"s21"21"s22"22"s23"23"s24"24"s25"25"s26"26"s27"27"s28"28"s29"29"s30"30"s31"31"s32"32"s33"33"s34"34"s35"35"s36"36"p1"0,1"p2"0,2"p3"0,3"p4"1,4"p5"2,5"p6"3,6"p7"4,7"p8"5,8"p9"6,9"p10"7,10"p11"8,11"p12"9,12"p13"10,13"p14"11,14"p15"12,15"p16"13,16"p17"14,17"p18"15,18"p19"16,19"p20"17,20"p21"18,21"p22"19,22"p23"20,23"p24"21,24"p25"22,25"p26"23,26"p27"4,27"p28"25,28"p29"26,29"p30"27,30"p31"28,31"p32"29,32"p33"30,33"p34"31,34"p35"32,35"p36"33,36"p37"1,2"p38"2,3"p39"4,5"p40"56"p41"7,8"p42"8,9"p43"10,11"p44"11,12"p45"13,14"p46"14,15"p47"16,17"p48"17,18"p49"19,20"p50"20,21"p51"22,23"p52"23,24"p53"2526"p54"26,27"p55"28,29"p56"29,30"p57"31,32"p58"32,33"p59"34,35"p60"35,36"t1"0,1,2"t2"0,2,3"t3"1,2,3"t4"4,5,6"t5"7,8,9"t6"10,1,12"t7"13,14,15"t8"16,17,18"t9"19,20,21"t10"22,23,24"t11"25,26,27"t12"28,29,30"t13"31,32,33"t14"34,35,36"n0"0,1,2,3"n1"1,2,4,5"n"2,3,5,6"n3"4,5,7,8"n4"5,6,8,9"n5"7,8,10,11"n6"8,9,11,12"n7"10,11,13,14"n8"11,12,14,15"n9"13,14,16,17"n10"14,15,17,18"n11"16,17,19,0"n12"17,18,20,21"n13"19,20,22,23"n14"20,21,23,24"n15"22,23,25,26"n16"23,24,26,27"n17"25,26,28,29"n18"26,27,29,30"n19"28,29,31,32"n20"29,30,32,33"n21"31,32,34,35"n22"32,33,35,36"x1"1,2,3,4,5,6"x2"4,5,6,7,8,9"x3"7,8,9,10,11,12"x4"10,11,12,13,14,15"x5"13,14,15,16,17,18"x6"16,17,18,19,20,21"x7"19,20,21,22,23,24"x8"22,23,24,25,26,27"x9"25,26,27,28,29,30"x10"28,29,30,31,32,33"x11"31,32,33,34,35,36"d1"1,2,3,4,5,6,7,8,9,10,11,12"d2"13,14,15,16,17,18,19,20,21,22,23,24"d3"25,26,27,28,29,30,31,32,33,34,35,36"c1"1,4,7,10,13,16,19,22,25,28,31,34"c2"2,5,8,11,14,17,20,23,26,29,32,35"c3"3,6,9,12,15,18,21,24,27,30,33,36"e"2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36"o"1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35"k"2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35"r"1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36"b"1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18"m"19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36"';
	
	var s = document.getElementsByTagName('tbody')[2].children[7].children[1].innerHTML;
	s = s.slice(0, s.indexOf('<hr>'));
	
	for (a = 0; s.indexOf('bet id="') > 0; a = s.indexOf('bet id="')) {
		
	a = s.indexOf('bet id="');
	var b = a + 8;
	for (var c = b + 1; s[c] != '"'; c++) {}
	var bet = s.substr(b, c - b);
	b = bets.indexOf(bet);
	if (b > -1) {
		for (b = b; bets[b] != '"'; b++) {}
		for (var d = b + 1; bets[d] != '"'; d++) {}
		var st = ',' + bets.substr(b + 1, d - b - 1) + ',';
		
		//alert(st);
		for (var e = 0; e < 37; e++) {
			if (st.indexOf(',' + e + ',') > -1) {numbers[e] = numbers[e] + 1}
		}
	}
	s = s.slice(c);
	
	}
	
	//alert(numbers);
	
	var hex = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
	var max = 0;
	for (a = 0; a < 37; a++) {if (numbers[a] > max) {max = numbers[a]}}
	for (a = 0; a < 37; a++) {numbers[a] = Math.round((numbers[a] / max) * 200)}
	
	for (a = 0; a < 37; a++) {
		var id = a + '';
		var tag = document.getElementById(id);
		c = 0;
		for (b = 0; b < 16; b++) {
			for (c = 0; c < 16; c++) {
				if (b * 16 + c == numbers[a]) {d = b; e = c;}
			}
		}
		s = '#' + hex[d] + hex[e] + hex[d] + hex[e] + hex[d] + hex[e];
		tag.style.backgroundColor = s;
		
		if (numbers[a] != 0) {tag.style.color = 'red'}
	}
}

function addRoulettePic() {
	var tag = document.getElementsByTagName('tbody')[2];
	tag.children[7].children[0].innerHTML = '<table border="1" cellspacing="0" cellpadding="0"><tr><td width="70" height="30" align="center"></td><td width="70" height="30" id="0" align="center">0</td><td width="70" height="30" align="center"></td></tr><tr><td width="70" height="30" id="1" align="center">1</td><td width="70" height="30" id="2" align="center">2</td><td width="70" height="30" id="3" align="center">3</td></tr><tr><td width="70" height="30" id="4" align="center">4</td><td width="70" height="30" id="5" align="center">5</td><td width="70" height="30" id="6" align="center">6</td></tr><tr><td width="70" height="30" id="7" align="center">7</td><td width="70" height="30" id="8" align="center">8</td><td width="70" height="30" id="9" align="center">9</td></tr><tr><td width="70" height="30" id="10" align="center">10</td><td width="70" height="30" id="11" align="center">11</td><td width="70" height="30" id="12" align="center">12</td></tr><tr><td width="70" height="30" id="13" align="center">13</td><td width="70" height="30" id="14" align="center">14</td><td width="70" height="30" id="15" align="center">15</td></tr><tr><td width="70" height="30" id="16" align="center">16</td><td width="70" height="30" id="17" align="center">17</td><td width="70" height="30" id="18" align="center">18</td></tr><tr><td width="70" height="30" id="19" align="center">19</td><td width="70" height="30" id="20" align="center">20</td><td width="70" height="30" id="21" align="center">21</td></tr><tr><td width="70" height="30" id="22" align="center">22</td><td width="70" height="30" id="23" align="center">23</td><td width="70" height="30" id="24" align="center">24</td></tr><tr><td width="70" height="30" id="25" align="center">25</td><td width="70" height="30" id="26" align="center">26</td><td width="70" height="30" id="27" align="center">27</td></tr><tr><td width="70" height="30" id="28" align="center">28</td><td width="70" height="30" id="29" align="center">29</td><td width="70" height="30" id="30" align="center">30</td></tr><tr><td width="70" height="30" id="31" align="center">31</td><td width="70" height="30" id="32" align="center">32</td><td width="70" height="30" id="33" align="center">33</td></tr><tr><td width="70" height="30" id="34" align="center">34</td><td width="70" height="30" id="35" align="center">35</td><td width="70" height="30" id="36" align="center">36</td></tr></table>';
	
	setTimeout(paintCells, 1000);
}

//Функции для сбора данных со всех страниц на первой странице

var currentPage = 1;
var lastPage = 0;
var urlPart1 = '';
var urlPart2 = '';
var get
var contentTable

function scanPage(page) {
	var url = urlPart1 + page + urlPart2;
	get.open("GET", url, false);
	get.send(null);
	while (get.readyState != 4) {}
	var code = get.responseText;
	if (get.status != 200 || code.indexOf('Internal Server Error') > -1) {alert('Одна из страниц не загрузилась!'); return 0}
	var a = code.indexOf('Страницы:');
	while (code.substr(a, 6) != '<table') {a++}
	while (code.substr(a, 5) != '</tr>') {a++}
	a = a + 5;
	var b = a;
	while (code.substr(b+1, 8) != '</table>') {b++}
	contentTable.innerHTML = contentTable.innerHTML + code.substring(a, b);
	for (a = 0; a < document.links.length; a++) {if (document.links[a].innerHTML == '[' + page + ']') {document.links[a].innerHTML = '[готого]'}}
	if (page != lastPage) {setTimeout("scanPage(" + (page + 1) + ");", 100)} else {document.getElementById('scanpages').disabled = 'disabled'}
}

function scanPages() {
	get = getXmlHttp();
	scanPage(2);
}

function addPagesScanner() {
	var s = document.documentElement.innerHTML;
	//if (s.indexOf("mazart") == -1) {return 0}
	var pages = document.links;
	lastPage = 0;
	for (var a = 0; a < pages.length; a++) {
		s = pages[a].href;
		if (s.indexOf("Page=") != -1) {
			s = pages[a].innerHTML; 
			if (s[0] == '[') {lastPage = s.substring(1, s.length - 1) * 1; var lastLinkNum = a}
		}
	}
	var tag = document.getElementsByTagName("small");
	a = 0; while (tag[a].innerHTML.indexOf('Страницы:') == -1) {a++}
	tag = tag[a].parentNode;
	tag.id = 'tdContainingPagesLinks';

	if (lastPage == 0) {return 0}
	if (lastPage > 200) {return 0}
	s = pages[lastLinkNum].href;
	urlPart1 = s.substring(0, s.indexOf('Page=') + 5);
	a = s.indexOf('Page=') + 5; while (s[a] != '&' && a != s.length - 1) {a++}
	urlPart2 = (a != s.length - 1) ? s.substring(a) : '';

	tag.innerHTML = tag.innerHTML + '<br><br><input type="button" value=" Показать все на одной " id="scanpages" onclick="scanPages()"> (Сделайте показ по 100 элементов на странице. Не нажимайте на кнопку, если в выдаче очень много страниц)';
	while (tag.tagName != 'TABLE') {tag = tag.parentNode}
	contentTable = tag.nextElementSibling.children[0];
}

//Сколько купонов активировал каждый игрок?

function countCoupons() {
	if (document.getElementById('scanpages') != undefined && !document.getElementById('scanpages').disabled) {alert('Сначала нажмите на кнопку "Показать все страницы на одной"'); return 0}
	var tag = document.getElementById("tdContainingPagesLinks");
	tag = tag.parentNode.parentNode.parentNode.nextElementSibling.children[0];
	if (tag.children.length > 1) {
		for (var a = 1; a < tag.children.length; a++) {
			var number = 0;
			var player = tag.children[a].children[2].children[0].innerHTML;
			for (var b = 1; b < tag.children.length; b++) {if (tag.children[b].children[2].children[0].innerHTML == player) {number++}}
			tag.children[a].children[2].innerHTML += ', активирован раз: ' + number;
		}
	}
	document.getElementById("countCouponsButton").disabled = 'disabled';
}

function addNumberOfActivatedCoupons() {
	var tag = document.getElementById("tdContainingPagesLinks");
	tag.innerHTML += '<br><input type="button" id="countCouponsButton" value="Сколько купонов на этой странице у каждого игрока?" onclick="countCoupons()">';
}

*/

//Выбор действий

function processPage() {
//определяет раздел админки и вызывает соответствующую функцию
	var s = document.documentElement.innerHTML;
	if (s.indexOf("информация о пользователе") > -1) {processPlayerProfile()}
/*
	if (s.indexOf("список транзакций") > -1) {addTagForInfo()}
    if (s.indexOf("список игровых туров:") > -1 && document.getElementsByName('UsersID')[0].value != '') {findLeapsOfCash()}
*/
	if (s.indexOf("общая информация о работе казино") > -1) {addPrognosis()}
/*
	if ((s.indexOf("roulette:") > -1 || s.indexOf("french_roulette_track:") > -1) && s.indexOf("Номер игры") > -1) {addRoulettePic()}
	if (s.indexOf("Страницы:") > -1) {addPagesScanner()}
	if (s.indexOf("Список выданных купонов:") > -1) {addNumberOfActivatedCoupons()} 
*/
}

processPage();