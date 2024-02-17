/*
 *  Document for AJAX 非同步 AP Server 通訊
 */

var advConfigRoot;
var advConfigCheckScenario = {};
var advConfigModScenario = {};
var advConfigAttrScenario = {};
var advConfigModData = {};
var advConfigErrorMessage;

function advConfigGetSelector(name) {
	// private 取得 jquery 的選擇字串。有 # 在前方就視為 id, 否則視為 name
	var selector;
	if (name.length > 1 && name.substring(0, 1) == "#")
		selector = name;
	else
		selector = "[name='" + name + "']";
	return selector;
}

function advConfigGetNextAcod(jfield) {
	// private 取得欄位的下一個 acod 設定
	// return null 表示此欄位沒有下一個 acod 設定
	var nextElem = jfield.next();
	// radio 跳過 label
	if (jfield[0].tagName == "INPUT" && jfield.attr("type") && jfield.attr("type").toLowerCase() == "radio" && nextElem.length > 0 && nextElem[0].tagName == "LABEL")
		nextElem = nextElem.next();
	// checkbox 跳過 hidden
	if (jfield[0].tagName == "INPUT" && jfield.attr("type") && jfield.attr("type").toLowerCase() == "checkbox" && nextElem.length > 0 && nextElem[0].tagName == "INPUT" &&
		nextElem.attr("type") && nextElem.attr("type").toLowerCase() == "hidden" && "__checkbox_" + jfield.attr("name") == nextElem.attr("name"))
		nextElem = nextElem.next();
	// select 跳過hidden
	if (jfield[0].tagName == "SELECT" && nextElem.length > 0 && nextElem[0].tagName == "INPUT" && nextElem.attr("type") && nextElem.attr("type").toLowerCase() == "hidden" &&
		"__multiselect_" + jfield.attr("name") == nextElem.attr("name"))
		nextElem = nextElem.next();
	if (nextElem.length > 0 && nextElem[0].tagName == "DIV" && nextElem.hasClass("acod"))
		return nextElem;
	return null;
}

function advConfigComposeErrorMessage(fieldDesc, msg) {
	// private 組合錯誤訊息
	var err = "";
	if (msg) {
		if (fieldDesc) {
			err += "欄位(";
			if (fieldDesc instanceof Array) {
				// 奇怪，join 試了不能用
				//err += fieldDesc.join(',');
				for (var i = 0; i < fieldDesc.length; i++) {
					if (i > 0)
						err += ",";
					err += fieldDesc[i];
				}
			}
			else
				err += fieldDesc;
			err += ")";
		}
		err += "錯誤：" + msg;
	}
	return err;
}

function advConfigShowErrorMessage(err, color) {
	// public 將訊息顯示在狀態列
	var stbar = $("#status");
	if (stbar.length == 0)
		stbar = $("#statusMsg");
	if (stbar.length == 0)
		stbar = $("#msg");
	if (stbar.length == 0)
		return;
	stbar.val(err);

	if (color == 1 || color == -1)
		color = "red";
	else
		color = "blue";

	stbar.css("color", color);
	stbar.css("font-weight", "900");
}

function advConfigSetErrorMessage(err) {
	advConfigErrorMessage = err;
}

function advConfigAlertErrorMessage() {
	// public 用 alert dialog 顯示所有的錯誤訊息
	var stdlg = $("#textmsg");
	if (stdlg.length == 0 && $("#statusMsg").length > 0)
		stdlg = $("#window");
	if (stdlg.length > 0) {
		/*
		var errList = advConfigErrorMessage.split(/\n/);
		var errHtml = "";
		for (var i = 0; i < errList.length; i++)
			errHtml += errList[i] + "<br>\n";
		stdlg.html(errHtml);
		*/
		return;
	}
	// 在IE8底下回Alert
	//if (advConfigErrorMessage.length > 0)
	//	alert(advConfigErrorMessage);
}

function advConfigProcErrorMessage(msgList, color) {
	// public 將多個錯誤訊息組合顯示
	var msg1 = "";
	var msg2 = "";
	for (var i = 0; i < msgList.length; i++) {
		msg1 += msgList.length > 1 ? "[" + msgList[i] + "]" : msgList[i];
		msg2 += msgList[i] + "\n";
	}
	advConfigShowErrorMessage(msg1, color);
	advConfigSetErrorMessage(msg2);
	advConfigAlertErrorMessage();
}

