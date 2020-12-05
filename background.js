var my = {
	os : "n/a", // mac|win|android|cros|linux|openbsd
	defaultTitle: "Script Menu",
	initialized: null,
	debug: false,
	inPageMenu: false,
	scriptsResource: "",
	scripts: [],
	//====================================================
    init : function(platformInfo) 
	{
		my.initialized = new Promise((resolve, reject)=>{
			try {
				let man = browser.runtime.getManifest();
				if (man.browser_action && man.browser_action.default_title){
					my.defaultTitle = man.browser_action.default_title;
				}
				my.os = platformInfo.os;

				browser.runtime.onMessage.addListener(my.onMessage);
				
				browser.storage.local.get(["inPageMenu", "printDebugInfo", "scriptsResource"])
				.then((pref) => {
					my.updateSettings(pref);
					resolve();
				})
				.catch(err=>{
					reject(err);
				});
			}
			catch(e){
				reject(e.message);
			}
		});
    },
	//====================================================
	updateSettings : function(pref)
	{
		let prevInPageMenu = my.inPageMenu;
		if ((my.inPageMenu = pref.inPageMenu || false) !== prevInPageMenu){
			if (my.inPageMenu){
				let filters = {url: [ {schemes: ["http", "https", "file"]} ]};
				browser.webNavigation.onDOMContentLoaded.addListener(this.onDOMContentLoaded, filters);
			}
			else {
				browser.webNavigation.onDOMContentLoaded.removeListener(this.onDOMContentLoaded);
			}
		}
		my.debug = pref.printDebugInfo || false;
		if (typeof pref.scriptsResource === "string"){
			if (pref.scriptsResource !== my.scriptsResource){
				let res = parseScriptsResource(pref.scriptsResource);
				if (res.error){
					my.scriptsResource = "";
					my.scripts = [];
					my.log("Error" + (res.line > 0 ? " line " + res.line : "") + ": " + res.error);
				}
				else {
					my.scriptsResource = pref.scriptsResource;
					my.scripts = res.scripts;
					my.scripts.forEach(s=>{
						if (s.matches){
							s.matchesRegExp = new RegExp(s.matches.map(pattern=>{
								return "(" + convertMatchPatternToRegExpLiteral(pattern) + ")";
							}).join("|"));
						}
						if (s.excludes){
							s.excludesRegExp = new RegExp(s.excludes.map(pattern=>{
								return "(" + convertMatchPatternToRegExpLiteral(pattern) + ")";
							}).join("|"));
						}
					});
				}
				my.log('Scripts changed');
				browser.tabs.query({url:["http://*/*", "https://*/*", "file://*/*"]})
				.then(tabs=>{
					tabs.forEach(tab=>{
						if (my.debug){ my.log("tabs.sendMessage " + tab.id + ' ' + tab.url); }
						browser.tabs.sendMessage(tab.id, {type: "scriptsChanged", scripts: my.scripts})
						.then(res=>{ if (my.debug){ my.log("tabs.sendMessage "+tab.id+" success"); } })
						.catch(err=>{
							let msg = err.toString();
							if (msg !== "Error: Could not establish connection. Receiving end does not exist."){
								my.log("Error: " + err + " on tabs.sendMessage " + tab.id);
							}
						});
					});
				});
			}
		}
	},
	//====================================================
	log : function(str)
	{
		browser.runtime.sendMessage({type: "log", str: str}).catch(err=>{});
	},
	//====================================================
	onMessage : function(message, sender, sendResponse)
	{
		if (message.type === "getStatus"){
			sendResponse({
				debug: my.debug,
				scriptsResource: my.scriptsResource,
				scripts: my.scripts
			});
		}
		else if (message.type === "getSettings"){
			if (my.initialized){
				my.initialized.then(()=>{
					sendResponse({
						inPageMenu: my.inPageMenu,
						printDebugInfo: my.debug,
						scriptsResource: my.scriptsResource
					});
				})
				.catch(err=>{
					sendResponse({
						error: err,
					});
				});
				return true;
			}
			else {
				sendResponse({
					error: "background.js has not been initialized yet.",
				});
			}
		}
		else if (message.type === "getScripts"){
			sendResponse({
				scripts: my.scripts
			});
		}
		else if (message.type === "updateSettings"){
			my.updateSettings(message.pref);
		}
		else if (message.type === "executeScript"){
			my.executeScript(message.itemIndex);
		}
	},
	//====================================================
	onDOMContentLoaded : function(details)
	{
		let execDetails = {file: "in-page-menu.js"};
		try {
			browser.tabs.executeScript(details.tabId, execDetails)
			.then(value=>{
				if (my.debug){ my.log("# in-page-menu.js executed successfully") }
			})
			.catch(err=>{
				my.log("Error (then-catch): " + err + " on in-page-menu.js");
			});
		}
		catch(err){
			my.log("Error (try-catch): " + err.message + " on in-page-menu.js");
		}
	},
	//====================================================
	executeScript: function (scriptIndex){
		let s = my.scripts[scriptIndex];
		if (my.debug){my.log("# executing [" + s.name + "]");}
		let code = s.js, options = s.options || {}, matches = s.matches || [];
		let details = Object.assign({}, options), showResultInTab;
		if (/^builtin:.+/.test(code.trim())){
			details.file = "builtin/" + code.trim().substring("builtin:".length) + ".js";
			if (my.debug){my.log("# using builtin script: " + details.file);}
			showResultInTab = true;
		}
		else if (/^https?:/.test(code.trim())){
			let src = code.trim().match(/^(https?:\S*)/)[1];
			if (my.debug){my.log("# loading exteranl script using a script tag: " + src);}
			let name = "_" + Math.random().toString().substring(2,10);
			code = '(function(){'
			+ 'let ' + name + ' = document.createElement("script");'
			+ '' + name + '.src="' + src + '";'
			+ 'document.documentElement.appendChild(' + name + '); ' + name + '.remove();'
			+ '})()';
			details.code = code;
		}
		else {
			if (typeof details.wrapCodeInScriptTag !== "undefined"){
				if (details.wrapCodeInScriptTag){
					if (my.debug){my.log("# wraping code in a script tag");}
					let name = "_" + Math.random().toString().substring(2,10);
					code = '(function(){'
					+ 'let ' + name + ' = document.createElement("script");'
					+ '' + name + '.appendChild(document.createTextNode(' + JSON.stringify(code) + '));'
					+ 'document.documentElement.appendChild(' + name + '); ' + name + '.remove();'
					+ '})()';
				}
				if (my.debug){my.log("# deleting details.wrapCodeInScriptTag");}
			}
			details.code = code;
		}
		if (typeof details.wrapCodeInScriptTag !== "undefined"){
			delete details.wrapCodeInScriptTag;
		}
		try {
			browser.tabs.executeScript(details)
			.then(value=>{
				if (my.debug){ my.log("# executed successfully") }
			})
			.catch(err=>{
				my.log("Error (then-catch): " + err);
			});
		}
		catch(err){
			my.log("Error (try-catch): " + err.message);
		}
	}
};

browser.runtime.getPlatformInfo().then(my.init);
