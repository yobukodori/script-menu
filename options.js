function alert(msg){
	const id = "alert";
	let e = document.getElementById(id);
	if(! e){
		e = document.createElement("div");
		e.id = id;
		document.addEventListener("click", ev=> e.remove());
		document.body.appendChild(e);
	}
	let m = document.createElement("div");
	m.classList.add("message");
	msg.split("\n").forEach((line,i) =>{
		if (i > 0){ m.appendChild(document.createElement("br")); }
		let span = document.createElement("span");
		span.appendChild(document.createTextNode(line));
		m.appendChild(span);
	});
	e.appendChild(m);
}

function clearLog()
{
	let log = document.querySelector('#log');
	log.innerHTML = "";
	log.appendChild(document.createElement("span"));
}

function verbose(){
	return document.querySelector('#printDebugInfo').checked;
}

let dummy_log_cleared;

function log(s)
{
	let log = document.querySelector('#log');
	if (! dummy_log_cleared){
		log.innerHTML = "";
		log.appendChild(document.createElement("span"));
		dummy_log_cleared = true;
	}
	if (! (s = s.replace(/\s+$/, ""))){
		return;
	}
	let className = /^error\b/i.test(s) ? "error" : /^warning\b/i.test(s) ? "warning" : "";
	let a = s.split("\n");
	for (let i = a.length - 1 ; i >= 0 ; i--){
		let s = a[i].replace(/\s+$/, "");
		let e = document.createElement("span");
		let col = 0, indent = 0;
		while (s[0] === '\t' || s[0] === ' '){
			indent += s[0] === ' ' ? 1 : col === 0 ? 4 : (4 - col % 4);
			s = s.substring(1);
		}
		e.appendChild(document.createTextNode((indent > 0 ? "\u00A0".repeat(indent) : "") + s));
		e.appendChild(document.createElement("br"));
		if (className){ e.classList.add(className); }
		log.insertBefore(e, log.firstElementChild);
	}
}

function applySettings(fSave)
{
	let scriptsResource = document.querySelector('#scriptsResource').value;
	if (! /\S/.test(scriptsResource)){
		scriptsResource = "";
	}
	let scripts = [];
	if (scriptsResource){
		let res = parseScriptsResource(scriptsResource);
		if (res.error){
			log("error" + (res.line > 0 ? " line " + res.line : "") + ": " + res.error);
			return;
		}
		scripts = res.scripts;
		if (verbose()){
			for (let i = scripts.length - 1 ; i >= 0 ; i--){
				log((i === 0 ? "----------\n" : "") 
					+ "scripts["+i+"] " + scriptToString(scripts[i], 200)
					+ "\n----------");
			};
		}
	}
	let pref = {
		printDebugInfo : document.querySelector('#printDebugInfo').checked,
		scriptsResource : scriptsResource
	};
	if (scripts.length === 0){
		log("warning: All current registered scripts will be removed");
	}
	if (fSave){
		browser.storage.local.set(pref)
		.then(()=>{
			log("Settings and Scripts Resource saved.");
		})
		.catch(e=>{
			alert("Error (storage.local.set): " + e);
		});
	}
	log("Applying settings and" + (scripts.length > 0 ? " " + scripts.length : " removing") +  " scripts.");
	browser.runtime.sendMessage({type:"updateSettings",pref:pref});
}

function onMessage(m, sender, sendResponse)
{
	if (m.type === "log"){
		log(m.str);
	}
}


function getBackgroundStatus()
{
	browser.runtime.sendMessage({type: "getStatus"})
	.then(status=>{
		if (verbose()){
			for (let i = status.scripts.length - 1 ; i >= 0 ; i--){
				let s = status.scripts[i];
				log((i === 0 ? "----------\n" : "") 
					+ (s.error ? "Error " : "") + "scripts[" + i + "]: " 
					+ (s.error ? s.error + '\n' : "") + scriptToString(s)
					+ "\n----------");
			};
		}
		log("debug:" + status.debug + " scripts:" + status.scripts.length);
	})
	.catch (err=>{
		alert("Error on getStatus: " + err);
	});
}

function onDOMContentLoaded(platformInfo){
	let os = platformInfo.os, is_mobile = os === "android", is_pc = ! is_mobile;
	document.querySelector("#scriptsResource").addEventListener('keydown', ev=>{
		if (ev.key == 'Tab') {
			ev.preventDefault();
			let e = ev.target;
			var start = e.selectionStart, end = e.selectionEnd;
			e.value = e.value.substring(0, start) + "\t" + e.value.substring(end);
			e.selectionStart = e.selectionEnd = start + 1;
		}
	});	
	document.querySelector('#save').addEventListener('click', ev=>{
		applySettings(true);
	});
	document.querySelector('#apply').addEventListener('click', ev=>{
		applySettings();
	});
	document.querySelector('#getStatus').addEventListener('click', ev=>{
		getBackgroundStatus();
	});
	document.querySelector('#clearLog').addEventListener('click', ev=>{
		clearLog();
	});

	document.querySelectorAll("body, input, textarea, button, #log").forEach(e=>{
		e.classList.add(is_pc ? "pc" : "mobile");
	});
	document.getElementById("scriptsResource").placeholder = ''
		+ '//name Go top\n'
		+ '//js\n'
		+ '(function(){\n'
		+ '    scrollTo(0, 0);\n'
		+ '})();\n'
		+ '//name Go bottom\n'
		+ '//js\n'
		+ '(function(){\n'
		+ '    scrollTo(0, document.body.scrollHeight);\n'
		+ '})();'
		;

	getBackgroundStatus();
	browser.runtime.sendMessage({type: "getSettings"})
	.then(v=>{
		if (v.initialized){
			document.querySelector('#printDebugInfo').checked = v.printDebugInfo;
			document.querySelector('#scriptsResource').value = v.scriptsResource;
		}
		else {
			alert("Error on getSettings: background is not initialized. See log.");
			browser.runtime.sendMessage({type: "getError"})
			.then(v=>{
				v.error.forEach(e=>{
					log("Error in background: " + e.message + " on " + e.where);
				});
			});
		}
	})
	.catch(err=>{
		alert("Error on getSettings: " + err);
	});
}

browser.runtime.onMessage.addListener(onMessage);
document.addEventListener('DOMContentLoaded', ev=>{
	browser.runtime.getPlatformInfo().then(onDOMContentLoaded);
});
