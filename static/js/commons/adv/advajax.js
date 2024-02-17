/*
 Document for AJAX 非同步 AP Server 通訊
 */

var advAjaxRequestScenario = {};
var advAjaxResponseScenario = {};

function advAjaxRegisterField(jfield, name, toData, frData, forceScenario) {
	// protect 為單一元件註冊 ajax 處理動作
	if (!name)
		return;
	var nextElem = advConfigGetNextAcod(jfield);
	var data = [ name, jfield[0] ];
	var scenarioDataList = [];
	if (nextElem) {
		var wholeCond = nextElem.text().split(/\s+/);
		for (var i = 0; i < wholeCond.length; i++) {
			// 分解出一段條件
			var singleCond = wholeCond[i];
			if (singleCond.length == 0)
				continue;
			var cond = singleCond.match(/(\w+):(.*)/);
			if (cond) {
				var dir = cond[1];
				var cmd = cond[2];
				if (dir == "to" || dir == "fr" || dir == "bi") {
					// 分解單一劇本
					var cmdList = cmd.split(/;/);
					for (var j = 0; j < cmdList.length; j++) {
						var scenarioData = [ data[0], data[1] ];
						scenarioDataList.push(scenarioData);
						var headArgs = cmdList[j].match(/(\w+)(\(([\w,]+)\))?/);
						// 將單一劇本分解成劇本名稱及屬性
						if (headArgs) {
							// 元件名稱為第一個，選擇子是第二個，後面是屬性
							var scenario = headArgs[1];
							// 如果有指定 forceScenario，則 scenario 一律使用指定值
							if (forceScenario)
								scenario = forceScenario;
							if (headArgs[3]) {
								// 將屬性加入選擇子之後
								var attrs = headArgs[3].split(/,/);
								// 奇怪，試了 concat 不行，只好自己 append
								//scenarioData.concat(attrs);
								// value 要放在最後
								var hasValue = false;
								var n = 2;
								for (var k = 0; k < attrs.length; k++) {
									if (attrs[k] == "value")
										hasValue = true;
									else
										scenarioData[n++] = attrs[k];
								}
								if (hasValue)
									scenarioData[n++] = "value";
							}
							else
								// 沒有屬性時預設為 value 屬性
								scenarioData.push("value");
							// 將分解內容依劇本加入全域變數
							if (dir == "to" || dir == "bi" || forceScenario) {
								if (!toData[scenario])
									toData[scenario] = {};
								toData[scenario][name] = scenarioData;
							}
							if ((dir == "fr" || dir == "bi") && !forceScenario) {
								if (!frData[scenario])
									frData[scenario] = {};
								frData[scenario][name] = scenarioData;
							}
						}
					}
				}
				else if (dir == "tr") {
					// 分解單一 tr 條件
					var cmdList = cmd.split(/;/);
					var tag = jfield[0].tagName;
					for (var j = 0; j < cmdList.length; j++) {
						if (tag == "LABEL" || tag == "DIV" || tag == "SPAN") {
							if (cmdList[j] == "cm3")
								jfield.addClass("acodConfigCm3");
							else if (cmdList[j] == "declno")
								jfield.addClass("acodConfigDeclno");
							else if (cmdList[j] == "feememono")
								jfield.addClass("acodConfigFeememono");
						}
					}
				}
				else if (dir == "bean") {
					// 分解單一 bean 條件
					var cmdList = cmd.split(/;/);
					for (var j = 0; j < cmdList.length; j++) {
						var headArgs = cmdList[j].match(/(\w+)(\((\w+)\))?/);
						// 將單一 bean 條件分解為 head, args
						if (headArgs) {
							var head = headArgs[1];
							// 修改 bean 的變數名稱
							if (head == "name") {
								data[0] = headArgs[3];
								for (k = 0; k < scenarioDataList.length; k++)
									scenarioDataList[k][0] = data[0];
							}
						}
					}
				}
			}
		}
	}
	if (forceScenario && scenarioDataList.length == 0) {
		// 當有 forceScenario 時，一定要加入(因為是由 advGrid 呼叫的)
		data[2] = "value";
		if (!toData[forceScenario])
			toData[forceScenario] = {};
		toData[forceScenario][name] = data;
	}
}