function advConfigTransCm3(text) {
	// public 將數值內容加上三位一逗號
	// 先確定是否為數值，不然亂轉會鬧笑話
	if (text.match(/^[\d,]+(\.\d*)?$/)) {
		text = text.replace(/,/g, "");
		var p = text.indexOf('.');
		if (p < 0)
			p = text.length;
		var ntext = "";
		for (var i = 0, j = p % 3; i < p; i = j, j += 3)
			ntext += (i != 0 ? "," : "") + text.substring(i, j);
		if (text.length > p)
			ntext += text.substring(p);
		text = ntext;
	}
	return text;
}
function advConfigStatusOnClick(evt) {
	// private 當訊息列的按鈕被按下時觸發
	advConfigAlertErrorMessage();
}

function advConfigTransText(text, transList) {
	// private 將 text 內容依 transList 規則轉換
	if (text && transList) {
		for (var i = 0; i < transList.length; i++) {
			var type = transList[i][0];
			if (type == "upper")
				text = text.toUpperCase();
			else if (type == "lower")
				text = text.toLowerCase();
			else if (type == "cm3")
				text = advConfigTransCm3(text);
		}
	}
	return text;
}

function advConfigTransBackText(text, transList) {
	// private 將 text 內容依 transList 規則轉換
	if (text && transList) {
		for (var i = 0; i < transList.length; i++) {
			var type = transList[i][0];
			if (type == "cm3") {
				// 將三位一節的數值轉回
				text = text.replace(/,/g, "");
			}
		}
	}
	return text;
}

