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
		msg = (/^error:/i.test(msg) ? "" : "Error: ") + msg;
		e.appendChild(document.createTextNode(msg));
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
	
	if (activeTabs.length === 0){
		error("Could not get the active tab.");
		activeTabs.push({url: ""});
	}
	let tab = activeTabs[0];
	if (! tab.url || /^(https?|file):/.test(tab.url)){
		let url = tab.url;
		if (url){
			try {
				// not work with ftp(s).
				let u = new URL(url);
				url = u.protocol + "//" + u.hostname + u.pathname + u.search;
			} catch(e){}
		}
		browser.runtime.sendMessage({type: "getScripts"})
		.then(res =>{
			if (res.scripts.length > 0){
				res.scripts.forEach((s,i)=>{
					if (url){
						if (s.matchesRegExp && ! url.match(s.matchesRegExp)){ return; }
						if (s.excludesRegExp && url.match(s.excludesRegExp)){ return; }
					}
					let item = document.createElement("div");
					item.index = i;
					item.classList.add("item");
					item.textContent = s.name;
					item.addEventListener("click", ev=>{
						browser.runtime.sendMessage({type: "executeScript", itemIndex: item.index})
						.then(()=>{ setTimeout(window.close, 0); })
						.catch(err => error(err + " on runtime.sendMessage"));
					});
					document.querySelector('#menu').appendChild(item);
				});
			}
			else {
				error("No registered script.");
			}
		})
		.catch(err=>{
			error(err + ' on sendMessage({type: "getScripts"}');
		});
	}
	else {
		error("Not support special tabs.");
	}
}

document.addEventListener('DOMContentLoaded', ev=>{
	browser.runtime.getPlatformInfo()
	.then(platformInfo =>{
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
			onDOMContentLoaded(platformInfo, tabs);
		})
		.catch(err =>{
			error(err + " on tabs.query");
			onDOMContentLoaded(platformInfo, []);
		});
	});
});