function advAjaxUnregisterField(jfieldList) {
	// protected 如果註冊到不由 advAjax 管理的元件，呼叫此 function 解除
	// 先整理要刪的元件列表成 hash，以提高處理速度
	var jfields = {};
	for (var i = 0; i < jfieldList.length; i++)
		jfields[$(jfieldList[i]).attr("id")] = true;
	$.each(advAjaxRequestScenario, function (key, list) {
		// 倒著找比較方便刪除
		for (var i = list.length - 1; i >= 0; i--)
			if ($(list[i][1]).attr("id") in jfields)
				// 找到就刪掉
				list.splice(i, 1);
	});
	$.each(advAjaxResponseScenario, function (key, list) {
		// 倒著找比較方便刪除
		for (var i = list.length - 1; i >= 0; i--)
			if ($(list[i][1]).attr("id") in jfields)
				// 找到就刪掉
				list.splice(i, 1);
	});
	// Note: Unregister 時刻意不拿掉 acodConfigCm3, acodConfigDeclno, acodConfigFeememono class，
	//       以便未來可以作內容值變更的處理
}

function advAjaxFindRadioList(jfield) {
	// 如果是在 TD 之中, 就優先處理同一 TD 的內容, 否則再依序處理 TR, BODY 中的
	var name = jfield.attr("name");
	var jparent = jfield;
	var jradioList = $(jfield[0]);
	while (jradioList.length <= 1) {
		jparent = jparent.parent();
		var tag = jparent[0].tagName; 
		if (tag == "TD" || tag == "TR" || tag == "BODY")
			jradioList = jparent.find("[name='" + name + "']");
		if (tag == "BODY")
			break;
	}
	return jradioList;
}