function advConfigVerifyText(caller, tag, text, condList) {
	// private 將 text 內容依 condList 規則檢查是否有效
	// 檢查過關則 return null，否則傳回錯誤原因
	// caller 為 "blur" 或是 "check"
	if (condList) {
		// 如果條件中有 allowEmpty 則 allowEmpty 設為 true
		var allowEmpty = false;
		for (var i = 0; i < condList.length && !allowEmpty; i++)
			if (condList[i][0] == "allowEmpty")
				allowEmpty = true;
		for (var i = 0; i < condList.length; i++) {
			var cond = condList[i];
			var type = cond[0];

			if (type == "string" && !((caller == "blur" || allowEmpty) && !text)) {
				// 檢查長度
				if (cond[1] && text.length < cond[1])
					return "長度少於" + cond[1] + "字元";
				if (cond[2] && text.length > cond[2])
					return "長度超過" + cond[2] + "字元";
			}
			else if (type == "integer" && !((caller == "blur" || allowEmpty) && !text)) {
			//if (type == "integer" && !((caller == "blur" || allowEmpty) && !text)) {
				// 檢查是否為數值
				var val = parseInt(text.replace(/,/g, ""), 10);
				var ma = text.match(/^[+\\-]?[\d,]+$/);
				if (isNaN(val) || !ma)
					return "非整數格式";
				if (cond[1] && cond[1] != null && val < cond[1])
					return "數值小於" + cond[1];
				if (cond[2] && cond[2] != null && val > cond[2])
					return "數值大於" + cond[2];
			}
			else if (type == "pInteger" && !((caller == "blur" || allowEmpty) && !text)) {
				// 檢查是否為正整數值
				var val = parseInt(text.replace(/,/g, ""), 10);
				var ma = text.match(/^[+\\-]?[\d,]+$/);
				if (isNaN(val) || !ma)
					return "非整數格式";
				if (val < 0)
					return "數值不可為負數";
				if (cond[1] && cond[1] != null && val < cond[1])
					return "數值小於" + cond[1];
				if (cond[2] && cond[2] != null && val > cond[2])
					return "數值大於" + cond[2];
			}
			else if (type == "decimal" && !((caller == "blur" || allowEmpty) && !text)) {
				// 檢查是否為數值
				var val = parseFloat(text.replace(/,/g, ""));
				var ma = text.match(/^[+\-]?[\d,]+(\.\d*)?([eE][+\-]?\d+)?$/);
				if (isNaN(val) || !ma)
					return "非數值格式";
				if (cond[1] && cond[1] != null && val < cond[1])
					return "數值小於" + cond[1];
				if (cond[2] && cond[2] != null && val > cond[2])
					return "數值大於" + cond[2];
			}
			else if (type == "pDecimal" && !((caller == "blur" || allowEmpty) && !text)) {
				// 檢查是否為正小數值
				var val = parseFloat(text.replace(/,/g, ""));
				var ma = text.match(/^[+\-]?[\d,]+(\.\d*)?([eE][+\-]?\d+)?$/);
				if (isNaN(val) || !ma)
					return "非數值格式";
				if (val < 0)
					return "數值不可為負數";
				if (cond[1] && cond[1] != null && val < cond[1])
					return "數值小於" + cond[1];
				if (cond[2] && cond[2] != null && val > cond[2])
					return "數值大於" + cond[2];
			}
			else if (type == "notEmpty" && (tag == "INPUT" || tag == "TEXTAREA" || tag == "SELECT") && !((caller == "blur" || allowEmpty) && !text)) {
				// 不可以為空白
				if (!text)
					return "不可以為空白";
			}
			else if (type == "select" && tag == "SELECT" && !((caller == "blur" || allowEmpty) && !text)) {
				// 不可以選空白項
				if (!text)
					return "必需選擇一項";
			}
			else if (type == "date" && !((caller == "blur" || allowEmpty) && !text)) {
				// 檢查是否為日期格式
				var date = null, time = null;
				var yearS = null, monS = null, dayS = null, hourS = null, minS = null, secS = null;
				var year = 0, mon = 0, day = 0, hour = 0, min = 0, sec = 0;
				var datetime = text.split(/ /);
				if (datetime.length > 2)
					return "不正確的日期時間格式(只能有一個空格)";
				if (datetime.length == 1) {
					// date, time 只有其中一個
					if ((cond[1] || cond[2] || cond[3]) && (cond[4] || cond[5] || cond[6]))
						return "應同時包含日期及時間";
					if (cond[1] || cond[2] || cond[3])
						date = datetime[0];
					else
						time = datetime[0];
				}
				else {
					// date, time 二者具備
					if (!cond[1] && !cond[2] && !cond[3])
						return "不應包含日期";
					if (!cond[4] && !cond[5] && !cond[6])
						return "不應包含時間";
					date = datetime[0];
					time = datetime[1];
				}
				// 檢查日期
				if (date) {
					var dateList = date.split(/-/);
					var ndx = 0;
					var err = null;
					if (cond[1]) {
						if (ndx >= dateList.length)
							return "應包含年份";
						if (err != null)
							err += ",";
						err += "年";
						yearS = dateList[ndx++];
					}
					if (cond[2]) {
						if (ndx >= dateList.length)
							return "應包含月份";
						if (err != null)
							err += ",";
						err += "月";
						monS = dateList[ndx++];
					}
					if (cond[3]) {
						if (ndx >= dateList.length)
							return "應包含日數";
						if (err != null)
							err += ",";
						err += "日";
						dayS = dateList[ndx++];
					}
					if (ndx < dateList.length)
						return "日期部份應只有" + err;
				}
				// 檢查時間
				if (time) {
					var timeList = time.split(/:/);
					var ndx = 0;
					var err = null;
					if (cond[4]) {
						if (ndx >= timeList.length)
							return "應包含時";
						if (err != null)
							err += ",";
						err += "時";
						hourS = timeList[ndx++];
					}
					if (cond[5]) {
						if (ndx >= timeList.length)
							return "應包含分";
						if (err != null)
							err += ",";
						err += "分";
						minS = timeList[ndx++];
					}
					if (cond[6]) {
						if (ndx >= timeList.length)
							return "應包含秒";
						if (err != null)
							err += ",";
						err += "秒";
						secS = timeList[ndx++];
					}
					if (ndx < timeList.length)
						return "時間部份應只有" + err;
				}
				// 檢查年度
				if (yearS) {
					year = parseInt(yearS, 10);
					if (isNaN(year) || !yearS.match(/^\d+$/))
						return "無效的年度";
					if (cond[1] == "y2")
						year += 2000;
					else if (cond[1] == "r3")
						year += 1911;
				}
				// 檢查月份
				if (monS) {
					mon = parseInt(monS, 10);
					if (isNaN(mon) || mon < 1 || mon > 12 || !monS.match(/^\d+$/))
						return "無效的月份";
				}
				// 檢查日數
				if (dayS) {
					var maxday = 31;
					if (mon) {
						// 有指定年月
						var mday = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,   31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
						var ndx = (!year || year % 400 == 0 || (year % 100 != 0 && year % 4 == 0)) ? 11 : -1;
						maxday = mday[ndx + mon];
					}
					day = parseInt(dayS, 10);
					if (isNaN(day) || day < 1 || day > maxday || !dayS.match(/^\d+$/))
						return "無效的日數";
				}
				// 檢查時
				if (hourS) {
					hour = parseInt(hourS, 10);
					if (isNaN(hour) || hour < 0 || hour > 23 || (cond[4] == "hr" && hour > 11) || !hourS.match(/^\d+$/))
						return "無效的時";
				}
				// 檢查分
				if (minS) {
					min = parseInt(minS, 10);
					if (isNaN(min) || min < 0 || min > 59 || !minS.match(/^\d+$/))
						return "無效的分";
				}
				// 檢查秒
				if (secS) {
					sec = parseInt(secS, 10);
					if (isNaN(sec) || sec < 0 || sec > 59 || !secS.match(/^\d+$/))
						return "無效的秒";
				}
			}
		}
	}
	return null;
}

