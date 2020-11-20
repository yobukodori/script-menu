(function() {
	let man = browser.runtime.getManifest(), 
		appName = man.browser_action.default_title, 
		appVer = "v." + man.version,
		url = document.location.href;
	let appLogPrefix = "["+appName+"]";
	function log(){
		console.log.apply(console,[appLogPrefix].concat(Array.from(arguments)));
	}
	log(appName, appVer,"running on", url);
	let languageResource = {
		"ja": {
			"Error": "エラー",
			"No registered script.": "スクリプトが登録されていません",
			"Error": "エラー",
			"Close": "閉じる",
			"Exit": "終了",
		}
	};
	function t(msg){
		let res = languageResource[navigator.language.split('-')[0]];
		return (res &&  res[msg]) ?  res[msg] : msg;
	}
	function appendStylesheet(rules, id)	{
		let e = document.createElement("style");
		if (id){
			e.id = id;
		}
		e.type = "text/css";
		e.textContent = rules;
		document.getElementsByTagName("head")[0].appendChild(e);
	}
	appendStylesheet('#fmsm-menu-button{border:thin solid; width:32px; height:32px; background-image: url(\'data:image/svg+xml;charset=utf8,<svg width="30" height="30" viewBox="0 0 516 516" xmlns="http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg"><g><rect fill="gold" height="518" width="518" y="-1" x="-1"%2F><%2Fg><g><path d="m85,49l346,0l0,48l-346,0l0,-48z" fill-opacity="null" stroke-opacity="null" stroke-width="0" stroke="%23000" fill="%23000"%2F><path d="m85,138.0l346,0l0,48l-346,0l0,-48z" fill-opacity="null" stroke-opacity="null" stroke-width="0" stroke="%23000" fill="%23000"%2F><path d="m85,227.0l346,0l0,48l-346,0l0,-48z" fill-opacity="null" stroke-opacity="null" stroke-width="0" stroke="%23000" fill="%23000"%2F><text font-weight="bold" xml%3Aspace="preserve" text-anchor="start" font-family="sans-serif" font-size="250" y="486" x="110" stroke-width="0" stroke="%23f00" fill="%23f00">JS<%2Ftext><%2Fg><%2Fsvg>\'); background-color:gold; color:black; font-size:24px; font-family:serif; font-weight:bold; text-align:center; padding:initial; position:fixed; top:100px; right:0px; z-index:2147483647;} #fmsm-menu{display:inline-flex; flex-direction:column; background-color:gainsboro; position:absolute; right:0; z-index:2147483647;} #fmsm-menu > button {font-family:sans-serif; font-size:18px !important; border:thin solid !important; padding:0.3em 0.2em !important; text-align:center !important;} .fmsm-error {color:red; background-color: yellow} .fmsm-warning {background-color:yellow} .fmsm-menu-item-name{font-family:sans-serif; font-size:18px !important;} #fmsm-about{font-size:15px !important}');
	function error(msg){
		let item = document.createElement("button");
		item.classList.add("fmsm-error");
		item.textContent = t('Error') + ': ' + t(msg);
		return item;
	}
	function insertItem(menu, item){
		menu.insertBefore(item, menu.firstElementChild);
	}
	let items = [];
	let menuId = "fmsm-menu";
	function createMenuButton(){
		let btnId = "fmsm-menu-button";
		if (document.getElementById(btnId)){ return; }
		let btn = document.createElement("button");
		btn.id = btnId;
		document.body.appendChild(btn);
		btn.addEventListener("click",ev=>{
			ev.stopPropagation();
			btn.remove();
			let menu = document.createElement("div");
			menu.id = menuId;
			items.forEach((data)=>{
				let s = data.script;
				if (url){
					if (s.matchesRegExp && ! url.match(s.matchesRegExp)){ return; }
					if (s.excludesRegExp && url.match(s.excludesRegExp)){ return; }
				}
				let item = document.createElement("button"),
					name = document.createElement("span");
				item.index = data.index, item.classList.add('fmsm-menu-item');
				name.classList.add("fmsm-menu-item-name"), name.textContent = s.name;
				item.appendChild(name);
				item.addEventListener("click", ev=>{
					ev.stopPropagation();
					browser.runtime.sendMessage({type: "executeScript", itemIndex: item.index})
					.then(()=>{ menu.remove(); createMenuButton(); })
					.catch(err=>{ insertItem(menu, error(err + ' on sendMessage({type:"executeScript"}')) });
				});
				menu.appendChild(item);
			});
			[	{ tag:"button", id:"fmsm-menu-close", text:t('Close') },
				{ tag:"button", id:"fmsm-menu-exit", text:t('Exit'), onclick:function(ev){menu.remove()} },
				{ tag:"div", id:"fmsm-about", text:appName+' '+appVer},
			].forEach(item=>{
				let e = document.createElement(item.tag);
				e.id = item.id;
				e.textContent = item.text;
				if (item.onclick){
					e.addEventListener("click", item.onclick);
				}
				menu.appendChild(e);
			});
			menu.style.top = (window.pageYOffset + 100) + "px";
			document.body.appendChild(menu);
		});
	}
	browser.runtime.sendMessage({type: "getScripts"})
	.then(res =>{
		res.scripts.forEach((s,i)=>{
			if (url){
				if (s.matchesRegExp && ! url.match(s.matchesRegExp)){ return; }
				if (s.excludesRegExp && url.match(s.excludesRegExp)){ return; }
			}
			items.push({index: i, script: s});
		});
		if (items.length > 0){
			createMenuButton();
			document.addEventListener("click", ev=>{
				let menu = document.getElementById(menuId);
				if (menu){
					menu.remove();
					createMenuButton();
				}
			});
		}
	})
	.catch(err=>{
		console.log("Error:", err, 'on sendMessage({type:"getScripts"}');
	});
})();