function advAjaxGetRequestField(data, name, jfield, item) {
	// protected 取得欄位內容及屬性，置入 data 中
	for (var i = 2; i < item.length; i++) {
		var attr = item[i];
		var dataName = attr == "value" ? name : name + attr.substring(0, 1).toUpperCase() + attr.substring(1);
		
		// 將畫面元件的內容與屬性轉為送出內容
		var tag = jfield[0].tagName;
		var type = tag == "INPUT" ? jfield.attr("type").toLowerCase() : null;
		if (attr == "value") {
			if (tag == "INPUT") {
				if (type == "text" || type == "password" || type == "hidden") 
					data[dataName] = jfield.val();
				else if (type == "radio") {
					/*
					var jradio = jfield.parentsUntil("body");
					jradio = $(jradio[jradio.length - 1]);
					jradio = jradio.find("[name='" + jfield.attr("name") + "']:checked");
					*/
					var jradioList = advAjaxFindRadioList(jfield);
					var value = jradioList.filter(":checked").val();
					if (!value)
						value = "";
					data[dataName] = value;
				}
				else if (type == "checkbox") {
					data[dataName] = jfield.prop("checked") ? true : false;
				}
			}
			else if (tag == "SELECT") {
				data[dataName] = jfield.find("option:selected").length > 0 ? jfield.val() : "";
			}
			else if (tag == "TEXTAREA") {
				data[dataName] = jfield.val();
			}
			else if (tag == "DIV" || tag == "SPAN" || tag == "LABEL") {
				data[dataName] = jfield.text();
			}
			// 如果有設定逗號三位一節的 class
			if (jfield.hasClass("acodConfigCm3"))
				data[dataName] = data[dataName].replace(/,/g, "");
			// 如果有設定報單號碼或繳納証編號的處理
			if (jfield.hasClass("acodConfigDeclno") || jfield.hasClass("acodConfigFeememono"))
				data[dataName] = data[dataName].replace(/\//g, "");
		}
		else if (attr == "read") {
			data[dataName] = jfield.prop("readonly") ? true : false;
		}
		else if (attr == "en") {
			data[dataName] = !jfield.prop("disabled") ? true : false;
		}
		else if (attr == "bgColor") {
			data[dataName] = jfield.css("background-color");
		}
		else if (attr == "selText") {
			if (tag == "SELECT") {
				data[dataName] = jfield.find(":selected").text();
			}
			else if (tag == "INPUT" && type == "checkbox") {
				data[dataName] = jfield.val();
			}
		}
	}
}

function advAjaxSetResponseField(data, name, jfield, item) {
	// protected 取得 data 內容，設定於欄位內容或屬性
	for (var i = 2; i < item.length; i++) {
		var attr = item[i];
		var dataName = attr == "value" ? name : name + attr.substring(0, 1).toUpperCase() + attr.substring(1);
		var value = data[dataName] != null ? data[dataName] : "";
		try {
			// 處理需異動畫面元件的內容與屬性
			var tag = jfield[0].tagName;
			if (attr == "value") {
				if (tag == "INPUT") {
					var type = jfield.attr("type").toLowerCase();
					// 設定 value
					if (type == "radio") {
						// radio 的值用 attribute value 的方式設定
						var jradioList = advAjaxFindRadioList(jfield);
						jradioList.filter("[value='" + value + "']").attr("checked", true);
						/*
						jfield.parentsUntil("body");
						jfield = $(jfield[jfield.length - 1]);
						jfield.find("[name='" + jfield.attr("name") + "'][value='" + value + "']").attr("checked", true);
						*/
					}
					else if (type == "checkbox") {
						// checkbox 的值用 attribute checked 的方式設定
                        //if (value) 20210929 by john
						if (value =="Y")
							jfield.prop("checked", true);
						else
							jfield.removeAttr("checked");
					}
					else {
						// 其它用 val 方式設定
						jfield.val(value);
					}
				}
				else if (tag == "SELECT") {
					jfield.find("[value='" + value + "']").prop("selected", true);
				}
				else if (tag == "TEXTAREA") {
					jfield.val(value);
				}
				else if (tag == "DIV" || tag == "SPAN" || tag == "LABEL") {
					if (jfield.hasClass("acodConfigCm3"))
						value = advConfigTransCm3(value);
					else if (jfield.hasClass("acodConfigDeclno"))
						value = advConfigTransDeclno(value);
					else if (jfield.hasClass("acodConfigFeememono"))
						value = advConfigTransFeememono(value);
					jfield.text(value);
				}
				// 設定欄位內容後，應呼叫 change 轉換內容
				jfield.change();
			}
			else if (attr == "read") {
				// 設定唯讀屬性
				if (value) {
					jfield.attr("readonly", true);
					jfield.addClass("read");
				}
				else {
					jfield.removeAttr("readonly");
					jfield.removeClass("read");
				}
			}
			else if (attr == "bgcolor") {
				// 設定背景顏色
				jfield.css("background-color", value);
			}
			else if (attr == "list") {
				if (tag == "SELECT") {
					var list = data[dataName];
					if (list && list instanceof Array) {
						jfield.empty();
						var options = jfield.prop("options");
						for (var j = 0; j < list.length; j++) {
							var opt = list[j];
							if (typeof(opt) == "object") {
								var key = opt["key"];
								var value = opt["value"];
								options[j] = new Option(value, key);
							}
							else {
								options[j] = new Option(opt, opt);
							}
						}
					}
				}
			}
		}
		catch (e) {
		}
	}
}


function advAjaxRegister(root) {
	// public 啟動程序
	// root 一般狀況下不用傳值
	if (!root) {
		root = $(document);
		advAjaxRequestScenario = {};
		advAjaxResponseScenario = {};
	}
	
	// 為各類元件加入編審條件
	$.each(root.find("input,textarea,select,label"), function(key, field) {
		var jfield = $(field);
		var name = jfield.attr("name");
		advAjaxRegisterField(jfield, name, advAjaxRequestScenario, advAjaxResponseScenario);
	});
}

function advAjaxGetRequest(scenario, data) {
	// public 組合畫面欄位內容作為傳給 ap server 的 request
	// scenario 劇本名稱
	// data 設定回傳的 map 物件，如果沒有設定，會自動新增一個
	// return 回複應傳送給 ap server 的內容
	if (!data)
		data = {};
	if (advAjaxRequestScenario[scenario]) {
		$.each(advAjaxRequestScenario[scenario], function(key, list) {
			var name = list[0];
			var jfield = $(list[1]);
			advAjaxGetRequestField(data, name, jfield, list);
		});
	}
	return data;
}

function advAjaxSetResponse(scenario, datain) {
	// public 將 ap server 回覆的內容，分解後設定至欄位
	// scenario 劇本名稱
	// data 為 ap server 的回覆內容
	
	if (datain["jsonModel"])
		data = datain["jsonModel"];
	else if (datain["model"])
		data = datain["model"];
	else
		data = datain;
	if (data && advAjaxResponseScenario[scenario]) {
		$.each(advAjaxResponseScenario[scenario], function(key, list) {
			var name = list[0];
			var jfield = $(list[1]);
			advAjaxSetResponseField(data, name, jfield, list);
		});
	}
	// 處理 status
	var status = data["status"];
	var statusColor = data["statusColor"];
	if (status && status instanceof Array && status.length >= 1) {
		var color = statusColor && statusColor instanceof Array && statusColor.length >= 1 ? statusColor[0] : null;
		if ($("#statusMsg").length > 0) {
			advConfigProcErrorMessage(status, color);
		}
		else {
			advConfigShowErrorMessage(status[0], color);
			if (status.length > 1) {
				var msg = "";
				for (var i = 0; i < status.length; i++)
					msg += status[i] + "\n";
				advConfigSetErrorMessage(msg);
				advConfigAlertErrorMessage();
			}
		}
	}
}