function advConfigHasValue(jfield) {
	// private 判斷欄位是否有內容
	var has = false;
	if (jfield.length > 0 && jfield[0].tagName == "INPUT") {
		var type = jfield.attr("type") ? jfield.attr("type").toLowerCase() : "text";
		if (type == "checkbox")
			has = jfield.prop("checked") ? true : false;
		/*
		else if (type == "hidden")
			// hidden 的內容一律不算（主要是因為 s:checkbox 後面會放一個 hidden）
			has = false;
		*/
		else
			has = jfield.val() && jfield.val().length > 0 ? true : false;
	}
	return has;
}

function advConfigTextOnChange(evt) {
	// private 當 text 欄位異動時觸發
	var jfield = $(evt.target);
	var text = jfield.val();
	var trans = evt.data["tr"];
	if (trans) {
		// 轉換內容
		jfield.val(advConfigTransText(text, trans));
	}
}

function advConfigTextOnFocus(evt) {
	// private 當 text 欄位取得焦點時觸發
	var jfield = $(evt.target);
	var text = jfield.val();
	var trans = evt.data["tr"];
	if (trans) {
		// 轉換內容
		var newtext = advConfigTransBackText(text, trans);
		if (text != newtext)
			jfield.val(newtext);
		var sel = false;
		for (var i = 0; i < trans.length && !sel; i++)
			if (trans[i][0] == "sel")
				sel = true;
		if (sel)
			jfield.select();
	}
}

function advConfigTextOnBlur(evt) {
	// private 當 text 欄位失去 focus 時觸發
	var jfield = $(evt.target);
	var name = jfield.attr("name");
	var text = jfield.val();
	var trans = evt.data["tr"];
	if (trans) {
		// 轉換內容
		text = advConfigTransText(text, trans);
		jfield.val(text);
	}
}

function advConfigTextOnKeyUpDown(evt) {
	// private 當 text 收到按鍵按下或釋放時觸發
	var auto = evt.data["auto"];

	if (!auto)
		return;

	var jcurr = $(auto["curr"]);
	var text = jcurr.val();
	var maxlen = jcurr.attr("maxlength");

	if (evt.type == "keydown") {
		// 當在按下按鍵前，字數是要滿字數減一，則設定符合前置條件
		// auto["cond"] = (text.length == maxlen - 1 || (text.length == 1 && maxlen == 1));\
		if (evt.keyCode == 9)
			auto.cond = false;
		else if (!(auto.cond && text.length == maxlen))
			auto.cond = (text.length == maxlen - 1 || text.length == maxlen);
	}
	else if (evt.type == "keyup") {
		// 當符合前置條件且按鍵後字數為取，則處理跳下一欄
		if (text.length == maxlen && auto.cond) {
			auto.cond = false;
			// 換下一個欄位、由下面統一判斷
			$(auto["next"]).focus();
		}
	}
}

function advConfigParseTransString(line, jfield) {
	// private 針對單一文字述敘分解成陣列
	var result = [];
	var partList = line.split(/;/);
	for (var i = 0; i < partList.length; i++) {
		// 以分號分解成單一條件 part
		var part = partList[i];
		if (part.length == 0)
			continue;
		// 將單一條件拆為 head 及 args 兩部份
		var headArgs = part.match(/(\w+)(\((.+)\))?/);
		if (headArgs) {
			var head = headArgs[1];
			//var args = headArgs[3];
			// 依 head 來解讀條件
			if (head == "upper" || head == "lower" || head == "cm3" || head == "sel") {
				result.push([ head ]);
			}
			if (head == "cm3") {
				// 加入一個 class 以便 advAjax 可以判讀
				jfield.addClass("acodConfigCm3");
				// 改成靠右對齊
				jfield.css("text-align", "right");
			}
		}
	}
	return result;
}

function advConfigParseCondRange(range) {
	// private 將條件參數依範圍格式分解
	if (range) {
		var limit = range.match(/([-\d]+)\.\.([-\d]+)/);
		if (limit) {
			var min = parseInt(limit[1], 10);
			var max = parseInt(limit[2], 10);
			if (!isNaN(min) && !isNaN(max)) {
				return [ null, min, max ];
			}
		}
	}
	return null;
}

function advConfigParseCondValue(range) {
	// private 將條件參數依範圍格式分解
	if (range) {
		var limit = range.match(/([-\d.]+)\.\.([-\d.]+)/);
		if (limit) {
			var min = parseFloat(limit[1]);
			var max = parseFloat(limit[2]);
			if (!isNaN(min) && !isNaN(max)) {
				return [ null, min, max ];
			}
		}
	}
	return null;
}

