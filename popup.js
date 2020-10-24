let logMsgBuffer = [], errorMsgBuffer = [];

function log(msg){
	if (document.readyState === "loading"){
		logBuffer.push(msg);
		return;
	}
	function output(msg){
		let e = document.createElement("div");
		e.classList.add("log");
		e.appendChild(document.createTextNode(msg));
		document.body.appendChild(e);
	}
	if (logMsgBuffer.length > 0){
		logMsgBuffer.forEach(msg=>{ output(msg) });
		logMsgBuffer = [];
	}
	output(msg);
}

function error(msg){
	if (document.readyState === "loading"){
		errorMsgBuffer.push(msg);
		return;
	}
	function output(msg){
		let e = document.createElement("div");
		e.classList.add("error");
		e.appendChild(document.createTextNode("Error: " + msg));
		document.body.insertBefore(e, document.body.firstElementChild);
	}
	if (errorMsgBuffer.length > 0){
		errorMsgBuffer.forEach(msg=>{ output(msg) });
		errorMsgBuffer = [];
	}
	output(msg);
}

function onDOMContentLoaded(platformInfo, activeTabs){
	let os = platformInfo.os, is_mobile = os === "android", is_pc = ! is_mobile;

	document.querySelector('#settings').addEventListener('click', ev=>{
		if (is_mobile){
			let url = browser.runtime.getURL("options.html");
			browser.tabs.query({})
			.then(tabs=>{
				let found;
				for (let i = 0 ; i < tabs.length ; i++){
					let tab = tabs[i];
					if (tab.url === url){
						found = true;
						browser.tabs.update(tab.id, {active: true})
						.then(tab=>{ window.close(); })
						.catch(err => error(err + " on tabs.update"));
						break;
					}
				}
				if (! found){
					browser.tabs.create({url: url})
					.then(tab=>{ window.close(); })
					.catch(err => error(err + " on tabs.create"));
				}
			})
			.catch(err => error(err + " on tabs.query"));
		}
		else {
			browser.runtime.openOptionsPage()
			.then(()=>{ window.close(); })
			.catch(err => error(err + " on runtime.openOptionsPage"));
		}
	});

	document.querySelectorAll("body, input, textarea, button").forEach(e=>{
		e.classList.add(is_pc ? "pc" : "mobile");
	});
	
	let menu = document.querySelector('#menu');
	if (activeTabs.length > 0){
		let tab = activeTabs[0];
		if (/^(https?|file):/.test(tab.url)){
			let url = tab.url;
			try {
				// not work with ftp(s).
				let u = new URL(url);
				url = u.protocol + "//" + u.hostname + u.pathname + u.search;
			} catch(e){}
			browser.runtime.sendMessage({type: "getScripts"})
			.then(res =>{
				if (res.scripts.length > 0){
					res.scripts.forEach((s,i)=>{
						if (s.matchesRegExp && ! url.match(s.matchesRegExp)){ return; }
						if (s.excludesRegExp && url.match(s.excludesRegExp)){ return; }
						let item = document.createElement("div");
						item.index = i;
						item.classList.add("item");
						item.textContent = s.name;
						item.addEventListener("click", ev=>{
							browser.runtime.sendMessage({type: "executeScript", itemIndex: item.index})
							.then(()=>{ setTimeout(window.close, 0); })
							.catch(err => error(err + " on runtime.sendMessage"));
						});
						menu.appendChild(item);
					});
				}
				else {
					error("No registered script.");
				}
			});
		}
		else {
			error("Not support special tabs.");
		}
	}
	else {
		error("No active tab");
	}
}

browser.tabs.query({active:true, currentWindow:true})
.then(tabs=>{
	browser.runtime.sendMessage({type: "getSettings"})
	.then(res=>{
		if (res.initialized && res.printDebugInfo){
			tabs.forEach((tab,i)=>{
				log("tabs["+i+"] " + JSON.stringify(tab));
			});
		}
	});
	browser.runtime.getPlatformInfo()
	.then(platformInfo =>{
		if (document.readyState === "loading"){
			document.addEventListener('DOMContentLoaded', ev=>{
				onDOMContentLoaded(platformInfo, tabs);
			});
		}
		else {
			onDOMContentLoaded(platformInfo, tabs);
		}
	});
})
.catch(err => error(err + " on tabs.query"));