function advConfigParseCondChars(charCond) {
	// private 將條件參數依允許字元分解
	var result = [ null ];
	if (charCond) {
		var charList = charCond.split(/,/);
		for (var i = 0; i < charList.length; i++) {
			var part = charList[i];
			if (part.length == 0)
				continue;
			if (part == "upper") {
				result.push('A', 'Z');
			}
			else if (part == "lower") {
				result.push('a', 'z');
			}
			else if (part == "alpha") {
				result.push('A', 'Z', 'a', 'z');
			}
			else if (part == "digit") {
				result.push('0', '9');
			}
			else if (part.length == 1) {
				result.push(part, part);
			}
			else {
				var beginEnd = part.match(/(.)..(.)/);
				if (beginEnd) {
					var min = beginEnd[1];
					var max = beginEnd[2];
					result.push(min, max);
				}
			}
		}
	}
	return result;
}

function advConfigParseCondDate(dateCond) {
	// private 將條件參數依日期格式分解
	if (dateCond) {
		if (dateCond == "d")
			return [ null, "y4", "mm", "dd", null, null, null ];
		if (dateCond == "dt2")
			return [ null, "y4", "mm", "dd", "hh", "mm", null ];
		if (dateCond == "dt3")
			return [ null, "y4", "mm", "dd", "hh", "mm", "ss" ];
		if (dateCond == "t2")
			return [ null, null, null, null, "hh", "mm", null ];
		if (dateCond == "t3")
			return [ null, null, null, null, "hh", "mm", "ss" ];
		if (dateCond == "r")
			return [ null, "r3", "mm", "dd", null, null, null ];
		if (dateCond == "rt2")
			return [ null, "r3", "mm", "dd", "hh", "mm", null ];
		if (dateCond == "rt3")
			return [ null, "r3", "mm", "dd", "hh", "mm", "ss" ];
		var part = dateCond.match(/(y4|y2|r3)?(mm)?(dd)?(hh|hr)?(mi)?(ss)?/);
		if (part)
			return [ null, part[1], part[2], part[3], part[4], part[5], part[6] ];
	}
	return null;
}

function advConfigParseCondString(line) {
	// private 針對單一文字述敘條件分解成陣列
	var result = [];
	var partList = line.split(/;/);
	for (var i = 0; i < partList.length; i++) {
		// 以分號分解成單一條件 part
		var part = partList[i];
		if (part.length == 0)
			continue;
		// 將單一條件拆為 head 及 args 兩部份
		var headArgs = part.match(/(\w+)(\((.+)\))?/);
		if (headArgs) {
			var head = headArgs[1];
			var args = headArgs[3];
			// 依 head 來解讀條件
			if (head == "string") {
				var range = advConfigParseCondRange(args);
				if (range) {
					range[0] = head;
					result.push(range);
				}
			}
			if (head == "integer") {
				var range = advConfigParseCondRange(args);
				if (range) {
					range[0] = head;
					result.push(range);
				}
				else {
					result.push([ head, null, null ]);
				}
			}
			if (head == "pInteger") {
				var range = advConfigParseCondRange(args);
				if (range) {
					range[0] = head;
					result.push(range);
				}
				else {
					result.push([ head, null, null ]);
				}
			}
			if (head == "decimal") {
				var value = advConfigParseCondValue(args);
				if (value) {
					value[0] = head;
					result.push(value);
				}
				else {
					result.push([ head, null, null ]);
				}
			}
			if (head == "pDecimal") {
				var value = advConfigParseCondValue(args);
				if (value) {
					value[0] = head;
					result.push(value);
				}
				else {
					result.push([ head, null, null ]);
				}
			}
			else if (head == "date") {
				var date = advConfigParseCondDate(args);
				if (date) {
					date[0] = head;
					result.push(date);
				}
			}
			else if (head == "chars") {
				var range = advConfigParseCondChars(args);
				if (range) {
					range[0] = head;
					result.push(range);
				}
			}
			else if (head == "upper") {
				result.push([ "chars", "A", "Z" ]);
			}
			else if (head == "lower") {
				result.push([ "chars", "a", "z" ]);
			}
			else if (head == "select" || head == "notEmpty" || head == "allowEmpty") {
				result.push([ head ]);
			}
			else if (head == "exone" || head == "minone") {
				result.push([ head, args ]);
			}
		}
	}
	return result;
}

function advConfigBind(jfield, data) {
	// private 依 data 內容 bind 事件處理程式
	if (data["tr"]) {
		// 設定 onchange
		jfield.bind("change", data, advConfigTextOnChange);
		jfield.bind("focus", data, advConfigTextOnFocus);
		jfield.bind("blur", data, advConfigTextOnBlur);
	}
	if (data["jail"]) {
		// 設定 onblur
		jfield.bind("blur", data, advConfigTextOnBlur);
	}
	if (data["auto"]) {
		// 設定滿字自動切換下一欄位
		jfield.bind("keydown", data, advConfigTextOnKeyUpDown);
		jfield.bind("keyup", data, advConfigTextOnKeyUpDown);
	}
}

function advConfigRegisterField(jfield) {
	// private 針對單一文字欄位設定內容查核條件
	var nextElem = advConfigGetNextAcod(jfield);
	if (nextElem) {
		var wholeCond = nextElem.text().split(/\s+/);
		var data = {};
		for (var i = 0; i < wholeCond.length; i++) {
			// 分解出一段條件
			var singleCond = wholeCond[i];
			if (singleCond.length == 0)
				continue;
			// 依條件類別分別塞入個別限制中
			var cond = singleCond.match(/(\w+)(\(([\w,]+)\))?:(.*)/);
			if (cond) {
				var dir = cond[1];
				var scenario = cond[3];
				scenario = scenario ? scenario.split(/,/) : [ "*" ];
				var cmd = cond[4];
				if (dir == "desc") {
					data[dir] = cmd;
				}
				else if (dir == "tr") {
					data[dir] = advConfigParseTransString(cmd, jfield);
				}
				else if (dir == "jail") {
					data[dir] = advConfigParseCondString(cmd);
				}
				else if (dir == "chk") {
					// chk 可以指定集合
					var condList = advConfigParseCondString(cmd);
					for (var j = 0; j < scenario.length; j++) {
						if (!data[dir]) {
							data[dir] = {};
						}
						data[dir][scenario[j]] = condList;
					}
				}
				else if (dir == "mod") {
					// mod 可以指定集合
					data[dir] = cmd ? cmd.split(/[,;]/) : [ "*" ];
				}
				else if (dir == "auto") {
					// 只對 input[dir='text'], input[dir='password'], input[dir='hidden'], textarea 有用
					var tag = jfield[0].tagName;
					var set = false;
					if (tag == "INPUT") {
						var inputType = jfield.attr("type");
						if (!inputType || inputType == "text" || inputType == "password" || inputType == "hidden")
							set = true;
					}
					else if (tag == "TEXTAREA")
						set = true;
					var next = $(advConfigGetSelector(cmd));
					if (set && next.length > 0)
						data[dir] = { "cond": false, "curr": jfield, "next": next[0] };
				}
				else if (dir == "attr") {
					// attr 可以指定集合
					var condList = cmd.split(/;/);
					for (var j = 0; j < scenario.length; j++) {
						if (!data[dir]) {
							data[dir] = {};
						}
						data[dir][scenario[j]] = condList;
					}
				}
			}
		}
		// 設定事件處理程式
		advConfigBind(jfield, data);
		if (data["chk"]) {
			// 設定檢查劇本
			$.each(data["chk"], function(scenario, condList) {
				if (!advConfigCheckScenario[scenario])
					advConfigCheckScenario[scenario] = {};
				var chkList = [];
				for (var i = 0; i < condList.length; i++) {
					var cond = condList[i];
					// exone, minone 要 by group 各自存放，其它都放在 chkList 中
					if (cond[0] == "exone" || cond[0] == "minone") {
						if (!advConfigCheckScenario[scenario][cond[0]])
							advConfigCheckScenario[scenario][cond[0]] = {};
						if (!advConfigCheckScenario[scenario][cond[0]][cond[1]])
							advConfigCheckScenario[scenario][cond[0]][cond[1]] = [];
						advConfigCheckScenario[scenario][cond[0]][cond[1]].push([ jfield[0], data["desc"] ]);
					}
					else
						chkList.push(condList);
				}
				if (chkList.length > 0) {
					if (!advConfigCheckScenario[scenario]["list"])
						advConfigCheckScenario[scenario]["list"] = [];
					// 將資料加作全域變數 advConfigCheckScenario
					advConfigCheckScenario[scenario]["list"].push([ jfield[0], data["desc"], condList ]);
				}
			});
		}
		if (data["mod"]) {
			// 設定內容變更檢查劇本
			var modList = data["mod"];
			for (var i = 0; i < modList.length; i++) {
				var scenario = modList[i];
				if (!advConfigModScenario[scenario])
					advConfigModScenario[scenario] = [];
				advConfigModScenario[scenario].push([ jfield[0], data["desc"] ]);
				if (!advConfigModData[scenario])
					advConfigModData[scenario] = {};
				advConfigModData[scenario][jfield.attr("name")] = null;
			}
		}
		if (data["attr"]) {
			// 設定元件屬性變更的劇本
			$.each(data["attr"], function(scenario, condList) {
				if (!advConfigAttrScenario[scenario])
					advConfigAttrScenario[scenario] = [];
				if (!advConfigCheckScenario[scenario]["list"])
					advConfigCheckScenario[scenario]["list"] = [];
				// 將資料加入全域變數 advConfigCheckScenario
				advConfigAttrScenario[scenario].push([ jfield[0], data["desc"], condList]);
			});
		}
	}
}

function advConfigSplit(str, sep) {
    //以特殊字串作為分解字串的切割點
    //str => 欲進行分解的字串
    //sep => 切割點
	var data = [];
	var s = 0, e;
	while (s >= 0) {
	    //從字串起始判斷切割點於字串中出現的位置
		var e = str.indexOf(sep, s);
		//若切割點於字串中，取出起始點到切割點的字串
		if (e >= 0) {
			data.push(str.substring(s, e));
			s = e + sep.length;
		}
		//若字串中無切割點，直接取出字串
		else {
			data.push(str.substring(s));
			s = -1;
		}
	}
	return data;
}

function advConfigRegister(root) {
	// public 啟動程序
	// root 一般狀況下不用傳值
	if (!root) {
		root = $(document);
		// 初始化
		advConfigCheckScenario = {};
		advConfigModScenario = {};
		advConfigAttrScenario = {};
		advConfigModData = {};
		advConfigErrorMessage = null;
		advConfigShowErrorMessage("");
	}
	advConfigRoot = root;

	$.each(root.find("input,textarea,select"), function(key, field) {
		advConfigRegisterField($(field));
	});

	// 加入狀態列按鈕功能
	root.find("button[name='getStatus']").bind("click", {}, advConfigStatusOnClick);

	advConfigRoot = null;
}

function advConfigPutErrorMessage(errList, alert) {
	// public 顯示多筆錯誤訊息
	// 正確
	advConfigErrorMessage = "";
	if (errList.length == 0) {
		advConfigShowErrorMessage("");
		return null;
	}
	// 有錯誤發生，組合錯誤訊息
	for (var i = 0; i < errList.length; i++) {
		if (i > 0)
			advConfigErrorMessage += "\n";
		advConfigErrorMessage += errList[i];
	}
	if (alert) {
		advConfigShowErrorMessage(errList[0]);
		advConfigAlertErrorMessage();
	}
}

function advConfigCheck(scenario, alert) {
	// public 要求檢查輸入資料是否均符合條件
	// scenario 要檢查的劇本名稱
	// alert 是否要將錯誤列表直接顯示
	// return null 表示通過檢查，return [] 表示錯誤訊息集合

	var errList = [];
	if (!scenario)
		scenario = "*";
	if (!advConfigCheckScenario[scenario])
		return null;
	// 取得指定劇本所有待檢查元件
	var allChecks = advConfigCheckScenario[scenario]["list"];
	if (allChecks) {
		// 如果檢查條件中有 allowEmpty，則允許空白
		for (var i = 0; i < allChecks.length; i++) {
			// 分解檢查條件
			var selector = allChecks[i][0];
			var name = allChecks[i][1];
			var condList = allChecks[i][2];
			var field = $(selector);
			var text = field.val();
			var tag = field[0].tagName;
			// 如果檢查有錯則記錄至 errList
			var err = advConfigVerifyText("check", tag, text, condList);
			if (err)
				errList.push(advConfigComposeErrorMessage(name, err));
		}
	}
	// 恰存在一項檢查
	var exoneCheck = advConfigCheckScenario[scenario]["exone"];
	if (exoneCheck) {
		var cnt = 0;
		var descList = [];
		$.each(exoneCheck, function(group, list) {
			for (var i = 0; i < list.length; i++) {
				if (advConfigHasValue($(list[i][0])))
					cnt++;
				descList.push(list[i][1]);
			}
		});
		if (cnt > 1)
			errList.push(advConfigComposeErrorMessage(descList, "應只設定其中一項"));
		else if (cnt == 0)
			errList.push(advConfigComposeErrorMessage(descList, "必須設定其中一項"));
	}
	// 至少在一項檢查
	var minoneCheck = advConfigCheckScenario[scenario]["minone"];
	if (minoneCheck) {
		var cnt = 0;
		var descList = [];
		$.each(minoneCheck, function(group, list) {
			for (var i = 0; i < list.length; i++) {
				if (advConfigHasValue($(list[i][0])))
					cnt++;
				descList.push(list[i][1]);
			}
		});
		if (cnt == 0)
			errList.push(advConfigComposeErrorMessage(descList, "至少應設定其中一項"));
	}
	// 正確
	advConfigErrorMessage = "";
	if (errList.length == 0) {
		advConfigShowErrorMessage("");
		return null;
	}
	// 有錯誤發生，組合錯誤訊息
	for (var i = 0; i < errList.length; i++) {
		if (i > 0)
			advConfigErrorMessage += "\n";
		advConfigErrorMessage += errList[i];
	}
	if (alert) {
		if ($("#statusMsg").length > 0) {
			var msg = "";
			for (var i = 0; i < errList.length; i++)
				msg += "[" + errList[i] +"]";
			advConfigShowErrorMessage(msg, -1);
			advConfigAlertErrorMessage();
		}
		else {
			advConfigShowErrorMessage(errList[0]);
			advConfigAlertErrorMessage();
		}
	}
	return errList;
}

function advConfigAttr(scenario) {
	// public 將欄位屬性變更
	// scenario 要變更屬性的劇本名稱
	if (!scenario)
		scenario = "*";
	if (!advConfigAttrScenario[scenario])
		return null;
	// 取得指定劇本所有待變更屬性元件
	var allAttrs = advConfigAttrScenario[scenario];
	for (var i = 0; i < allAttrs.length; i++) {
		// 分解變更屬性
		var field = allAttrs[i][0];
		var attrList = allAttrs[i][2];
		jfield = $(field);
		for (var j = 0; j < attrList.length; j++) {
			var attr = attrList[j];
			if (attr == "read") {
				jfield.prop("readonly", true);
				jfield.addClass("read");
			}
			else if (attr == "edit") {
				jfield.removeAttr("readonly");
				jfield.removeClass("read");
			}
			else if (attr == "en") {
				jfield.removeAttr("disabled");
			}
			else if (attr == "dis") {
				jfield.prop("disabled", true);
			}
		}
	}
}

function advConfigModReset(scenario) {
	// public 將目前的欄位內容當作判斷是否變更的依據
	// scenario 變更檢查的劇本名稱
	if (!scenario)
		scenario = "*";
	if (advConfigModScenario[scenario]) {
		// 取得指定劇本所有元件
		var fieldList = advConfigModScenario[scenario];
		var data = advConfigModData[scenario];
		for (var i = 0; i < fieldList.length; i++) {
			var jfield = $(fieldList[i][0]);
			var name = jfield.attr("name");
			var val = jfield.val();
			if (jfield[0].tagName == "INPUT" && jfield.attr("type").toLowerCase() == "checkbox")
				val = jfield.prop("checked") ? "true" : "false";
			if (name)
				data[name] = val;
		}
	}
	// 重置網格元件
	if (window.advGridModReset)
		advGridModReset(scenario);
}

function advConfigModCheck(scenario, alert) {
	// public 要求檢查欄位內容是否有變更
	// scenario 要檢查的劇本名稱
	// alert 是否要將錯誤列表直接顯示
	// return null 表示通過檢查，return [] 表示錯誤訊息集合
	var errList = [];
	if (!scenario)
		scenario = "*";
	if (advConfigModScenario[scenario]) {
		// 取得指定劇本所有元件
		var fieldList = advConfigModScenario[scenario];
		var data = advConfigModData[scenario];
		for (var i = 0; i < fieldList.length; i++) {
			var jfield = $(fieldList[i][0]);
			var name = jfield.attr("name");
			if (!name)
				continue;
			var desc = fieldList[i][1];
			var orgValue = data[name];
			var newValue = jfield.val();
			if (jfield[0].tagName == "INPUT" && jfield.attr("type").toLowerCase() == "checkbox")
				newValue = jfield.prop("checked") ? "true" : "false";
			if (orgValue != newValue) {
				// 資料變更
				var err = "";
				if (desc)
					err += "欄位[" + desc + "] ";
				err += "不允許變更內容，請先執行  查詢";
				errList.push([err,  orgValue, newValue]);
			}
		}
	}
	// 取得變更網格元件
	if (window.advGridModCheck) {
		var descList = advGridModCheck(scenario);
		// 如果有異動則加入錯誤訊息中
		if (descList) {
			for (var i = 0; i < descList.length; i++)
				errList.push( [ "網格[" + descList[i] + "] 不允許變更內容" ]);
		}
	}
	if (alert)
		advConfigPutErrorMessage(errList, alert);
	// 正確
	if (errList.length == 0)
		return null;
	return errList;
}
